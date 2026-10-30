import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { generateObject, type ModelMessage } from "ai";
import { prisma } from "@/lib/db";
import { SYSTEM, clean, schema, type ExtractedExpense } from "@/lib/expense-extract";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Modèle vision + PDF natif via Vercel AI Gateway (surchargeable par AI_GATEWAY_MODEL). */
const MODEL = process.env.AI_GATEWAY_MODEL || "google/gemini-2.5-flash";

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
