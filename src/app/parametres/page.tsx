"use client";

import { useRef, useState } from "react";
import { Button, Disclaimer, Field, Input, LanguageToggle, PageTitle, Select, Textarea } from "@/components/ui";
import { useStore, useT } from "@/lib/store";
import { CRYPTO_ASSETS, NETWORKS, type Wallet } from "@/lib/types";
import { uid } from "@/lib/format";
import { activityForLocale, type Locale } from "@/lib/i18n";

export default function ParametresPage() {
  const { settings, updateSettings, setWallets, exportData, importData, resetAll, sampleAvailable, loadSample } =
    useStore();
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");

  function patchWallet(id: string, next: Partial<Wallet>) {
    setWallets(settings.wallets.map((w) => (w.id === id ? { ...w, ...next } : w)));
  }

  function setLocale(locale: Locale) {
    updateSettings({
      locale,
      activity: activityForLocale(settings.activity, locale),
    });
  }

  function netLabel(n: string) {
    return n === "Autre" ? t.networkOther : n;
  }

  return (
    <div className="max-w-lg">
      <PageTitle kicker={t.settings.kicker} title={t.settings.title} />
      <div className="space-y-4">
        <Field label={t.settings.language} hint={t.settings.languageHint}>
          <LanguageToggle locale={settings.locale} onChange={setLocale} />
        </Field>
        <Field label={t.settings.name} required>
          <Input value={settings.nombre} onChange={(e) => updateSettings({ nombre: e.target.value })} />
        </Field>
        <Field label={t.settings.nif} required>
          <Input
            value={settings.nif}
            onChange={(e) => updateSettings({ nif: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field label={t.settings.address} required>
          <Input value={settings.direccion} onChange={(e) => updateSettings({ direccion: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.settings.cp} optional>
            <Input value={settings.cp} onChange={(e) => updateSettings({ cp: e.target.value })} />
          </Field>
          <Field label={t.settings.city} optional>
            <Input value={settings.ciudad} onChange={(e) => updateSettings({ ciudad: e.target.value })} />
          </Field>
        </div>
        <Field label={t.settings.email} optional>
          <Input type="email" value={settings.email} onChange={(e) => updateSettings({ email: e.target.value })} />
        </Field>
        <Field label={t.settings.activity}>
          <Textarea value={settings.activity} onChange={(e) => updateSettings({ activity: e.target.value })} />
        </Field>
        <Field label={t.settings.defaultAsset}>
          <Select
            value={settings.defaultAsset}
            onChange={(e) => updateSettings({ defaultAsset: e.target.value })}
          >
            {CRYPTO_ASSETS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
        </Field>
        <Field label={t.settings.seriesPrefix}>
          <Input
            value={settings.seriesPrefix}
            onChange={(e) => updateSettings({ seriesPrefix: e.target.value })}
          />
        </Field>
        <Field label={t.settings.nextSeq} hint={t.settings.nextSeqHint}>
          <Input
            type="number"
            min={1}
            value={settings.nextSeq}
            onChange={(e) => updateSettings({ nextSeq: Math.max(1, Number(e.target.value) || 1) })}
          />
        </Field>
        <p className="text-xs text-muted">{t.settings.cadence}</p>
        <p className="text-xs leading-relaxed text-muted">{t.aeat.disclaimer}</p>

        <h2 className="font-display text-xl pt-4">{t.settings.wallets}</h2>
        {settings.wallets.map((w) => (
          <div key={w.id} className="paper-card rounded-2xl p-3 space-y-2">
            <Field label={t.settings.label}>
              <Input value={w.label} onChange={(e) => patchWallet(w.id, { label: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t.settings.asset}>
                <Select value={w.asset} onChange={(e) => patchWallet(w.id, { asset: e.target.value })}>
                  {CRYPTO_ASSETS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t.settings.network}>
                <Select value={w.network} onChange={(e) => patchWallet(w.id, { network: e.target.value })}>
                  {(NETWORKS[w.asset] ?? ["Autre"]).map((n) => (
                    <option key={n} value={n}>
                      {netLabel(n)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={t.settings.walletAddress}>
              <Input value={w.address} onChange={(e) => patchWallet(w.id, { address: e.target.value })} />
            </Field>
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-olive underline"
          onClick={() =>
            setWallets([
              ...settings.wallets,
              { id: uid("w"), label: "", asset: settings.defaultAsset, network: "TRC20", address: "" },
            ])
          }
        >
          {t.settings.addWallet}
        </button>

        <h2 className="font-display text-xl pt-4">{t.settings.backup}</h2>
        <p className="text-sm text-muted">{t.settings.backupBody}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              const blob = new Blob([exportData()], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "facturas-crypto.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            {t.settings.exportJson}
          </Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            {t.settings.importJson}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              const r = importData(text);
              setMsg(r.ok ? t.settings.importOk : r.error);
            }}
          />
        </div>
        {sampleAvailable ? (
          <Button variant="ghost" onClick={() => loadSample()}>
            {t.settings.loadSample}
          </Button>
        ) : (
          <p className="text-xs text-muted">{t.settings.sampleOff}</p>
        )}
        <Button
          variant="danger"
          onClick={() => {
            if (!confirm(t.settings.confirmReset)) return;
            resetAll();
            setMsg(t.settings.resetDone);
          }}
        >
          {t.settings.reset}
        </Button>
        {msg ? <p className="text-sm text-olive">{msg}</p> : null}
        <Disclaimer className="pt-4" />
      </div>
    </div>
  );
}
