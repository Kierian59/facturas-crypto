"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore, useT } from "@/lib/store";
import { Button, Disclaimer, Empty, Field, Input, PageTitle, Select, Textarea } from "@/components/ui";
import { formatDate, formatEur, isoDate, round2, uid } from "@/lib/format";
import { quarterByIndex } from "@/lib/tax";
import {
  DEFAULT_AFFECT, IVA_RATES, calcIva, deductibleExpense, deductibleIva, emptyExpense, rcIvaDeducible, rcIvaDevengado, expensesCsv, sumExpenses,
} from "@/lib/expenses";
import { PROOF_ACCEPT, deleteProofFile, fileUrl, uploadProofFile } from "@/lib/proof";
import { EXPENSE_CATEGORIES, SUPPLIER_ORIGINS, type Expense, type ExpenseCategory, type IvaRate, type SupplierOrigin } from "@/lib/types";

type Q = 0 | 1 | 2 | 3 | 4;

type Extracted = {
  fecha: string | null; proveedor: string | null; nifProveedor: string | null; numeroFactura: string | null;
  concepto: string | null; categoria: ExpenseCategory | null; base: number | null; tipoIva: IvaRate | null;
  cuotaIva: number | null; total: number | null;
  paisProveedor?: string | null; origen?: SupplierOrigin | null; inversionSujetoPasivo?: boolean;
};
type Draft = {
  key: string;
  name: string;
  status: "processing" | "ready" | "error";
  expense?: Expense;
  notice?: "auto" | "manual";
  warnings?: string[];
  error?: string;
};

function draftFrom(id: string, today: string, file: Expense["file"], x: Extracted | null): Expense {
  const e = emptyExpense(id, today);
  if (!x) return { ...e, date: "", category: "otros", file };
  const category = x.categoria ?? "otros";
  const zero = x.tipoIva === "0" || x.tipoIva === "exento";
  return {
    ...e,
    date: x.fecha ?? "",
    supplier: x.proveedor ?? "",
    supplierNif: x.nifProveedor ?? "",
    invoiceNo: x.numeroFactura ?? "",
    concept: x.concepto ?? "",
    category,
    affectPct: DEFAULT_AFFECT[category] ?? 100,
    base: x.base ?? 0,
    ivaRate: x.tipoIva ?? e.ivaRate,
    ivaAmount: x.cuotaIva ?? 0,
    total: x.total ?? 0,
    ivaDeductible: x.inversionSujetoPasivo ? true : !zero && !!x.nifProveedor,
    inversionSujetoPasivo: !!x.inversionSujetoPasivo,
    paisProveedor: x.origen ?? "ES",
    file,
  };
}

