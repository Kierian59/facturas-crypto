"use client";

import { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { useStore, useT } from "@/lib/store";
import { addDays, formatEur, invoiceBase, invoiceTotal, isoDate, uid } from "@/lib/format";
import { emitBlockers } from "@/lib/tax";
import type { Invoice, LineItem } from "@/lib/types";

export default function NouvelleFacturaPage() {
  const t = useT();
  return (
    <Suspense fallback={<p className="text-muted text-sm">{t.facturas.preparing}</p>}>
      <GuidedCreate />
    </Suspense>
  );
}

function GuidedCreate() {
  const { clients, settings, upsertInvoice, emitInvoice } = useStore();
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const [clientId, setClientId] = useState(params.get("client") ?? clients[0]?.id ?? "");
  const [items, setItems] = useState<LineItem[]>([
    { id: uid("li"), description: "", quantity: 1, unitPriceEur: 0 },
  ]);
  const [issueDate, setIssueDate] = useState(isoDate());
  const [serviceDate, setServiceDate] = useState(isoDate());
  const [dueDate, setDueDate] = useState(addDays(isoDate(), 14));
  const [notes, setNotes] = useState("");
  const [irpfRate, setIrpfRate] = useState(0);
  const [error, setError] = useState("");

  const client = clients.find((c) => c.id === clientId);
  const base = invoiceBase(items);
  const total = invoiceTotal(base, irpfRate);
  const locale = settings.locale;

  const blockers = useMemo(
    () =>
      emitBlockers({
        nombre: settings.nombre,
        nif: settings.nif,
        direccion: settings.direccion,
        clientBrand: client?.brand ?? "",
        clientCountry: client?.country ?? "",
        clientAddress: client?.address ?? "",
        items,
        issueDate,
        locale,
      }),
    [settings, client, items, issueDate, locale],
  );

  function saveDraft(): string {
    const id = uid("inv");
    const inv: Invoice = {
      id,
      number: null,
      status: "brouillon",
      clientId,
      issueDate,
      serviceDate: serviceDate || issueDate,
      dueDate,
      cobroDate: "",
      items: items.filter((i) => i.description.trim()),
      notes,
      irpfRate,
      payment: null,
      huella: "",
      createdAt: isoDate(),
      updatedAt: isoDate(),
    };
    upsertInvoice(inv);
    return id;
  }

  function persistDraft() {
    if (!clientId) {
      setError(t.errors.pickClient);
      return;
    }
    const id = saveDraft();
    router.push(`/facturas/${id}`);
  }

  async function persistAndEmit() {
    if (blockers.length) {
      setError(blockers[0].message);
      return;
    }
    const id = saveDraft();
    const r = await emitInvoice(id);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.push(`/facturas/${id}`);
  }

  return (
    <div className="max-w-lg">
      <p className="text-[11px] uppercase tracking-[0.18em] text-terracotta">{t.facturas.guidedKicker}</p>
      <h1 className="font-display text-3xl mt-1">{t.facturas.guidedTitle}</h1>
      <ol className="mt-3 flex gap-2 text-[11px] uppercase tracking-wide text-muted">
        {t.facturas.steps.map((l, i) => (
          <li key={l} className={i === step ? "text-terracotta" : ""}>
            {i + 1}. {l}
          </li>
        ))}
      </ol>

      <div className="mt-6 space-y-4">
        {step === 0 && (
          <>
            <Field label={t.facturas.client} required hint={t.facturas.clientHint}>
              {clients.length === 0 ? (
                <p className="text-sm">
                  {t.facturas.noClient}{" "}
                  <Link href="/clients/nouveau" className="text-terracotta underline">
                    {t.facturas.addBrand}
                  </Link>
                </p>
              ) : (
                <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.brand} · {c.country}
                      {c.horsUE ? "" : ` (${t.inUE})`}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {client && !client.horsUE ? (
              <p className="text-xs text-warn">{t.facturas.ueClientWarn}</p>
            ) : null}
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm text-muted">{t.facturas.amountsHint}</p>
            {items.map((it, i) => (
              <div key={it.id} className="paper-card rounded-2xl p-3 space-y-2">
                <Field label={t.facturas.line(i + 1)} required hint={t.facturas.lineHint}>
                  <Textarea
                    rows={2}
                    value={it.description}
                    onChange={(e) =>
                      setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, description: e.target.value } : x)))
                    }
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label={t.facturas.qty} required>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={it.quantity}
                      onChange={(e) =>
                        setItems((xs) =>
                          xs.map((x) => (x.id === it.id ? { ...x, quantity: Number(e.target.value) } : x)),
                        )
                      }
                    />
                  </Field>
                  <Field label={t.facturas.unitPrice} required>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={it.unitPriceEur}
                      onChange={(e) =>
                        setItems((xs) =>
                          xs.map((x) => (x.id === it.id ? { ...x, unitPriceEur: Number(e.target.value) } : x)),
                        )
                      }
                    />
                  </Field>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="text-sm text-olive underline"
              onClick={() =>
                setItems((xs) => [...xs, { id: uid("li"), description: "", quantity: 1, unitPriceEur: 0 }])
              }
            >
              {t.facturas.addLine}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <Field label={t.facturas.issueDate} required hint={t.facturas.issueHint}>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </Field>
            <Field label={t.facturas.serviceDate} optional hint={t.facturas.serviceHint}>
              <Input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
            </Field>
            <Field label={t.facturas.dueDate} optional hint={t.facturas.dueHint}>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
            <Field label={t.facturas.irpf} optional hint={t.facturas.irpfHint}>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={irpfRate}
                onChange={(e) => setIrpfRate(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label={t.facturas.note} optional>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </>
        )}

        {step === 3 && (
          <div className="paper-card rounded-2xl p-4 text-sm space-y-2">
            <p>
              <span className="text-muted">{t.facturas.client}</span> {client?.brand ?? "—"}
            </p>
            <p>
              <span className="text-muted">{t.facturas.base}</span> {formatEur(base, locale)}
            </p>
            <p>
              <span className="text-muted">{t.facturas.iva}</span> {formatEur(0, locale)}{" "}
              {client?.horsUE !== false ? t.facturas.noSujeta : ""}
            </p>
            <p className="font-medium">{t.facturas.total} {formatEur(total, locale)}</p>
            {blockers.length ? (
              <ul className="mt-3 text-danger text-xs space-y-1">
                {blockers.map((b) => (
                  <li key={b.field}>{b.message}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-olive">
                {t.facturas.ready(settings.seriesPrefix, String(settings.nextSeq).padStart(4, "0"))}
              </p>
            )}
          </div>
        )}
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
            {t.facturas.back}
          </Button>
        ) : null}
        {step < 3 ? (
          <Button onClick={() => setStep((s) => s + 1)}>{t.facturas.continue}</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={persistDraft}>
              {t.facturas.keepDraft}
            </Button>
            <Button onClick={() => void persistAndEmit()} disabled={blockers.length > 0}>
              {t.facturas.emit}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
