import type { Expense, ExpenseCategory, Invoice, IvaRate } from "./types";
import { round2 } from "./format";
import { cobradoEur, quarterByIndex, type Quarter } from "./tax";

export const IVA_RATES: IvaRate[] = ["21", "10", "4", "0", "exento"];

export function ivaPct(rate: IvaRate): number {
  return rate === "exento" ? 0 : Number(rate);
}

export function calcIva(base: number, rate: IvaRate): number {
  return round2(base * (ivaPct(rate) / 100));
}

const affect = (e: Expense) => Math.min(100, Math.max(0, e.affectPct)) / 100;

export function isReverseCharge(e: Expense): boolean {
  return !!e.inversionSujetoPasivo;
}

/** IVA autoliquidado (devengado) por inversión del sujeto pasivo = base × tipo (21 % por defecto). */
export function rcIvaDevengado(e: Expense): number {
  if (!isReverseCharge(e)) return 0;
  const rate = typeof e.rcRate === "number" && Number.isFinite(e.rcRate) ? e.rcRate : 21;
  return round2(e.base * (rate / 100));
}

/** IVA soportado deducible de la autoliquidación = devengado × % afectación (si deducible). */
export function rcIvaDeducible(e: Expense): number {
  if (!isReverseCharge(e) || !e.ivaDeductible) return 0;
  return round2(rcIvaDevengado(e) * affect(e));
}

/** Gasto deducible IRPF = base imponible × % afectación. (Si l'IVA n'est pas déductible, il devient un coût : on l'ajoute.)
 *  Inversión del sujeto pasivo : base seule (l'IVA autoliquidé se compense) ; la part non déductible devient un coût. */
export function deductibleExpense(e: Expense): number {
  if (isReverseCharge(e)) {
    const nonDed = round2(rcIvaDevengado(e) - rcIvaDeducible(e));
    return round2(e.base * affect(e) + nonDed);
  }
  const nonDeductibleIva = e.ivaDeductible ? 0 : e.ivaAmount;
  return round2((e.base + nonDeductibleIva) * affect(e));
}

/** IVA soportado deducible = cuota IVA × % afectación (si el toggle está activo). */
export function deductibleIva(e: Expense): number {
  if (isReverseCharge(e)) return rcIvaDeducible(e);
  if (!e.ivaDeductible) return 0;
  return round2(e.ivaAmount * affect(e));
}

export type ReverseChargeSummary = {
  ueBase: number; ueDevengado: number; ueDeducible: number;
  noUeBase: number; noUeDevengado: number; noUeDeducible: number;
  needs349: boolean;
};

/** Agrège les autoliquidaciones : UE (adquisiciones intracomunitarias de servicios) vs fuera UE (art. 84.Uno.2º LIVA). */
export function reverseChargeSummary(list: Expense[]): ReverseChargeSummary {
  const r: ReverseChargeSummary = { ueBase: 0, ueDevengado: 0, ueDeducible: 0, noUeBase: 0, noUeDevengado: 0, noUeDeducible: 0, needs349: false };
  for (const e of list) {
    if (!isReverseCharge(e)) continue;
    if (e.paisProveedor === "UE") {
      r.ueBase = round2(r.ueBase + e.base);
      r.ueDevengado = round2(r.ueDevengado + rcIvaDevengado(e));
      r.ueDeducible = round2(r.ueDeducible + rcIvaDeducible(e));
      r.needs349 = true;
    } else {
      r.noUeBase = round2(r.noUeBase + e.base);
      r.noUeDevengado = round2(r.noUeDevengado + rcIvaDevengado(e));
      r.noUeDeducible = round2(r.noUeDeducible + rcIvaDeducible(e));
    }
  }
  return r;
}

export function inQuarter(e: Expense, q: Quarter): boolean {
  return !!e.date && e.date >= q.start && e.date <= q.end;
}

export function sumExpenses(list: Expense[]): { base: number; deductible: number; iva: number; ivaDeductible: number; total: number } {
  return list.reduce(
    (s, e) => ({
      base: round2(s.base + e.base),
      deductible: round2(s.deductible + deductibleExpense(e)),
      iva: round2(s.iva + e.ivaAmount),
      ivaDeductible: round2(s.ivaDeductible + deductibleIva(e)),
      total: round2(s.total + e.total),
    }),
    { base: 0, deductible: 0, iva: 0, ivaDeductible: 0, total: 0 },
  );
}

