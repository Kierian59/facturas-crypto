import type { Invoice } from "./types";
import { invoiceBase, invoiceTotal } from "./format";

/** Production endpoint for systems that do NOT remit records (No Verifactu). */
export const AEAT_NO_VERIFACTU_BASE =
  "https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQRNoVerifactu";

/** Official AEAT sede links (login with Cl@ve / certificado). */
export const AEAT_LINKS = {
  facturacionApp:
    "https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu.html",
  modelo303: "https://sede.agenciatributaria.gob.es/Sede/iva/pre-303.html",
  modelo130: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G601.shtml",
  calendario:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026.html",
} as const;

export function normalizeNif(nif: string): string {
  return nif.replace(/\s+/g, "").toUpperCase();
}

export function formatAeatFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

/** Dot decimals, no thousands separator. Trailing zeros dropped (AEAT examples use 241.4). */
export function formatAeatImporte(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  if (!Number.isFinite(rounded)) return "0";
  return String(rounded);
}

export function aeatCotejoUrl(opts: {
  nif: string;
  numserie: string;
  issueDate: string;
  total: number;
}): string | null {
  const nif = normalizeNif(opts.nif);
  const numserie = opts.numserie.trim().slice(0, 60);
  if (!nif || !numserie || !opts.issueDate) return null;
  const params = new URLSearchParams({
    nif,
    numserie,
    fecha: formatAeatFecha(opts.issueDate),
    importe: formatAeatImporte(opts.total),
  });
  return `${AEAT_NO_VERIFACTU_BASE}?${params.toString()}`;
}

export function invoiceTotalEur(inv: Invoice): number {
  return invoiceTotal(invoiceBase(inv.items), inv.irpfRate);
}

export function canonicalInvoiceJson(inv: Invoice, nif: string): string {
  const payload = {
    number: inv.number,
    issueDate: inv.issueDate,
    nif: normalizeNif(nif),
    clientId: inv.clientId,
    items: inv.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPriceEur: i.unitPriceEur,
    })),
    irpfRate: inv.irpfRate,
    total: invoiceTotalEur(inv),
  };
  return JSON.stringify(payload);
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function invoiceHuella(inv: Invoice, nif: string): Promise<string> {
  return sha256Hex(canonicalInvoiceJson(inv, nif));
}
