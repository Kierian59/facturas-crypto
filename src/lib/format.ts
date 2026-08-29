import type { Locale } from "./i18n";

function tag(locale: Locale | undefined): string {
  return locale === "fr" ? "fr-FR" : "es-ES";
}

export function formatEur(n: number, locale: Locale = "es"): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(tag(locale), { style: "currency", currency: "EUR" }).format(n);
}

export function formatNum(n: number, locale: Locale = "es"): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(tag(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatCrypto(n: number, asset: string, locale: Locale = "es"): string {
  if (!Number.isFinite(n)) return "—";
  return `${new Intl.NumberFormat(tag(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(n)} ${asset}`;
}

export function isoDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function padSeq(n: number): string {
  return String(n).padStart(4, "0");
}

export function lineTotal(qty: number, unit: number): number {
  return round2(qty * unit);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function invoiceBase(items: { quantity: number; unitPriceEur: number }[]): number {
  return round2(items.reduce((s, i) => s + lineTotal(i.quantity, i.unitPriceEur), 0));
}

export function irpfAmount(base: number, rate: number): number {
  return round2(base * (rate / 100));
}

export function invoiceTotal(base: number, irpfRate: number): number {
  return round2(base - irpfAmount(base, irpfRate));
}
