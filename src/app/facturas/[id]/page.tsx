"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { InvoicePaper } from "@/components/InvoicePaper";
import { Button, Empty, Field, Input, Select, StatusBadge, Textarea } from "@/components/ui";
import { useStore } from "@/lib/store";
import {
  formatEur,
  formatDate,
  invoiceBase,
  invoiceTotal,
  isoDate,
  uid,
} from "@/lib/format";
import { displayStatus, emitBlockers } from "@/lib/tax";
import type { CryptoPayment, LineItem } from "@/lib/types";
import { CRYPTO_ASSETS, NETWORKS } from "@/lib/types";

export default function FacturaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    invoices,
    clients,
    settings,
    upsertInvoice,
    emitInvoice,
    recordPayment,
    duplicateInvoice,
    deleteInvoice,
  } = useStore();
  const router = useRouter();
  const inv = invoices.find((x) => x.id === id);
  const client = clients.find((c) => c.id === inv?.clientId);
  const today = isoDate();
  const [payOpen, setPayOpen] = useState(false);
  const [msg, setMsg] = useState("");

  if (!inv) {
    return <Empty title="Factura introuvable" body="Elle n’est plus dans ce navigateur." />;
  }

  const status = displayStatus(inv, today);
  const locked = inv.status !== "brouillon";
  const blockers = emitBlockers({
    nombre: settings.nombre,
    nif: settings.nif,
    direccion: settings.direccion,
    clientBrand: client?.brand ?? "",
    clientCountry: client?.country ?? "",
    items: inv.items,
    issueDate: inv.issueDate,
  });

  function patch(p: Partial<typeof inv>) {
    if (locked) return;
    upsertInvoice({ ...inv!, ...p, updatedAt: isoDate() });
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-terracotta">Factura</p>
          <h1 className="font-display text-3xl tabular">{inv.number ?? "Brouillon"}</h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={status} />
            <span className="text-sm text-muted">{client?.brand}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/facturas/${inv.id}/imprimer`}>
            <Button variant="secondary">PDF / imprimer</Button>
          </Link>
          {!locked ? (
            <Button
              onClick={() => {
                const r = emitInvoice(inv.id);
                setMsg(r.ok ? `Émise : ${r.number}` : r.error);
              }}
              disabled={blockers.length > 0}
            >
              Émettre
            </Button>
          ) : inv.status !== "cobrada" ? (
            <Button onClick={() => setPayOpen(true)}>Enregistrer un cobro</Button>
          ) : null}
        </div>
      </div>

      {msg ? <p className="mb-3 text-sm text-olive">{msg}</p> : null}
      {!locked && blockers.length > 0 ? (
        <div className="mb-4 rounded-xl border border-line bg-paper-2 px-3 py-2 text-xs text-ink-soft">
          Émission bloquée tant que le document n’est pas complet :
          <ul className="list-disc ml-4 mt-1">
            {blockers.map((b) => (
              <li key={b.field}>{b.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Field label="Client" required>
            <Select
              disabled={locked}
              value={inv.clientId}
              onChange={(e) => patch({ clientId: e.target.value })}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date d’émission" required>
              <Input
                type="date"
                disabled={locked}
                value={inv.issueDate}
                onChange={(e) => patch({ issueDate: e.target.value })}
              />
            </Field>
            <Field label="Échéance" optional>
              <Input
                type="date"
                disabled={locked}
                value={inv.dueDate}
                onChange={(e) => patch({ dueDate: e.target.value })}
              />
            </Field>
          </div>
          {inv.items.map((it, i) => (
            <LineEditor
              key={it.id}
              index={i}
              item={it}
              locked={locked}
              onChange={(next) =>
                patch({ items: inv.items.map((x) => (x.id === it.id ? next : x)) })
              }
              onRemove={() => patch({ items: inv.items.filter((x) => x.id !== it.id) })}
            />
          ))}
          {!locked ? (
            <button
              type="button"
              className="text-sm text-olive underline"
              onClick={() =>
                patch({
                  items: [...inv.items, { id: uid("li"), description: "", quantity: 1, unitPriceEur: 0 }],
                })
              }
            >
              + ligne
            </button>
          ) : null}
          <Field label="IRPF %" optional>
            <Input
              type="number"
              disabled={locked}
              min={0}
              value={inv.irpfRate}
              onChange={(e) => patch({ irpfRate: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Notes" optional>
            <Textarea
              disabled={locked}
              value={inv.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </Field>
        </div>

        <aside className="space-y-4">
          <div className="paper-card rounded-2xl p-4 text-sm">
            <p className="text-muted">Base imponible</p>
            <p className="font-display text-2xl tabular">{formatEur(invoiceBase(inv.items))}</p>
            <p className="mt-2">IVA {formatEur(0)}</p>
            <p className="font-medium mt-1">Total {formatEur(invoiceTotal(invoiceBase(inv.items), inv.irpfRate))}</p>
          </div>
          {inv.payment ? (
            <div className="paper-card rounded-2xl p-4 text-sm space-y-1">
              <p className="text-[11px] uppercase tracking-wide text-terracotta">Cobro</p>
              <p>
                {inv.payment.amount} {inv.payment.asset} = {formatEur(inv.payment.eurEquivalent)}
              </p>
              <p className="text-muted">
                Taux {formatEur(inv.payment.rate)} / {inv.payment.asset} · {formatDate(inv.payment.rateDate)}
              </p>
              <p className="text-muted">{inv.payment.rateSource}</p>
              {inv.cobroDate ? <p>Fecha de cobro {formatDate(inv.cobroDate)}</p> : null}
            </div>
          ) : null}
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              const copy = duplicateInvoice(inv.id);
              if (copy) router.push(`/facturas/${copy.id}`);
            }}
          >
            Dupliquer en brouillon
          </Button>
          {!locked ? (
            <Button
              variant="danger"
              className="w-full"
              onClick={() => {
                if (!confirm("Supprimer ce brouillon ?")) return;
                deleteInvoice(inv.id);
                router.push("/facturas");
              }}
            >
              Supprimer le brouillon
            </Button>
          ) : null}
        </aside>
      </div>

      {payOpen ? (
        <PaymentModal
          defaultAsset={settings.defaultAsset}
          wallets={settings.wallets}
          expectedEur={invoiceTotal(invoiceBase(inv.items), inv.irpfRate)}
          onClose={() => setPayOpen(false)}
          onSave={(payment, cobroDate) => {
            const r = recordPayment(inv.id, payment, cobroDate);
            if (!r.ok) setMsg(r.error);
            else {
              setPayOpen(false);
              setMsg("Marquée cobrada.");
            }
          }}
        />
      ) : null}

      <div className="mt-10 overflow-auto rounded-2xl border border-line">
        <InvoicePaper invoice={inv} client={client} settings={settings} />
      </div>
    </div>
  );
}

function LineEditor({
  item,
  index,
  locked,
  onChange,
  onRemove,
}: {
  item: LineItem;
  index: number;
  locked: boolean;
  onChange: (i: LineItem) => void;
  onRemove: () => void;
}) {
  return (
    <div className="paper-card rounded-2xl p-3 space-y-2">
      <Field label={`Ligne ${index + 1}`} required>
        <Textarea
          disabled={locked}
          rows={2}
          value={item.description}
          onChange={(e) => onChange({ ...item, description: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Qté">
          <Input
            type="number"
            disabled={locked}
            value={item.quantity}
            onChange={(e) => onChange({ ...item, quantity: Number(e.target.value) })}
          />
        </Field>
        <Field label="EUR">
          <Input
            type="number"
            disabled={locked}
            value={item.unitPriceEur}
            onChange={(e) => onChange({ ...item, unitPriceEur: Number(e.target.value) })}
          />
        </Field>
      </div>
      {!locked ? (
        <button type="button" className="text-xs text-danger" onClick={onRemove}>
          Retirer
        </button>
      ) : null}
    </div>
  );
}

function PaymentModal({
  defaultAsset,
  wallets,
  expectedEur,
  onClose,
  onSave,
}: {
  defaultAsset: string;
  wallets: { id: string; label: string; asset: string; network: string; address: string }[];
  expectedEur: number;
  onClose: () => void;
  onSave: (p: CryptoPayment, cobroDate: string) => void;
}) {
  const [asset, setAsset] = useState(defaultAsset || "USDT");
  const [amount, setAmount] = useState(expectedEur);
  const [eur, setEur] = useState(expectedEur);
  const [rateDate, setRateDate] = useState(isoDate());
  const [rateSource, setRateSource] = useState("Manuel");
  const [txHash, setTxHash] = useState("");
  const [network, setNetwork] = useState(NETWORKS[asset]?.[0] ?? "");
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? "");
  const [cobroDate, setCobroDate] = useState(isoDate());
  const [err, setErr] = useState("");
  const wallet = wallets.find((w) => w.id === walletId);
  const rate = amount > 0 ? eur / amount : 0;

  return (
    <div className="fixed inset-0 z-40 grid place-items-end md:place-items-center bg-ink/40 p-0 md:p-4">
      <div className="paper-card w-full max-w-md rounded-t-2xl md:rounded-2xl p-5 max-h-[92dvh] overflow-auto">
        <h2 className="font-display text-xl">Encaissement crypto</h2>
        <p className="text-xs text-muted mt-1 mb-4">
          L’équivalent EUR est obligatoire (fecha de cobro). Pas de cours auto : tu saisis le taux.
        </p>
        <div className="space-y-3">
          <Field label="Actif" required>
            <Select
              value={asset}
              onChange={(e) => {
                setAsset(e.target.value);
                setNetwork(NETWORKS[e.target.value]?.[0] ?? "");
              }}
            >
              {CRYPTO_ASSETS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={`Montant ${asset}`} required>
              <Input type="number" step="any" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </Field>
            <Field label="Équivalent EUR" required hint="Requis pour marquer cobrada.">
              <Input type="number" step="0.01" value={eur} onChange={(e) => setEur(Number(e.target.value))} />
            </Field>
          </div>
          <p className="text-xs text-muted tabular">
            Taux implicite : 1 {asset} = {formatEur(rate)}
          </p>
          <Field label="Date du taux" required>
            <Input type="date" value={rateDate} onChange={(e) => setRateDate(e.target.value)} />
          </Field>
          <Field label="Source du taux" optional hint="Ex. Binance, capture d’écran, banque…">
            <Input value={rateSource} onChange={(e) => setRateSource(e.target.value)} />
          </Field>
          <Field label="Fecha de cobro" required>
            <Input type="date" value={cobroDate} onChange={(e) => setCobroDate(e.target.value)} />
          </Field>
          <Field label="Réseau" optional>
            <Select value={network} onChange={(e) => setNetwork(e.target.value)}>
              {(NETWORKS[asset] ?? ["Autre"]).map((n) => (
                <option key={n}>{n}</option>
              ))}
            </Select>
          </Field>
          <Field label="Portefeuille" optional>
            <Select value={walletId} onChange={(e) => setWalletId(e.target.value)}>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label || w.asset} · {w.network}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Hash de transaction" optional>
            <Input value={txHash} onChange={(e) => setTxHash(e.target.value)} />
          </Field>
        </div>
        {err ? <p className="mt-2 text-sm text-danger">{err}</p> : null}
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={() => {
              if (!eur || eur <= 0) {
                setErr("Saisis l’équivalent EUR.");
                return;
              }
              if (!amount || amount <= 0) {
                setErr("Saisis le montant crypto.");
                return;
              }
              onSave(
                {
                  asset,
                  amount,
                  eurEquivalent: eur,
                  rate,
                  rateDate,
                  rateSource,
                  txHash,
                  network,
                  walletId,
                  walletAddress: wallet?.address ?? "",
                },
                cobroDate,
              );
            }}
          >
            Marquer cobrada
          </Button>
        </div>
      </div>
    </div>
  );
}
