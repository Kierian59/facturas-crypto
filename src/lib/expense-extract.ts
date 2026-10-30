import { z } from "zod";
import { EXPENSE_CATEGORIES } from "@/lib/types";

export const schema = z.object({
  fecha: z.string().nullable().describe(
    "Fecha de expedición (Invoice date / Date of issue), convertida a YYYY-MM-DD. Acepta formatos como 'October 29, 2026', 'Oct 29, 2026', '29/10/2026' (UE: día/mes) o '10/29/2026' (EE. UU.: mes/día, solo si el emisor es de EE. UU. o el día > 12). No uses la fecha de vencimiento ni el periodo de servicio. null si no aparece.",
  ),
  proveedor: z.string().nullable().describe("Razón social o nombre del emisor (proveedor). null si no aparece."),
  nifProveedor: z.string().nullable().describe("NIF/CIF/VAT del emisor, tal cual. null si no aparece."),
  numeroFactura: z.string().nullable().describe("Número de factura. null si no aparece."),
  concepto: z.string().nullable().describe("Descripción breve del bien o servicio (máx. 80 caracteres)."),
  categoria: z.enum(EXPENSE_CATEGORIES).nullable().describe(
    "software=SaaS/suscripciones; equipos=ordenadores/hardware; telefono=internet/móvil; cuota_autonomo=Seguridad Social/RETA; gestoria=asesoría; publicidad; formacion; comisiones=bancos/exchanges; suministros=luz/agua/gas; viajes; otros. null si dudoso.",
  ),
  base: z.number().nullable().describe("Base imponible (sin IVA) = Subtotal / Net amount / Base imponible. Número sin símbolo: '€13.00' → 13, '1,234.50' → 1234.5, '1.234,50' → 1234.5. null si no aparece."),
  tipoIva: z.enum(["21", "10", "4", "0", "exento"]).nullable().describe("Tipo de IVA español aplicado en la factura. '0' si la factura no lleva IVA (p. ej. inversión del sujeto pasivo / reverse charge). null si no se puede saber."),
  cuotaIva: z.number().nullable().describe("Cuota de IVA/VAT/Tax cargada en la factura. 0 si no hay línea de IVA y Total = Subtotal. null si no se puede saber."),
  total: z.number().nullable().describe("Total factura en EUR. null si no aparece."),
  moneda: z.string().nullable().describe("Moneda ISO de los importes ('€' → EUR, '$'/'US$' → USD, '£' → GBP)."),
  paisProveedor: z.string().nullable().describe("País del emisor (proveedor) en código ISO-3166 alfa-2 según su dirección o NIF/VAT (p. ej. 'United Kingdom' → GB, 'Ireland' → IE, USA → US, España → ES). null si no aparece."),
  inversionSujetoPasivo: z.boolean().describe(
    "true si la factura indica inversión del sujeto pasivo: menciona 'reverse charge', 'Customer to reverse charge', 'VAT reverse charge', 'Article 196', 'inversión del sujeto pasivo', 'autoliquidación', 'autoliquidation', 'Autoliquidation', 'Steuerschuldnerschaft des Leistungsempfängers', o el proveedor está fuera de España, no cobra IVA (0) y figura el NIF/VAT del cliente. false en otro caso.",
  ),
});
export type ExtractedExpense = z.infer<typeof schema>;

export const SYSTEM =
  "Extraes datos de una factura recibida (gasto de un autónomo en España). Devuelve SOLO lo que está escrito en el documento. " +
  "Nunca inventes: si un campo no aparece claramente, devuelve null. Importes como números con punto decimal. " +
  "La factura puede estar en inglés u otro idioma (formatos UK/US/UE): 'Invoice number' = número, 'Date of issue' = fecha, 'Subtotal' = base, 'Total'/'Amount due' = total, 'VAT'/'Tax' = IVA. " +
  "El emisor es el vendedor (no el bloque 'Bill to', que es el cliente). Si no hay línea de IVA y Total = Subtotal, cuotaIva = 0 y tipoIva = '0'. " +
  "Detecta la inversión del sujeto pasivo (reverse charge) solo a partir del texto del documento.";

const EU = new Set(["AT","BE","BG","CY","CZ","DE","DK","EE","GR","EL","FI","FR","HR","HU","IE","IT","LT","LU","LV","MT","NL","PL","PT","RO","SE","SI","SK"]);
export function originFromCountry(c: string | null): "ES" | "UE" | "NOUE" | null {
  if (!c) return null;
  if (c === "ES") return "ES";
  return EU.has(c) ? "UE" : "NOUE"; // GB (post-Brexit), US… = fuera UE
}

export function clean(x: ExtractedExpense) {
  const out: Partial<Record<keyof ExtractedExpense | "origen", unknown>> = {};
  const str = (v: string | null, max = 120) => (v && v.trim() ? v.trim().slice(0, max) : null);
  const num = (v: number | null) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 100) / 100 : null);
  out.fecha = x.fecha && /^\d{4}-\d{2}-\d{2}$/.test(x.fecha) && !Number.isNaN(Date.parse(x.fecha)) ? x.fecha : null;
  out.proveedor = str(x.proveedor);
  out.nifProveedor = str(x.nifProveedor, 30);
  out.numeroFactura = str(x.numeroFactura, 60);
  out.concepto = str(x.concepto, 120);
  out.categoria = x.categoria ?? null;
  out.tipoIva = x.tipoIva ?? null;
  const pais = x.paisProveedor && /^[A-Za-z]{2}$/.test(x.paisProveedor.trim()) ? x.paisProveedor.trim().toUpperCase() : null;
  out.paisProveedor = pais === "UK" ? "GB" : pais;
  out.origen = originFromCountry(out.paisProveedor as string | null);
  out.inversionSujetoPasivo = !!x.inversionSujetoPasivo && out.origen !== "ES";
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
  if (out.inversionSujetoPasivo) {
    // Autoliquidación : la factura ne porte pas d'IVA ; base = subtotal, total = base.
    if (base == null && total != null && !cuota) base = total;
    if (cuota == null || cuota === 0) { cuota = 0; out.tipoIva = "0"; if (base != null) total = base; }
  }
  return { fields: { ...out, base, cuotaIva: cuota, total }, warnings };
}