function parseNum(v: string): number {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export default function GastosPage() {
  const { expenses, settings, upsertExpense, deleteExpense } = useStore();
  const t = useT();
  const te = t.expenses;
  const locale = settings.locale;
  const today = isoDate();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [q, setQ] = useState<Q>((Math.floor((Number(today.slice(5, 7)) - 1) / 3) + 1) as Q);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const h = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(h);
  }, [toast]);
  const pickInput = useRef<HTMLInputElement>(null);
  const camInput = useRef<HTMLInputElement>(null);
  const chain = useRef<Promise<void>>(Promise.resolve());

  const patchDraft = useCallback((key: string, p: Partial<Draft>) => {
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...p } : d)));
  }, []);

  function addFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      const key = uid("drf");
      setDrafts((ds) => [...ds, { key, name: file.name, status: "processing" }]);
      // Traitement séquentiel (évite de saturer l'upload / l'IA)
      chain.current = chain.current.then(async () => {
        const id = uid("exp");
        const up = await uploadProofFile(id, file);
        if (!up.ok) {
          patchDraft(key, {
            status: "error",
            error: up.error === "tooBig" ? te.uploadTooBig : up.error === "type" ? te.uploadType : te.uploadFailed,
          });
          return;
        }
        let x: Extracted | null = null;
        let warnings: string[] = [];
        try {
          const res = await fetch("/api/gastos/extract", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fileId: up.ref.id }),
          });
          const j = res.ok ? await res.json() : null;
          if (j?.ok) {
            x = j.fields as Extracted;
            warnings = j.warnings ?? [];
          }
        } catch {
          /* repli manuel */
        }
        // Stockage direct : aucun champ obligatoire, on enregistre tout de suite (formulaire optionnel ensuite).
        let exp: Expense;
        try {
          exp = draftFrom(id, today, up.ref, x);
        } catch {
          exp = { ...emptyExpense(id, today), category: "otros", file: up.ref };
        }
        if (!exp.date) exp.date = today;
        if (!exp.supplier.trim()) exp.supplier = file.name.replace(/\.[^.]+$/, "") || file.name;
        upsertExpense(exp);
        void warnings;
        setDrafts((ds) => ds.filter((d) => d.key !== key));
        setToast(te.savedToast);
      });
    }
  }

  // Ouvre automatiquement le prochain brouillon prêt
  useEffect(() => {
    if (editing) return;
    const next = drafts.find((d) => d.status === "ready" && false);
    if (next?.expense) {
      setEditingDraft(next);
      setEditing(next.expense);
    }
  }, [drafts, editing]);

  function closeEditor() {
    if (editingDraft) setDrafts((ds) => ds.filter((d) => d.key !== editingDraft.key));
    setEditingDraft(null);
    setEditing(null);
  }

  const years = useMemo(() => {
    const s = new Set<number>([Number(today.slice(0, 4))]);
    expenses.forEach((e) => e.date && s.add(Number(e.date.slice(0, 4))));
    return [...s].filter(Number.isFinite).sort((a, b) => b - a);
  }, [expenses, today]);

  const period = useMemo(() => {
    if (q === 0) return { start: `${year}-01-01`, end: `${year}-12-31`, label: String(year) };
    const qq = quarterByIndex(year, q as 1 | 2 | 3 | 4, locale);
    return { start: qq.start, end: qq.end, label: qq.label };
  }, [year, q, locale]);

  const list = useMemo(
    () =>
      expenses
        .filter((e) => e.date >= period.start && e.date <= period.end)
        .sort((a, b) => b.date.localeCompare(a.date) || a.supplier.localeCompare(b.supplier)),
    [expenses, period],
  );
  const totals = sumExpenses(list);
  const perQuarter = ([1, 2, 3, 4] as const).map((k) => {
    const qq = quarterByIndex(year, k, locale);
    return { k, ...sumExpenses(expenses.filter((e) => e.date >= qq.start && e.date <= qq.end)) };
  });

  function exportCsv() {
    const csv = expensesCsv(list, (c) => te.categories[c] ?? c);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gastos-${q === 0 ? year : `${year}-T${q}`}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function remove(e: Expense) {
    if (!confirm(te.confirmDelete(e.supplier || e.concept || formatDate(e.date)))) return;
    if (e.file) void deleteProofFile(e.file.id);
    deleteExpense(e.id);
    if (editing?.id === e.id) setEditing(null);
  }

  return (
    <div>
      <PageTitle
        kicker={te.kicker}
        title={te.title}
        action={
          <Button onClick={() => { setEditingDraft(null); setEditing(emptyExpense(uid("exp"), today)); }}>{te.add}</Button>
        }
      />
      <p className="mb-5 text-sm text-ink-soft">{te.intro}</p>

      <div
        role="button"
        tabIndex={0}
        onClick={() => pickInput.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") pickInput.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={`mb-6 cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
          dragOver ? "border-olive bg-olive/10" : "border-line hover:border-olive"
        }`}
      >
        <p className="font-display text-xl">{te.dropTitle}</p>
        <p className="mt-1 text-sm text-muted">{te.dropBody}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={(e) => { e.stopPropagation(); pickInput.current?.click(); }}>{te.dropPick}</Button>
          <Button type="button" variant="ghost" className="sm:hidden" onClick={(e) => { e.stopPropagation(); camInput.current?.click(); }}>
            {te.dropCamera}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted">{te.dropHint}</p>
        <input ref={pickInput} type="file" multiple accept={PROOF_ACCEPT} className="hidden"
          onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }} />
        <input ref={camInput} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }} />
      </div>

      {toast ? (
        <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-olive px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      ) : null}
      {drafts.length > 0 ? (
        <ul className="paper-card mb-6 divide-y divide-line rounded-2xl text-sm">
          {drafts.map((dr) => (
            <li key={dr.key} className="flex flex-wrap items-center gap-3 px-4 py-2">
              <span className="min-w-0 flex-1 truncate">{dr.name}</span>
              {dr.status === "processing" ? <span className="text-xs text-muted">{te.dropProcessing}</span> : null}
              {dr.status === "ready" ? (
                editingDraft?.key === dr.key ? (
                  <span className="text-xs text-olive">{te.dropReviewing}</span>
                ) : (
                  <span className="text-xs text-muted">{te.dropQueued}</span>
                )
              ) : null}
              {dr.status === "error" ? (
                <>
                  <span className="text-xs text-danger">{dr.error}</span>
                  <button type="button" className="text-xs underline" onClick={() => setDrafts((ds) => ds.filter((d) => d.key !== dr.key))}>
                    OK
                  </button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {editing ? (
        <ExpenseForm
          key={editing.id}
          initial={editing}
          isNew={!expenses.some((x) => x.id === editing.id)}
          notice={editingDraft?.notice}
          warnings={editingDraft?.warnings}
          ownsInitialFile={!!editingDraft}
          onCancel={closeEditor}
          onSave={(e) => {
            upsertExpense(e);
            closeEditor();
            if (e.date) {
              setYear(Number(e.date.slice(0, 4)));
              if (q !== 0) setQ((Math.floor((Number(e.date.slice(5, 7)) - 1) / 3) + 1) as Q);
            }
          }}
          onDelete={remove}
        />
      ) : null}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-xs text-muted">{te.year}</span>
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="!w-28">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-muted">{te.quarter}</span>
          <Select value={q} onChange={(e) => setQ(Number(e.target.value) as Q)} className="!w-44">
            <option value={0}>{te.allYear}</option>
            {[1, 2, 3, 4].map((k) => <option key={k} value={k}>T{k}</option>)}
          </Select>
        </label>
        <Button variant="ghost" className="ml-auto" onClick={exportCsv} disabled={list.length === 0}>
          {te.exportCsv}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={te.totDeductible} value={formatEur(totals.deductible, locale)} hint={`${period.label} · ${te.totCount(list.length)}`} />
        <Stat label={te.totIva} value={formatEur(totals.ivaDeductible, locale)} hint={period.label} />
        <div className="paper-card rounded-2xl p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{year}</p>
          <ul className="mt-1 space-y-0.5 text-xs tabular">
            {perQuarter.map((p) => (
              <li key={p.k} className="flex justify-between gap-2">
                <span>T{p.k}</span>
                <span>{formatEur(p.deductible, locale)} · IVA {formatEur(p.ivaDeductible, locale)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5">
        {list.length === 0 ? (
          <Empty title={te.empty} body={te.emptyBody} />
        ) : (
          <ul className="paper-card divide-y divide-line rounded-2xl">
            {list.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { setEditingDraft(null); setEditing(e); }}>
                  <p className="font-medium">
                    {e.supplier || "—"}
                    {e.invoiceNo ? <span className="text-muted"> · {e.invoiceNo}</span> : null}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDate(e.date)} · {te.categories[e.category] ?? e.category}
                    {e.concept ? ` · ${e.concept}` : ""}
                    {e.affectPct < 100 ? ` · ${e.affectPct} %` : ""}
                    {e.inversionSujetoPasivo ? ` · ${te.rcBadge}` : ""}
                    {!e.base && !e.total ? <span className="ml-1 rounded bg-danger/10 px-1.5 text-[10px] text-danger">{te.toComplete}</span> : null}
                  </p>
                </button>
                {e.file ? (
                  <a href={fileUrl(e.file)} target="_blank" rel="noreferrer" className="text-xs text-olive underline">
                    PDF/img
                  </a>
                ) : (
                  <span className="text-xs text-danger">{te.noFile}</span>
                )}
                <span className="text-right tabular">
                  <span className="block">{formatEur(deductibleExpense(e), locale)}</span>
                  <span className="block text-xs text-muted">IVA {formatEur(deductibleIva(e), locale)}</span>
                </span>
                <button type="button" className="text-xs text-danger" onClick={() => remove(e)}>
                  {te.delete}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Disclaimer className="mt-8" />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="paper-card rounded-2xl p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl tabular leading-tight">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

function ExpenseForm({
  initial, isNew, onCancel, onSave, onDelete, notice, warnings, ownsInitialFile,
}: {
  initial: Expense;
  isNew: boolean;
  notice?: "auto" | "manual";
  warnings?: string[];
  ownsInitialFile?: boolean;
  onCancel: () => void;
  onSave: (e: Expense) => void;
  onDelete: (e: Expense) => void;
}) {
  const t = useT();
  const te = t.expenses;
  const [d, setD] = useState<Expense>(initial);
  const [base, setBase] = useState(initial.base ? String(initial.base) : "");
  const [iva, setIva] = useState(initial.ivaAmount ? String(initial.ivaAmount) : "");
  const [total, setTotal] = useState(initial.total ? String(initial.total) : "");
  const [ivaTouched, setIvaTouched] = useState(false);
  const [rcRate, setRcRate] = useState(String(initial.rcRate ?? 21));
  const [dedTouched, setDedTouched] = useState(!isNew);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [fileErr, setFileErr] = useState("");
  const uploaded = useRef<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const rc = !!d.inversionSujetoPasivo;
  function recompute(nextBase: string, rate: IvaRate, keepIva = ivaTouched) {
    const b = parseNum(nextBase);
    if (rc) { setIva(""); setTotal(b ? String(round2(b)) : ""); return; }
    const i = keepIva ? parseNum(iva) : calcIva(b, rate);
    if (!keepIva) setIva(i ? String(i) : "");
    setTotal(b ? String(round2(b + i)) : "");
  }

  function setRc(on: boolean) {
    const b = parseNum(base);
    if (on) {
      setD((x) => ({ ...x, inversionSujetoPasivo: true, ivaRate: "0", ivaDeductible: true, paisProveedor: x.paisProveedor === "ES" || !x.paisProveedor ? "NOUE" : x.paisProveedor }));
      setIva("");
      setTotal(b ? String(round2(b)) : "");
    } else {
      setD((x) => ({ ...x, inversionSujetoPasivo: false, ivaRate: "21" }));
      setIvaTouched(false);
      const i = calcIva(b, "21");
      setIva(i ? String(i) : "");
      setTotal(b ? String(round2(b + i)) : "");
    }
  }

  function setNif(v: string) {
    setD((x) => ({ ...x, supplierNif: v, ivaDeductible: dedTouched ? x.ivaDeductible : x.ivaRate !== "exento" && x.ivaRate !== "0" && !!v.trim() }));
  }

  async function pick(file: File) {
    setBusy(true);
    setFileErr("");
    const r = await uploadProofFile(d.id, file);
    setBusy(false);
    if (!r.ok) {
      setFileErr(r.error === "tooBig" ? te.uploadTooBig : r.error === "type" ? te.uploadType : te.uploadFailed);
      return;
    }
    uploaded.current.push(r.ref.id);
    setD((x) => ({ ...x, file: r.ref }));
  }

  function cleanupUnsaved(keepId: string | null) {
    for (const id of uploaded.current) if (id !== keepId) void deleteProofFile(id);
    uploaded.current = [];
  }

  function save() {
    const b = parseNum(base);
    void setErr;
    const i = rc ? 0 : parseNum(iva);
    const tot = rc ? b : parseNum(total) || round2(b + i);
    const next: Expense = {
      ...d,
      date: d.date || isoDate(),
      supplier: d.supplier.trim() || d.file?.name || "",
      supplierNif: d.supplierNif.trim(),
      base: round2(b),
      ivaAmount: round2(i),
      total: round2(tot),
      affectPct: Math.min(100, Math.max(0, Math.round(d.affectPct))),
      ivaRate: rc ? "0" : d.ivaRate,
      paisProveedor: d.paisProveedor ?? "ES",
      rcRate: Math.min(100, Math.max(0, parseNum(rcRate) || 0)),
      updatedAt: isoDate(),
    };
    // Ancienne pièce remplacée / retirée → supprimée ; fichiers envoyés mais non retenus → supprimés.
    if (initial.file && initial.file.id !== next.file?.id) void deleteProofFile(initial.file.id);
    cleanupUnsaved(next.file?.id ?? null);
    onSave(next);
  }

  const rcPreview = { ...d, base: parseNum(base), rcRate: parseNum(rcRate) };
  const noNif = !rc && d.ivaDeductible && !d.supplierNif.trim() && parseNum(iva) > 0;

  return (
    <section className="paper-card mb-6 rounded-2xl p-5">
      <h2 className="font-display text-xl">{isNew ? te.newTitle : te.edit}</h2>
      {notice === "auto" ? <p className="mt-2 rounded-lg bg-olive/10 p-2 text-sm">{te.autoFilled}</p> : null}
      {notice === "manual" ? <p className="mt-2 rounded-lg bg-danger/10 p-2 text-sm">{te.autoUnavailable}</p> : null}
      {warnings?.includes("amounts") ? <p className="mt-2 text-sm text-danger">{te.autoAmounts}</p> : null}
      {warnings?.includes("currency") ? <p className="mt-2 text-sm text-danger">{te.autoCurrency}</p> : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label={te.date}>
          <Input type="date" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} />
        </Field>
        <Field label={te.category}>
          <Select
            value={d.category}
            onChange={(e) => {
              const category = e.target.value as ExpenseCategory;
              const affectPct = isNew && d.affectPct === (DEFAULT_AFFECT[d.category] ?? 100) ? DEFAULT_AFFECT[category] ?? 100 : d.affectPct;
              setD({ ...d, category, affectPct });
            }}
          >
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{te.categories[c]}</option>)}
          </Select>
        </Field>
        <Field label={te.supplier}>
          <Input value={d.supplier} onChange={(e) => setD({ ...d, supplier: e.target.value })} />
        </Field>
        <Field label={te.supplierNif} optional>
          <Input value={d.supplierNif} onChange={(e) => setNif(e.target.value)} placeholder="B12345678 / ESB12345678" />
        </Field>
        <Field label={te.origin}>
          <Select value={d.paisProveedor ?? "ES"} onChange={(e) => setD({ ...d, paisProveedor: e.target.value as SupplierOrigin })}>
            {SUPPLIER_ORIGINS.map((o) => <option key={o} value={o}>{te.origins[o]}</option>)}
          </Select>
        </Field>
        <div className="sm:col-span-2 rounded-xl border border-line p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={rc} onChange={(e) => setRc(e.target.checked)} />
            {te.rcToggle}
          </label>
          <p className="mt-1 text-xs leading-relaxed text-muted">{te.rcHint}</p>
          {rc ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label={te.rcRate}>
                <Input inputMode="decimal" value={rcRate} onChange={(e) => setRcRate(e.target.value)} />
              </Field>
              <div className="text-sm">
                <p className="text-xs text-muted">{te.rcDevengado}</p>
                <p className="tabular font-medium">{rcIvaDevengado(rcPreview).toFixed(2)} €</p>
              </div>
              <div className="text-sm">
                <p className="text-xs text-muted">{te.rcDeducible}</p>
                <p className="tabular font-medium">{rcIvaDeducible(rcPreview).toFixed(2)} €</p>
              </div>
            </div>
          ) : null}
          {rc && d.paisProveedor === "ES" ? <p className="mt-2 text-xs text-danger">{te.rcSpain}</p> : null}
          {rc && d.paisProveedor === "UE" ? <p className="mt-2 text-xs text-muted">{te.rc349}</p> : null}
        </div>
        <Field label={te.invoiceNo}>
          <Input value={d.invoiceNo} onChange={(e) => setD({ ...d, invoiceNo: e.target.value })} />
        </Field>
        <Field label={te.concept}>
          <Input value={d.concept} onChange={(e) => setD({ ...d, concept: e.target.value })} />
        </Field>
        <Field label={te.base}>
          <Input inputMode="decimal" value={base} onChange={(e) => { setBase(e.target.value); recompute(e.target.value, d.ivaRate); }} />
        </Field>
        <Field label={te.ivaRate}>
          <Select
            disabled={rc}
            value={rc ? "0" : d.ivaRate}
            onChange={(e) => {
              const ivaRate = e.target.value as IvaRate;
              const zero = ivaRate === "0" || ivaRate === "exento";
              setD({ ...d, ivaRate, ivaDeductible: dedTouched ? d.ivaDeductible : !zero && !!d.supplierNif.trim() });
              setIvaTouched(false);
              recompute(base, ivaRate, false);
            }}
          >
            {IVA_RATES.map((r) => <option key={r} value={r}>{r === "exento" ? te.exento : `${r} %`}</option>)}
          </Select>
        </Field>
        <Field label={te.ivaAmount} hint={te.ivaAmountHint}>
          <Input
            inputMode="decimal"
            disabled={rc}
            value={rc ? "0" : iva}
            onChange={(e) => {
              setIva(e.target.value);
              setIvaTouched(true);
              const b = parseNum(base);
              setTotal(b ? String(round2(b + parseNum(e.target.value))) : "");
            }}
          />
        </Field>
        <Field label={te.total}>
          <Input inputMode="decimal" disabled={rc} value={total} onChange={(e) => setTotal(e.target.value)} />
        </Field>
        <Field label={te.affect} hint={te.affectHint}>
          <Input
            type="number" min={0} max={100} step={1}
            value={d.affectPct}
            onChange={(e) => setD({ ...d, affectPct: Number(e.target.value) })}
          />
        </Field>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={d.ivaDeductible}
              onChange={(e) => { setDedTouched(true); setD({ ...d, ivaDeductible: e.target.checked }); }}
            />
            {te.ivaDed}
          </label>
          <p className="mt-1 text-xs leading-relaxed text-muted">{rc ? te.rcDedHint : te.ivaDedHint}</p>
          {noNif ? <p className="mt-1 text-xs text-danger">{te.ivaDedNoNif}</p> : null}
        </div>
      </div>
      {d.category === "equipos" ? <p className="mt-3 text-xs text-muted">{te.equiposHint}</p> : null}
      {d.category === "cuota_autonomo" ? <p className="mt-3 text-xs text-muted">{te.cuotaHint}</p> : null}

      <div className="mt-4">
        <span className="text-sm font-medium">{te.file}</span>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {d.file ? (
            <>
              <a href={fileUrl(d.file)} target="_blank" rel="noreferrer" className="break-all text-sm text-olive underline">
                {d.file.name} ({Math.max(1, Math.round(d.file.size / 1024))} KB)
              </a>
              <button type="button" className="text-xs text-danger" disabled={busy} onClick={() => setD({ ...d, file: null })}>
                {te.remove}
              </button>
            </>
          ) : null}
          <Button type="button" variant="ghost" className="!px-3 !py-1.5" disabled={busy} onClick={() => fileInput.current?.click()}>
            {busy ? te.uploading : d.file ? te.replace : te.attach}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept={PROOF_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void pick(f);
            }}
          />
        </div>
        <p className="mt-1 text-xs text-muted">{te.fileHint}</p>
        {fileErr ? <p className="mt-1 text-sm text-danger">{fileErr}</p> : null}
      </div>

      <div className="mt-4">
        <Field label={te.notes} optional>
          <Textarea value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />
        </Field>
      </div>

      {err ? <p className="mt-3 text-sm text-danger">{err}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={save} disabled={busy}>{te.save}</Button>
        <Button variant="ghost" onClick={() => {
          cleanupUnsaved(initial.file?.id ?? null);
          if (ownsInitialFile && initial.file) void deleteProofFile(initial.file.id);
          onCancel();
        }}>{te.cancel}</Button>
        {!isNew ? (
          <Button variant="danger" className="ml-auto" onClick={() => onDelete(initial)}>{te.delete}</Button>
        ) : null}
      </div>
    </section>
  );
}
