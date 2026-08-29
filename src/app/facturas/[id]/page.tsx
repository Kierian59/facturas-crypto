"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { InvoicePaper } from "@/components/InvoicePaper";
import { Button, Empty, Field, Input, Select, StatusBadge, Textarea } from "@/components/ui";
import { useStore, useT } from "@/lib/store";
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
import { AEAT_LINKS, aeatCotejoUrl, invoiceTotalEur } from "@/lib/aeat";
import type { Dict } from "@/lib/i18n";

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
  const t = useT();
  const router = useRouter();
  const inv = invoices.find((x) => x.id === id);
  const client = clients.find((c) => c.id === inv?.clientId);
  const today = isoDate();
  const [payOpen, setPayOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const locale = settings.locale;

  if (!inv) {
    return <Empty title={t.facturas.notFound} body={t.facturas.notFoundBody} />;
  }

  const status = displayStatus(inv, today);
  const locked = inv.status !== "brouillon";
  const blockers = emitBlockers({
    nombre: settings.nombre,
    nif: settings.nif,
    direccion: settings.direccion,
    clientBrand: client?.brand ?? "",
    clientCountry: client?.country ?? "",
    clientAddress: client?.address ?? "",
    items: inv.items,
    issueDate: inv.issueDate,
    locale,
  });
  const cotejo =
    inv.number && locked
      ? aeatCotejoUrl({
          nif: settings.nif,
          numserie: inv.number,
          issueDate: inv.issueDate,
          total: invoiceTotalEur(inv),
        })
      : null;

  function patch(p: Partial<typeof inv>) {
    if (locked) return;
    upsertInvoice({ ...inv!, ...p, updatedAt: isoDate() });
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMsg(t.aeat.copied);
    } catch {
      setMsg(t.aeat.copyFail);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-terracotta">{t.facturas.title}</p>
          <h1 className="font-display text-3xl tabular">{inv.number ?? t.facturas.draft}</h1>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={status} />
            <span className="text-sm text-muted">{client?.brand}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/facturas/${inv.id}/imprimer`}>
            <Button variant="secondary">{t.facturas.pdf}</Button>
          </Link>
          {!locked ? (
            <Button
              onClick={async () => {
                const r = await emitInvoice(inv.id);
                setMsg(r.ok ? t.facturas.emitted(r.number) : r.error);
              }}
              disabled={blockers.length > 0}
            >
              {t.facturas.emit}
            </Button>
          ) : inv.status !== "cobrada" ? (
            <Button onClick={() => setPayOpen(true)}>{t.facturas.recordCobro}</Button>
          ) : null}
        </div>
      </div>

      {msg ? <p className="mb-3 text-sm text-olive">{msg}</p> : null}
      {!locked && blockers.length > 0 ? (
        <div className="mb-4 rounded-xl border border-line bg-paper-2 px-3 py-2 text-xs text-ink-soft">
          {t.facturas.emitBlocked}
          <ul className="list-disc ml-4 mt-1">
            {blockers.map((b) => (
              <li key={b.field}>{b.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {cotejo ? (
        <div className="mb-4 paper-card rounded-2xl p-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            <a href={cotejo} target="_blank" rel="noreferrer">
              <Button type="button">{t.aeat.verify}</Button>
            </a>
            <a href={AEAT_LINKS.facturacionApp} target="_blank" rel="noreferrer">
              <Button type="button" variant="secondary">{t.aeat.register}</Button>
            </a>
            <Button variant="ghost" type="button" onClick={() => void copyLink(cotejo)}>
              {t.aeat.copyLink}
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted">{t.aeat.registerHint}</p>
          <p className="text-xs leading-relaxed text-muted">{t.aeat.disclaimer}</p>
          {inv.huella ? (
            <p className="text-[11px] break-all text-muted">
              {t.aeat.huella}: {inv.huella}
              <span className="block mt-0.5">{t.aeat.huellaHint}</span>
            </p>
          ) : null}
        </div>
      ) : !locked ? (
        <p className="mb-4 text-xs text-muted">{t.aeat.draftQr}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Field label={t.facturas.client} required>
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
            <Field label={t.facturas.issueDate} required>
              <Input
                type="date"
                disabled={locked}
                value={inv.issueDate}
                onChange={(e) => patch({ issueDate: e.target.value })}
              />
            </Field>
            <Field label={t.facturas.dueDate} optional>
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
              t={t}
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
              {t.facturas.addLine}
            </button>
          ) : null}
          <Field label={t.facturas.irpf} optional>
            <Input
              type="number"
              disabled={locked}
              min={0}
              value={inv.irpfRate}
              onChange={(e) => patch({ irpfRate: Number(e.target.value) || 0 })}
            />
          </Field>
          <Field label={t.clients.notes} optional>
            <Textarea
              disabled={locked}
              value={inv.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </Field>
        </div>

        <aside className="space-y-4">
          <div className="paper-card rounded-2xl p-4 text-sm">
            <p className="text-muted">{t.facturas.base}</p>
            <p className="font-display text-2xl tabular">{formatEur(invoiceBase(inv.items), locale)}</p>
            <p className="mt-2">{t.facturas.iva} {formatEur(0, locale)}</p>
            <p className="font-medium mt-1">{t.facturas.total} {formatEur(invoiceTotal(invoiceBase(inv.items), inv.irpfRate), locale)}</p>
          </div>
          {inv.payment ? (
            <div className="paper-card rounded-2xl p-4 text-sm space-y-1">
              <p className="text-[11px] uppercase tracking-wide text-terracotta">{t.facturas.cobro}</p>
              <p>
                {inv.payment.amount} {inv.payment.asset} = {formatEur(inv.payment.eurEquivalent, locale)}
              </p>
              <p className="text-muted">
                {t.facturas.rate} {formatEur(inv.payment.rate, locale)} / {inv.payment.asset} · {formatDate(inv.payment.rateDate)}
              </p>
              <p className="text-muted">{inv.payment.rateSource}</p>
              {inv.cobroDate ? <p>{t.pay.cobroDate} {formatDate(inv.cobroDate)}</p> : null}
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
            {t.facturas.duplicate}
          </Button>
          {!locked ? (
            <Button
              variant="danger"
              className="w-full"
              onClick={() => {
                if (!confirm(t.facturas.confirmDelete)) return;
                deleteInvoice(inv.id);
                router.push("/facturas");
              }}
            >
              {t.facturas.deleteDraft}
            </Button>
          ) : null}
        </aside>
      </div>

      {payOpen ? (
        <PaymentModal
          defaultAsset={settings.defaultAsset}
          wallets={settings.wallets}
          expectedEur={invoiceTotal(invoiceBase(inv.items), inv.irpfRate)}
          locale={locale}
          t={t}
          onClose={() => setPayOpen(false)}
          onSave={(payment, cobroDate) => {
            const r = recordPayment(inv.id, payment, cobroDate);
            if (!r.ok) setMsg(r.error);
            else {
              setPayOpen(false);
              setMsg(t.facturas.markedCobrada);
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
  t,
  onChange,
  onRemove,
}: {
  item: LineItem;
  index: number;
  locked: boolean;
  t: Dict;
  onChange: (i: LineItem) => void;
  onRemove: () => void;
}) {
  return (
    <div className="paper-card rounded-2xl p-3 space-y-2">
      <Field label={t.facturas.line(index + 1)} required>
        <Textarea
          disabled={locked}
          rows={2}
          value={item.description}
          onChange={(e) => onChange({ ...item, description: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t.facturas.qty}>
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
          {t.facturas.remove}
        </button>
      ) : null}
    </div>
  );
}

function PaymentModal({
  defaultAsset,
  wallets,
  expectedEur,
  locale,
  t,
  onClose,
  onSave,
}: {
  defaultAsset: string;
  wallets: { id: string; label: string; asset: string; network: string; address: string }[];
  expectedEur: number;
  locale: "fr" | "es";
  t: Dict;
  onClose: () => void;
  onSave: (p: CryptoPayment, cobroDate: string) => void;
}) {
  const [asset, setAsset] = useState(defaultAsset || "USDT");
  const [amount, setAmount] = useState(expectedEur);
  const [eur, setEur] = useState(expectedEur);
  const [rateDate, setRateDate] = useState(isoDate());
  const [rateSource, setRateSource] = useState(t.pay.rateManual);
  const [txHash, setTxHash] = useState("");
  const [network, setNetwork] = useState(NETWORKS[asset]?.[0] ?? "");
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? "");
  const [cobroDate, setCobroDate] = useState(isoDate());
  const [err, setErr] = useState("");
  const wallet = wallets.find((w) => w.id === walletId);
  const rate = amount > 0 ? eur / amount : 0;

  function netLabel(n: string) {
    return n === "Autre" ? t.networkOther : n;
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-end md:place-items-center bg-ink/40 p-0 md:p-4">
      <div className="paper-card w-full max-w-md rounded-t-2xl md:rounded-2xl p-5 max-h-[92dvh] overflow-auto">
        <h2 className="font-display text-xl">{t.pay.title}</h2>
        <p className="text-xs text-muted mt-1 mb-4">{t.pay.intro}</p>
        <div className="space-y-3">
          <Field label={t.pay.asset} required>
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
            <Field label={t.pay.amount(asset)} required>
              <Input type="number" step="any" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </Field>
            <Field label={t.pay.eurEq} required hint={t.pay.eurHint}>
              <Input type="number" step="0.01" value={eur} onChange={(e) => setEur(Number(e.target.value))} />
            </Field>
          </div>
          <p className="text-xs text-muted tabular">
            {t.pay.implied(asset, formatEur(rate, locale))}
          </p>
          <Field label={t.pay.rateDate} required>
            <Input type="date" value={rateDate} onChange={(e) => setRateDate(e.target.value)} />
          </Field>
          <Field label={t.pay.rateSource} optional hint={t.pay.rateSourceHint}>
            <Input value={rateSource} onChange={(e) => setRateSource(e.target.value)} />
          </Field>
          <Field label={t.pay.cobroDate} required>
            <Input type="date" value={cobroDate} onChange={(e) => setCobroDate(e.target.value)} />
          </Field>
          <Field label={t.pay.network} optional>
            <Select value={network} onChange={(e) => setNetwork(e.target.value)}>
              {(NETWORKS[asset] ?? ["Autre"]).map((n) => (
                <option key={n} value={n}>
                  {netLabel(n)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.pay.wallet} optional>
            <Select value={walletId} onChange={(e) => setWalletId(e.target.value)}>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label || w.asset} · {netLabel(w.network)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t.pay.txHash} optional>
            <Input value={txHash} onChange={(e) => setTxHash(e.target.value)} />
          </Field>
        </div>
        {err ? <p className="mt-2 text-sm text-danger">{err}</p> : null}
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t.pay.cancel}
          </Button>
          <Button
            onClick={() => {
              if (!eur || eur <= 0) {
                setErr(t.errors.eurAmount);
                return;
              }
              if (!amount || amount <= 0) {
                setErr(t.errors.cryptoAmount);
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
            {t.pay.mark}
          </Button>
        </div>
      </div>
    </div>
  );
}
