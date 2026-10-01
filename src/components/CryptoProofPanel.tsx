"use client";

import { useRef, useState } from "react";
import { AssetInput, Button, Field, Input, Select } from "@/components/ui";
import { useStore, useT } from "@/lib/store";
import { formatEur, isoDate } from "@/lib/format";
import { invoiceTotalEur } from "@/lib/aeat";
import {
  PROOF_ACCEPT,
  deleteProofFile,
  emptyProof,
  explorerUrl,
  fileUrl,
  formatDateTime,
  missingProofFields,
  normalizeDecimal,
  normalizeProof,
  proofState,
  safeUrl,
  uploadProofFile,
} from "@/lib/proof";
import { ALL_NETWORKS, cleanAsset, type CryptoProof, type Invoice, type ProofFileRef } from "@/lib/types";

/** Pastille « Justificatif complet / incomplet » (rien si aucune donnée, sauf `showNone`). */
export function ProofBadge({ invoice, showNone = false }: { invoice: Invoice; showNone?: boolean }) {
  const t = useT();
  const state = proofState(invoice.cryptoProof);
  if (state === "none" && !showNone) return null;
  const map = {
    complete: { label: t.proof.badgeComplete, cls: "bg-[#e7f0d8] text-[#3d5a2c]" },
    incomplete: { label: t.proof.badgeIncomplete, cls: "bg-[#f8ead0] text-[#8a5a12]" },
    none: { label: t.proof.badgeNone, cls: "bg-paper-2 text-muted" },
  }[state];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${map.cls}`}>
      {map.label}
    </span>
  );
}

function FileSlot({
  label,
  file,
  busy,
  error,
  onPick,
  onRemove,
}: {
  label: string;
  file: ProofFileRef | null;
  busy: boolean;
  error: string;
  onPick: (f: File) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {file ? (
          <>
            <a href={fileUrl(file)} target="_blank" rel="noreferrer" className="text-sm text-olive underline break-all">
              {file.name} ({Math.max(1, Math.round(file.size / 1024))} KB)
            </a>
            <button type="button" className="text-xs text-danger" onClick={onRemove} disabled={busy}>
              {t.proof.remove}
            </button>
          </>
        ) : null}
        <Button type="button" variant="ghost" className="!py-1.5 !px-3" disabled={busy} onClick={() => ref.current?.click()}>
          {busy ? t.proof.uploading : file ? t.proof.replace : t.proof.attach}
        </Button>
        <input
          ref={ref}
          type="file"
          accept={PROOF_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onPick(f);
          }}
        />
      </div>
      <p className="mt-1 text-xs text-muted">{t.proof.fileHint}</p>
      {error ? <p className="mt-1 text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export function CryptoProofPanel({ invoice }: { invoice: Invoice }) {
  const t = useT();
  const { settings, upsertInvoice } = useStore();
  const locale = settings.locale;
  const [draft, setDraft] = useState<CryptoProof>(() => {
    const saved = normalizeProof(invoice.cryptoProof);
    if (saved) return saved;
    const base = emptyProof(invoice);
    return { ...base, asset: base.asset || cleanAsset(settings.defaultAsset) };
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<"" | "tx" | "rate">("");
  const [fileErr, setFileErr] = useState<{ tx: string; rate: string }>({ tx: "", rate: "" });

  const set = (p: Partial<CryptoProof>) => {
    setDraft((d) => ({ ...d, ...p }));
    setMsg("");
  };

  function validate(d: CryptoProof): CryptoProof | null {
    const amount = normalizeDecimal(d.amount);
    const rate = normalizeDecimal(d.rate);
    if (amount === null || rate === null) {
      setErr(t.proof.errDecimal);
      return null;
    }
    if (d.rateUrl.trim() && !safeUrl(d.rateUrl)) {
      setErr(t.proof.errUrl);
      return null;
    }
    setErr("");
    return {
      ...d,
      txHash: d.txHash.trim(),
      toWallet: d.toWallet.trim(),
      fromWallet: d.fromWallet.trim(),
      amount,
      rate,
      asset: cleanAsset(d.asset),
      rateSource: d.rateSource.trim(),
      rateUrl: d.rateUrl.trim(),
      receivedTz: d.receivedAt ? d.receivedTz || Intl.DateTimeFormat().resolvedOptions().timeZone : "",
      updatedAt: isoDate(),
    };
  }

  function persist(d: CryptoProof) {
    upsertInvoice({ ...invoice, cryptoProof: d, updatedAt: isoDate() });
  }

  function save() {
    const v = validate(draft);
    if (!v) return;
    setDraft(v);
    persist(v);
    setMsg(t.proof.saved);
  }

  async function attach(kind: "tx" | "rate", file: File) {
    setBusy(kind);
    setFileErr((e) => ({ ...e, [kind]: "" }));
    const r = await uploadProofFile(invoice.id, file);
    setBusy("");
    if (!r.ok) {
      const m = r.error === "tooBig" ? t.proof.errTooBig : r.error === "type" ? t.proof.errType : t.proof.errFailed;
      setFileErr((e) => ({ ...e, [kind]: m }));
      return;
    }
    const key = kind === "tx" ? "txFile" : "rateFile";
    const old = draft[key];
    const next = { ...draft, [key]: r.ref };
    // Les champs déjà saisis sont conservés ; si invalides on ne sauvegarde que les pièces jointes.
    const v = validate(next) ?? next;
    setDraft(v);
    persist(v);
    if (old) void deleteProofFile(old.id);
  }

  function removeFile(kind: "tx" | "rate") {
    const key = kind === "tx" ? "txFile" : "rateFile";
    const old = draft[key];
    const next = { ...draft, [key]: null };
    setDraft(next);
    persist(validate(next) ?? next);
    if (old) void deleteProofFile(old.id);
  }

  const savedProof = normalizeProof(invoice.cryptoProof);
  const missing = missingProofFields(savedProof);
  const state = proofState(savedProof);
  const explorer = explorerUrl(draft.network, draft.txHash);
  const rateLink = safeUrl(draft.rateUrl);

  function summaryText(): string {
    const d = savedProof ?? draft;
    const none = t.proof.summaryNone;
    const v = (x: string) => x.trim() || none;
    const url = explorerUrl(d.network, d.txHash);
    const lines = [
      t.proof.summaryTitle(invoice.number ?? "—"),
      "",
      `${t.proof.summaryInvoice}: ${invoice.number ?? "—"}`,
      `${t.proof.summaryTotal}: ${formatEur(invoiceTotalEur(invoice), locale)}`,
      "",
      `## ${t.proof.sectionTx}`,
      `${t.proof.txHash}: ${v(d.txHash)}`,
      `${t.proof.network}: ${v(d.network)}${url ? ` — ${url}` : ""}`,
      `${t.proof.toWallet}: ${v(d.toWallet)}`,
      `${t.proof.fromWallet}: ${v(d.fromWallet)}`,
      `${t.proof.amount}: ${d.amount.trim() ? `${d.amount} ${d.asset}` : none}`,
      `${t.proof.receivedAt}: ${formatDateTime(d.receivedAt, d.receivedTz)}`,
      `${t.proof.summaryAttached}: ${d.txFile ? d.txFile.name : none}`,
      "",
      `## ${t.proof.sectionRate}`,
      `${t.proof.rateSource}: ${v(d.rateSource)}`,
      `${t.proof.rate}: ${d.rate.trim() ? `${d.rate} EUR / ${d.asset}` : none}`,
      `${t.proof.rateDate}: ${v(d.rateDate)}`,
      `${t.proof.rateUrl}: ${v(d.rateUrl)}`,
      `${t.proof.summaryAttached}: ${d.rateFile ? d.rateFile.name : none}`,
    ];
    return lines.join("\n");
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summaryText());
      setMsg(t.proof.summaryCopied);
    } catch {
      setMsg(t.aeat.copyFail);
    }
  }

  function downloadSummary() {
    const blob = new Blob([summaryText()], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `justificante-crypto-${(invoice.number ?? invoice.id).replace(/[^\w-]/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="paper-card rounded-2xl p-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl">{t.proof.title}</h2>
          <ProofBadge invoice={invoice} showNone />
        </div>
        <p className="text-xs leading-relaxed text-muted">{t.proof.helper}</p>
        <p className="text-xs leading-relaxed text-muted">{t.proof.allOptional}</p>
        {state !== "complete" && missing.length > 0 && state === "incomplete" ? (
          <p className="text-xs text-ink-soft">
            {t.proof.missingTitle} {missing.map((m) => t.proof.missing[m]).join(", ")}.
          </p>
        ) : null}
        {state !== "none" && !savedProof?.txFile && !savedProof?.rateFile ? (
          <p className="text-xs text-muted">{t.proof.attachNote}</p>
        ) : null}
      </div>

      <section className="paper-card rounded-2xl p-4 space-y-3">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-terracotta">{t.proof.sectionTx}</h3>
        <Field label={t.proof.txHash} optional hint={t.proof.txHashHint}>
          <Input value={draft.txHash} onChange={(e) => set({ txHash: e.target.value })} spellCheck={false} autoComplete="off" />
        </Field>
        <Field label={t.proof.network} optional hint={t.proof.networkHint}>
          <>
            <Input
              list="proof-networks"
              value={draft.network}
              onChange={(e) => set({ network: e.target.value })}
              autoComplete="off"
            />
            <datalist id="proof-networks">
              {ALL_NETWORKS.filter((n) => n !== "Autre").map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </>
        </Field>
        {explorer ? (
          <a href={explorer} target="_blank" rel="noreferrer noopener" className="block text-sm text-olive underline break-all">
            {t.proof.explorer} ↗
          </a>
        ) : null}
        <Field label={t.proof.toWallet} optional>
          <Input value={draft.toWallet} onChange={(e) => set({ toWallet: e.target.value })} spellCheck={false} autoComplete="off" />
        </Field>
        <Field label={t.proof.fromWallet} optional>
          <Input value={draft.fromWallet} onChange={(e) => set({ fromWallet: e.target.value })} spellCheck={false} autoComplete="off" />
        </Field>
        <div className="grid grid-cols-[1fr_9rem] gap-2">
          <Field label={t.proof.amount} optional hint={t.proof.amountHint}>
            <Input
              inputMode="decimal"
              placeholder="0.000000"
              value={draft.amount}
              onChange={(e) => set({ amount: e.target.value })}
            />
          </Field>
          <Field label={t.proof.asset} optional>
            <AssetInput value={draft.asset} onChange={(e) => set({ asset: e.target.value })} />
          </Field>
        </div>
        <Field label={t.proof.receivedAt} optional hint={t.proof.receivedAtHint}>
          <Input
            type="datetime-local"
            value={draft.receivedAt}
            onChange={(e) =>
              set({ receivedAt: e.target.value, receivedTz: Intl.DateTimeFormat().resolvedOptions().timeZone })
            }
          />
        </Field>
        <FileSlot
          label={t.proof.txFile}
          file={draft.txFile}
          busy={busy === "tx"}
          error={fileErr.tx}
          onPick={(f) => void attach("tx", f)}
          onRemove={() => removeFile("tx")}
        />
      </section>

      <section className="paper-card rounded-2xl p-4 space-y-3">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-terracotta">{t.proof.sectionRate}</h3>
        <Field label={t.proof.rateSource} optional hint={t.proof.rateSourceHint}>
          <Input value={draft.rateSource} onChange={(e) => set({ rateSource: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t.proof.rate} optional>
            <Input inputMode="decimal" value={draft.rate} onChange={(e) => set({ rate: e.target.value })} />
          </Field>
          <Field label={t.proof.rateDate} optional>
            <Input type="date" value={draft.rateDate} onChange={(e) => set({ rateDate: e.target.value })} />
          </Field>
        </div>
        <Field label={t.proof.rateUrl} optional>
          <Input type="url" placeholder="https://" value={draft.rateUrl} onChange={(e) => set({ rateUrl: e.target.value })} />
        </Field>
        {rateLink ? (
          <a href={rateLink} target="_blank" rel="noreferrer noopener" className="block text-sm text-olive underline break-all">
            {rateLink} ↗
          </a>
        ) : null}
        <FileSlot
          label={t.proof.rateFile}
          file={draft.rateFile}
          busy={busy === "rate"}
          error={fileErr.rate}
          onPick={(f) => void attach("rate", f)}
          onRemove={() => removeFile("rate")}
        />
      </section>

      {err ? <p className="text-sm text-danger">{err}</p> : null}
      {msg ? <p className="text-sm text-olive">{msg}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save}>
          {t.proof.save}
        </Button>
        <Button type="button" variant="ghost" onClick={() => void copySummary()}>
          {t.proof.summaryCopy}
        </Button>
        <Button type="button" variant="ghost" onClick={downloadSummary}>
          {t.proof.summaryDownload}
        </Button>
      </div>
      {savedProof?.updatedAt ? (
        <p className="text-xs text-muted">
          {t.proof.savedAt}: {savedProof.updatedAt}
        </p>
      ) : null}
    </div>
  );
}
