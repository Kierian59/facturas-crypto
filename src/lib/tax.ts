import type { Invoice } from "./types";
import { invoiceBase, invoiceTotal } from "./format";
import { dict, type Locale } from "./i18n";

export const IVA_NOSUJETA =
  "Operación no sujeta a IVA conforme al artículo 69.Uno.1º de la Ley 37/1992 del IVA.";

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

export function quarterOf(iso: string, locale: Locale = "es"): Quarter {
  const d = new Date(iso + "T12:00:00");
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const q = (Math.floor((month - 1) / 3) + 1) as 1 | 2 | 3 | 4;
  return quarterByIndex(year, q, locale);
}

export function quarterByIndex(year: number, q: 1 | 2 | 3 | 4, locale: Locale = "es"): Quarter {
  const starts = ["01-01", "04-01", "07-01", "10-01"] as const;
  const ends = ["03-31", "06-30", "09-30", "12-31"] as const;
  const windowMonth = q === 1 ? 4 : q === 2 ? 7 : q === 3 ? 10 : 1;
  const windowYear = q === 4 ? year + 1 : year;
  const windowEndDay = q === 4 ? 30 : 20;
  const labels = dict(locale).quarters;
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

export function previousQuarter(q: Quarter, locale: Locale = "es"): Quarter {
  if (q.q === 1) return quarterByIndex(q.year - 1, 4, locale);
  return quarterByIndex(q.year, (q.q - 1) as 1 | 2 | 3 | 4, locale);
}

export function nextQuarter(q: Quarter, locale: Locale = "es"): Quarter {
  if (q.q === 4) return quarterByIndex(q.year + 1, 1, locale);
  return quarterByIndex(q.year, (q.q + 1) as 1 | 2 | 3 | 4, locale);
}

function inRange(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end;
}

export function filingTarget(
  todayIso: string,
  locale: Locale = "es",
): {
  current: Quarter;
  toFile: Quarter;
  inWindow: boolean;
  nextWindow: Quarter;
} {
  const current = quarterOf(todayIso, locale);
  const prev = previousQuarter(current, locale);
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
  clientAddress: string;
  items: { description: string; quantity: number; unitPriceEur: number }[];
  issueDate: string;
  locale?: Locale;
}): EmitBlocker[] {
  const t = dict(opts.locale ?? "es");
  const b: EmitBlocker[] = [];
  if (!opts.nombre.trim()) b.push({ field: "nombre", message: t.blockers.nombre });
  if (!opts.nif.trim()) b.push({ field: "nif", message: t.blockers.nif });
  if (!opts.direccion.trim()) b.push({ field: "direccion", message: t.blockers.direccion });
  if (!opts.clientBrand.trim()) b.push({ field: "client", message: t.blockers.client });
  if (!opts.clientCountry.trim()) b.push({ field: "country", message: t.blockers.country });
  if (!opts.clientAddress.trim()) b.push({ field: "address", message: t.blockers.address });
  if (!opts.issueDate) b.push({ field: "issueDate", message: t.blockers.issueDate });
  const validItems = opts.items.filter(
    (i) => i.description.trim() && i.quantity > 0 && i.unitPriceEur >= 0,
  );
  if (validItems.length === 0) {
    b.push({ field: "items", message: t.blockers.items });
  }
  return b;
}

export type FiscalDeadline = {
  id: string;
  kind: "quarter" | "renta" | "verifactu";
  periodLabel: string;
  windowStart: string;
  windowEnd: string;
};

export function fiscalDeadlines(todayIso: string, locale: Locale): FiscalDeadline[] {
  const year = Number(todayIso.slice(0, 4));
  const items: FiscalDeadline[] = [];
  for (const y of [year - 1, year, year + 1]) {
    for (const q of [1, 2, 3, 4] as const) {
      const qq = quarterByIndex(y, q, locale);
      items.push({
        id: `${y}-T${q}`,
        kind: "quarter",
        periodLabel: qq.label,
        windowStart: qq.windowStart,
        windowEnd: qq.windowEnd,
      });
    }
    items.push({
      id: `${y}-renta`,
      kind: "renta",
      periodLabel: String(y),
      windowStart: `${y + 1}-04-02`,
      windowEnd: `${y + 1}-06-30`,
    });
  }
  items.push({
    id: "verifactu-2027",
    kind: "verifactu",
    periodLabel: "2027",
    windowStart: "2027-07-01",
    windowEnd: "2027-07-01",
  });
  const seen = new Set<string>();
  const unique = items.filter((d) => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });
  unique.sort((a, b) => a.windowEnd.localeCompare(b.windowEnd) || a.id.localeCompare(b.id));
  const cutoff = todayIso < "2000-01-01" ? todayIso : addDaysIso(todayIso, -45);
  return unique.filter((d) => d.windowEnd >= cutoff).slice(0, 8);
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
