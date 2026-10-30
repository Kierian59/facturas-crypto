import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { generateObject, type ModelMessage } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { EXPENSE_CATEGORIES } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Modèle vision + PDF natif via Vercel AI Gateway (surchargeable par AI_GATEWAY_MODEL). */
const MODEL = process.env.AI_GATEWAY_MODEL || "google/gemini-2.5-flash";

const schema = z.object({
  fecha: z.string().nullable().describe("Fecha de expedición de la factura, formato YYYY-MM-DD. null si no aparece."),
  proveedor: z.string().nullable().describe("Razón social o nombre del emisor (proveedor). null si no aparece."),
  nifProveedor: z.string().nullable().describe("NIF/CIF/VAT del emisor, tal cual. null si no aparece."),
  numeroFactura: z.string().nullable().describe("Número de factura. null si no aparece."),
  concepto: z.string().nullable().describe("Descripción breve del bien o servicio (máx. 80 caracteres)."),
  categoria: z.enum(EXPENSE_CATEGORIES).nullable().describe(
    "software=SaaS/suscripciones; equipos=ordenadores/hardware; telefono=internet/móvil; cuota_autonomo=Seguridad Social/RETA; gestoria=asesoría; publicidad; formacion; comisiones=bancos/exchanges; suministros=luz/agua/gas; viajes; otros. null si dudoso.",
  ),
  base: z.number().nullable().describe("Base imponible en EUR (sin IVA). null si no aparece."),
  tipoIva: z.enum(["21", "10", "4", "0", "exento"]).nullable().describe("Tipo de IVA aplicado. null si no aparece."),
  cuotaIva: z.number().nullable().describe("Cuota de IVA en EUR. null si no aparece."),
  total: z.number().nullable().describe("Total factura en EUR. null si no aparece."),
  moneda: z.string().nullable().describe("Moneda ISO de los importes (EUR, USD…)."),
});
export type ExtractedExpense = z.infer<typeof schema>;

const SYSTEM =
  "Extraes datos de una factura recibida (gasto de un autónomo en España). Devuelve SOLO lo que está escrito en el documento. " +
  "Nunca inventes ni deduzcas: si un campo no aparece claramente, devuelve null. Importes como números con punto decimal.";

function clean(x: ExtractedExpense) {
  const out: Partial<Record<keyof ExtractedExpense, unknown>> = {};
  const str = (v: string | null, max = 120) => (v && v.trim() ? v.trim().slice(0, max) : null);
  const num = (v: number | null) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 100) / 100 : null);
  out.fecha = x.fecha && /^\d{4}-\d{2}-\d{2}$/.test(x.fecha) && !Number.isNaN(Date.parse(x.fecha)) ? x.fecha : null;
  out.proveedor = str(x.proveedor);
  out.nifProveedor = str(x.nifProveedor, 30);
  out.numeroFactura = str(x.numeroFactura, 60);
  out.concepto = str(x.concepto, 120);
  out.categoria = x.categoria ?? null;
  out.tipoIva = x.tipoIva ?? null;
  let base = num(x.base), cuota = num(x.cuotaIva), total = num(x.total);
  const warnings: string[] = [];
  if (x.moneda && x.moneda.toUpperCase() !== "EUR") {
    warnings.push("currency");
    base = cuota = total = null; // montants non EUR : à convertir à la main
  }
  if (base != null && cuota != null && total != null && Math.abs(base + cuota - total) > Math.max(0.05, total * 0.01)) {
    warnings.push("amounts");
    cuota = null; // incohérent : on garde base/total, l'utilisateur vérifie
  }
  return { fields: { ...out, base, cuotaIva: cuota, total }, warnings };
}

async function run(messages: ModelMessage[]) {
  const { object } = await generateObject({ model: MODEL, schema, system: SYSTEM, messages, maxRetries: 1 });
  return object;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  let fileId: unknown;
  try {
    ({ fileId } = (await req.json()) as { fileId?: unknown });
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  if (typeof fileId !== "string" || !fileId) return NextResponse.json({ error: "Payload invalide" }, { status: 400 });

  const f = await prisma.proofFile.findUnique({ where: { userId_id: { userId, id: fileId } } }).catch(() => null);
  if (!f) return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  const buf = Buffer.from(f.data, "base64");
  const prompt = { type: "text" as const, text: "Extrae los campos de esta factura." };

  try {
    let obj: ExtractedExpense;
    if (f.mime === "application/pdf") {
      try {
        obj = await run([{ role: "user", content: [prompt, { type: "file", data: buf, mediaType: "application/pdf" }] }]);
      } catch (e) {
        // Repli : texte extrait côté serveur
        const { extractText, getDocumentProxy } = await import("unpdf");
        const { text } = await extractText(await getDocumentProxy(new Uint8Array(buf)), { mergePages: true });
        if (!text.trim()) throw e;
        obj = await run([{ role: "user", content: [prompt, { type: "text", text: text.slice(0, 30000) }] }]);
      }
    } else {
      obj = await run([{ role: "user", content: [prompt, { type: "image", image: buf, mediaType: f.mime }] }]);
    }
    return NextResponse.json({ ok: true, model: MODEL, ...clean(obj) });
  } catch (err) {
    console.error("POST /api/gastos/extract", err);
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 200 });
  }
}
