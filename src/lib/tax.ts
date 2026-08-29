import type { Invoice } from "./types";
import { invoiceBase, invoiceTotal } from "./format";

export const IVA_NOSUJETA =
  "Operación no sujeta a IVA conforme al artículo 69.Uno.1º de la Ley 37/1992 del IVA.";

export const IVA_NOSUJETA_HELP =
  "Prestation B2B localisée chez le client établi hors UE : pas d'IVA espagnol. Ce n'est pas une exención.";

export type Quarter = {
  year: number;
  q: 1 | 2 | 3 | 4;
  start: string;
  end: string;
  windowStart: string;
  windowEnd: string;
  label: string;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function quarterOf(iso: string): Quarter {
  const d = new Date(iso + "T12:00:00");
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const q = (Math.floor((month - 1) / 3) + 1) as 1 | 2 | 3 | 4;
  return quarterByIndex(year, q);
}

export function quarterByIndex(year: number, q: 1 | 2 | 3 | 4): Quarter {
  const starts = ["01-01", "04-01", "07-01", "10-01"] as const;
  const ends = ["03-31", "06-30", "09-30", "12-31"] as const;
  const windowMonth = q === 1 ? 4 : q === 2 ? 7 : q === 3 ? 10 : 1;
  const windowYear = q === 4 ? year + 1 : year;
  const windowEndDay = q === 4 ? 20 : 20;
  const labels = ["1er trimestre", "2e trimestre", "3e trimestre", "4e trimestre"];
  return {
    year,
    q,
    start: `${year}-${starts[q - 1]}`,
    end: `${year}-${ends[q - 1]}`,
    windowStart: `${windowYear}-${pad(windowMonth)}-01`,
    windowEnd: `${windowYear}-${pad(windowMonth)}-${pad(windowEndDay)}`,
    label: `${labels[q - 1]} ${year}`,
  };
}

export function previousQuarter(q: Quarter): Quarter {
  if (q.q === 1) return quarterByIndex(q.year - 1, 4);
  return quarterByIndex(q.year, (q.q - 1) as 1 | 2 | 3 | 4);
}

export function nextQuarter(q: Quarter): Quarter {
  if (q.q === 4) return quarterByIndex(q.year + 1, 1);
  return quarterByIndex(q.year, (q.q + 1) as 1 | 2 | 3 | 4);
}

function inRange(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end;
}

export function filingTarget(todayIso: string): {
  current: Quarter;
  toFile: Quarter;
  inWindow: boolean;
  nextWindow: Quarter;
} {
  const current = quarterOf(todayIso);
  const prev = previousQuarter(current);
  const inWindow = inRange(todayIso, current.windowStart, current.windowEnd)
    ? false
    : inRange(todayIso, prev.windowStart, prev.windowEnd);
  if (inRange(todayIso, prev.windowStart, prev.windowEnd)) {
    return {
      current,
      toFile: prev,
      inWindow: true,
      nextWindow: prev,
    };
  }
  return {
    current,
    toFile: current,
    inWindow: false,
    nextWindow: current,
  };
}

export function isOverdue(inv: Invoice, todayIso: string): boolean {
  return inv.status === "emise" && !!inv.dueDate && inv.dueDate < todayIso;
}

export function displayStatus(inv: Invoice, todayIso: string): Invoice["status"] | "en_retard" {
  if (isOverdue(inv, todayIso)) return "en_retard";
  return inv.status;
}

export function cobradoEur(inv: Invoice): number {
  if (inv.status !== "cobrada" || !inv.payment) return 0;
  return inv.payment.eurEquivalent;
}

export function facturadoEur(inv: Invoice): number {
  if (inv.status === "brouillon") return 0;
  const base = invoiceBase(inv.items);
  return invoiceTotal(base, inv.irpfRate);
}

export function unpaidEur(inv: Invoice, todayIso: string): number {
  if (inv.status !== "emise") return 0;
  void todayIso;
  const base = invoiceBase(inv.items);
  return invoiceTotal(base, inv.irpfRate);
}

export function inQuarterByIssue(inv: Invoice, q: Quarter): boolean {
  return inv.status !== "brouillon" && inRange(inv.issueDate, q.start, q.end);
}

export function inQuarterByCobro(inv: Invoice, q: Quarter): boolean {
  return inv.status === "cobrada" && !!inv.cobroDate && inRange(inv.cobroDate, q.start, q.end);
}

export type EmitBlocker = { field: string; message: string };

export function emitBlockers(opts: {
  nombre: string;
  nif: string;
  direccion: string;
  clientBrand: string;
  clientCountry: string;
  items: { description: string; quantity: number; unitPriceEur: number }[];
  issueDate: string;
}): EmitBlocker[] {
  const b: EmitBlocker[] = [];
  if (!opts.nombre.trim()) b.push({ field: "nombre", message: "Ton nom (émetteur) est requis." });
  if (!opts.nif.trim()) b.push({ field: "nif", message: "Le NIF/NIE de l'émetteur est requis." });
  if (!opts.direccion.trim()) b.push({ field: "direccion", message: "L'adresse de l'émetteur est requise." });
  if (!opts.clientBrand.trim()) b.push({ field: "client", message: "La marca cliente est requise." });
  if (!opts.clientCountry.trim()) b.push({ field: "country", message: "Le pays du client est requis." });
  if (!opts.issueDate) b.push({ field: "issueDate", message: "La date d'émission est requise." });
  const validItems = opts.items.filter(
    (i) => i.description.trim() && i.quantity > 0 && i.unitPriceEur >= 0,
  );
  if (validItems.length === 0) {
    b.push({ field: "items", message: "Ajoute au moins une ligne (description + montant EUR)." });
  }
  return b;
}