export function emptyExpense(id: string, today: string): Expense {
  return {
    id, date: today, supplier: "", supplierNif: "", invoiceNo: "", concept: "", category: "software",
    base: 0, ivaRate: "21", ivaAmount: 0, total: 0, affectPct: 100, ivaDeductible: true,
    inversionSujetoPasivo: false, paisProveedor: "ES", rcRate: 21, file: null,
    notes: "", createdAt: today, updatedAt: today,
  };
}

export const DEFAULT_AFFECT: Partial<Record<ExpenseCategory, number>> = { suministros: 30 };

export type Model130 = {
  quarter: Quarter;
  ingresosYtd: number;
  gastosYtd: number;
  rendimientoYtd: number;
  cuota20: number;
  previousPayments: number;
  aIngresar: number;
};

/**
 * Modelo 130 (estimación directa) — cumul depuis le 1er janvier : 20 % × (ingresos − gastos),
 * moins les pagos fraccionados des trimestres précédents de la même année (calculés de la même façon).
 * Ingresos = cobros EUR (critère de caisse déjà utilisé par l'app). Retenciones non gérées (clients hors UE).
 */
export function model130(invoices: Invoice[], expenses: Expense[], year: number, q: 1 | 2 | 3 | 4): Model130 {
  let paid = 0;
  let last: Model130 | null = null;
  for (let k = 1; k <= q; k++) {
    const qq = quarterByIndex(year, k as 1 | 2 | 3 | 4);
    const start = `${year}-01-01`;
    const ingresosYtd = round2(
      invoices
        .filter((i) => i.status === "cobrada" && i.cobroDate >= start && i.cobroDate <= qq.end)
        .reduce((s, i) => s + cobradoEur(i), 0),
    );
    const gastosYtd = sumExpenses(expenses.filter((e) => e.date >= start && e.date <= qq.end)).deductible;
    const rendimientoYtd = round2(ingresosYtd - gastosYtd);
    const cuota20 = round2(Math.max(0, rendimientoYtd * 0.2));
    const aIngresar = round2(Math.max(0, cuota20 - paid));
    last = { quarter: qq, ingresosYtd, gastosYtd, rendimientoYtd, cuota20, previousPayments: paid, aIngresar };
    paid = round2(paid + aIngresar);
  }
  return last!;
}

function csvCell(v: string | number): string {
  const s = typeof v === "number" ? v.toFixed(2).replace(".", ",") : v;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV « ; » (Excel ES/FR), décimales à virgule, BOM UTF-8. */
export function expensesCsv(list: Expense[], categoryLabel: (c: ExpenseCategory) => string): string {
  const head = [
    "Fecha", "Proveedor", "NIF proveedor", "Nº factura", "Concepto", "Categoría", "Base imponible",
    "Tipo IVA", "Cuota IVA", "Total", "% afectación", "IVA deducible", "Gasto deducible", "IVA soportado deducible",
    "Inversión sujeto pasivo", "Origen proveedor", "Tipo autoliquidación", "IVA autoliquidado (devengado)",
    "Adjunto", "Notas",
  ];
  const rows = list.map((e) => [
    e.date, e.supplier, e.supplierNif, e.invoiceNo, e.concept, categoryLabel(e.category), e.base,
    e.ivaRate === "exento" ? "exento" : `${e.ivaRate}%`, e.ivaAmount, e.total, String(e.affectPct),
    e.ivaDeductible ? "sí" : "no", deductibleExpense(e), deductibleIva(e),
    isReverseCharge(e) ? "sí" : "no", e.paisProveedor === "UE" ? "UE" : e.paisProveedor === "NOUE" ? "fuera UE" : "ES",
    isReverseCharge(e) ? `${e.rcRate ?? 21}%` : "", isReverseCharge(e) ? rcIvaDevengado(e) : 0, e.file ? e.file.name : "", e.notes,
  ]);
  return "\ufeff" + [head, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n") + "\r\n";
}
