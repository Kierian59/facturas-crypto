"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { useStore } from "@/lib/store";
import { addDays, formatEur, invoiceBase, invoiceTotal, isoDate, uid } from "@/lib/format";
import { emitBlockers } from "@/lib/tax";
import type { Invoice, LineItem } from "@/lib/types";

export default function NouvelleFacturaPage() {
  return (
    <Suspense fallback={<p className="text-muted text-sm">Préparation…</p>}>
      <GuidedCreate />
    </Suspense>
  );
}

function GuidedCreate() {
  const { clients, settings, upsertInvoice, emitInvoice } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const [clientId, setClientId] = useState(params.get("client") ?? clients[0]?.id ?? "");
  const [items, setItems] = useState<LineItem[]>([
    { id: uid("li"), description: "", quantity: 1, unitPriceEur: 0 },
  ]);
  const [issueDate, setIssueDate] = useState(isoDate());
  const [dueDate, setDueDate] = useState(addDays(isoDate(), 14));
  const [notes, setNotes] = useState("");
  const [irpfRate, setIrpfRate] = useState(0);
  const [error, setError] = useState("");

  const client = clients.find((c) => c.id === clientId);
  const base = invoiceBase(items);
  const total = invoiceTotal(base, irpfRate);

  const blockers = useMemo(
    () =>
      emitBlockers({
        nombre: settings.nombre,
        nif: settings.nif,
        direccion: settings.direccion,
        clientBrand: client?.brand ?? "",
        clientCountry: client?.country ?? "",
        items,
        issueDate,
      }),
    [settings, client, items, issueDate],
  );

  function saveDraft(): string {
    const id = uid("inv");
    const inv: Invoice = {
      id,
      number: null,
      status: "brouillon",
      clientId,
      issueDate,
      dueDate,
      cobroDate: "",
      items: items.filter((i) => i.description.trim()),
      notes,
      irpfRate,
      payment: null,
      createdAt: isoDate(),
      updatedAt: isoDate(),
    };
    upsertInvoice(inv);
    return id;
  }

  function persistDraft() {
    if (!clientId) {
      setError("Choisis un client, ou crée-en un.");
      return;
    }
    const id = saveDraft();
    router.push(`/facturas/${id}`);
  }

  function persistAndEmit() {
    if (blockers.length) {
      setError(blockers[0].message);
      return;
    }
    const id = saveDraft();
    const r = emitInvoice(id);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.push(`/facturas/${id}`);
  }

  return (
    <div className="max-w-lg">
      <p className="text-[11px] uppercase tracking-[0.18em] text-terracotta">Nouvelle factura</p>
      <h1 className="font-display text-3xl mt-1">Guidé, en 4 temps</h1>
      <ol className="mt-3 flex gap-2 text-[11px] uppercase tracking-wide text-muted">
        {["Client", "Prestations", "Dates", "Revue"].map((l, i) => (
          <li key={l} className={i === step ? "text-terracotta" : ""}>
            {i + 1}. {l}
          </li>
        ))}
      </ol>

      <div className="mt-6 space-y-4">
        {step === 0 && (
          <>
            <Field
              label="Cliente"
              required
              hint="Marque hors UE : IVA no sujeta. Le brouillon peut attendre si le carnet est vide."
            >
              {clients.length === 0 ? (
                <p className="text-sm">
                  Pas encore de client.{" "}
                  <Link href="/clients/nouveau" className="text-terracotta underline">
                    Ajouter une marca
                  </Link>
                </p>
              ) : (
                <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.brand} · {c.country}
                      {c.horsUE ? "" : " (UE)"}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {client && !client.horsUE ? (
              <p className="text-xs text-warn">
                Ce client est marqué UE. v1 ne calcule pas l’IVA intra-communautaire.
              </p>
            ) : null}
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm text-muted">
              Tous les montants sont en <strong>EUR</strong> (devise de la factura). La crypto vient
              au cobro.
            </p>
            {items.map((it, i) => (
              <div key={it.id} className="paper-card rounded-2xl p-3 space-y-2">
                <Field label={`Ligne ${i + 1}`} required hint="Décris le service (posts, UGC, forfait mois…).">
                  <Textarea
                    rows={2}
                    value={it.description}
                    onChange={(e) =>
                      setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, description: e.target.value } : x)))
                    }
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Quantité" required>
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
                  <Field label="Prix unitaire EUR" required>
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
              + ligne
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Date d’émission" required hint="Fecha de la factura. Le cobro se saisit plus tard.">
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </Field>
            <Field label="Échéance" optional hint="Utile pour le tableau « en retard ».">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
            <Field
              label="Retención IRPF %"
              optional
              hint="Par défaut 0 : un client hors Espagne ne retient généralement pas. Laisse 0."
            >
              <Input
                type="number"
                min={0}
                step="0.01"
                value={irpfRate}
                onChange={(e) => setIrpfRate(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Note interne / mention" optional>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </>
        )}

        {step === 3 && (
          <div className="paper-card rounded-2xl p-4 text-sm space-y-2">
            <p>
              <span className="text-muted">Cliente</span> {client?.brand ?? "—"}
            </p>
            <p>
              <span className="text-muted">Base imponible</span> {formatEur(base)}
            </p>
            <p>
              <span className="text-muted">IVA</span> {formatEur(0)}{" "}
              {client?.horsUE !== false ? "· no sujeta (art. 69.Uno.1º)" : ""}
            </p>
            <p className="font-medium">Total {formatEur(total)}</p>
            {blockers.length ? (
              <ul className="mt-3 text-danger text-xs space-y-1">
                {blockers.map((b) => (
                  <li key={b.field}>{b.message}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-olive">
                Prêt à émettre : un numéro {settings.seriesPrefix}
                {String(settings.nextSeq).padStart(4, "0")} sera attribué, sans revenir en arrière.
              </p>
            )}
          </div>
        )}
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
            Retour
          </Button>
        ) : null}
        {step < 3 ? (
          <Button onClick={() => setStep((s) => s + 1)}>Continuer</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={persistDraft}>
              Garder en brouillon
            </Button>
            <Button onClick={persistAndEmit} disabled={blockers.length > 0}>
              Émettre
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
