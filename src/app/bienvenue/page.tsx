"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, LanguageToggle, Select, Textarea } from "@/components/ui";
import { useStore, useT } from "@/lib/store";
import { emptySettings, CRYPTO_ASSETS, NETWORKS, type Settings, type Wallet } from "@/lib/types";
import { uid } from "@/lib/format";
import { activityForLocale, type Locale } from "@/lib/i18n";

export default function BienvenuePage() {
  const { completeOnboarding, loadSample, sampleAvailable, settings, updateSettings } = useStore();
  const t = useT();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Settings>(() => ({ ...emptySettings(), ...pick(settings) }));
  const [error, setError] = useState("");

  function set<K extends keyof Settings>(k: K, v: Settings[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setLocale(locale: Locale) {
    setForm((f) => ({
      ...f,
      locale,
      activity: activityForLocale(f.activity, locale),
    }));
    updateSettings({
      locale,
      activity: activityForLocale(form.activity, locale),
    });
  }

  function next() {
    setError("");
    if (step === 0) {
      if (!form.nombre.trim() || !form.nif.trim() || !form.direccion.trim()) {
        setError(t.onboarding.step0Error);
        return;
      }
    }
    setStep((s) => Math.min(3, s + 1));
  }

  function finish() {
    completeOnboarding(form);
    router.replace("/");
  }

  function sample() {
    const r = loadSample();
    if (r.ok) router.replace("/");
    else setError(r.error);
  }

  function netLabel(n: string) {
    return n === "Autre" ? t.networkOther : n;
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <span className="stamp">F</span>
          <div className="flex-1">
            <p className="font-display text-2xl leading-tight">Facturas</p>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">{t.onboarding.tagline}</p>
          </div>
          <LanguageToggle locale={form.locale} onChange={setLocale} />
        </div>

        <div className="paper-card rounded-2xl p-6 md:p-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-terracotta">
            {t.onboarding.stepOf(step + 1, 4)}
          </p>
          {step === 0 && (
            <Step title={t.onboarding.step0Title} body={t.onboarding.step0Body}>
              <Field label={t.onboarding.name} required hint={t.onboarding.nameHint}>
                <Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Camille Navarro" />
              </Field>
              <Field label={t.onboarding.nif} required hint={t.onboarding.nifHint}>
                <Input value={form.nif} onChange={(e) => set("nif", e.target.value.toUpperCase())} placeholder="12345678Z" />
              </Field>
              <Field label={t.onboarding.addressEs} required>
                <Input value={form.direccion} onChange={(e) => set("direccion", e.target.value)} placeholder="Calle…" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t.onboarding.cp} optional>
                  <Input value={form.cp} onChange={(e) => set("cp", e.target.value)} />
                </Field>
                <Field label={t.onboarding.city} optional>
                  <Input value={form.ciudad} onChange={(e) => set("ciudad", e.target.value)} />
                </Field>
              </div>
              <Field label={t.onboarding.email} optional>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
            </Step>
          )}
          {step === 1 && (
            <Step title={t.onboarding.step1Title} body={t.onboarding.step1Body}>
              <Field label={t.onboarding.activity} required>
                <Textarea
                  value={form.activity}
                  onChange={(e) => set("activity", e.target.value)}
                  rows={3}
                />
              </Field>
            </Step>
          )}
          {step === 2 && (
            <Step title={t.onboarding.step2Title} body={t.onboarding.step2Body}>
              <Field label={t.onboarding.defaultAsset} hint={t.onboarding.defaultAssetHint}>
                <Select value={form.defaultAsset} onChange={(e) => set("defaultAsset", e.target.value)}>
                  {CRYPTO_ASSETS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </Select>
              </Field>
              {form.wallets.map((w, i) => (
                <WalletFields
                  key={w.id}
                  wallet={w}
                  netLabel={netLabel}
                  labels={{
                    label: t.onboarding.walletLabel,
                    asset: t.onboarding.asset,
                    network: t.onboarding.network,
                    address: t.onboarding.walletAddress,
                    addressHint: t.onboarding.walletAddressHint,
                  }}
                  onChange={(next) => {
                    const wallets = form.wallets.slice();
                    wallets[i] = next;
                    set("wallets", wallets);
                  }}
                />
              ))}
              <button
                type="button"
                className="text-sm text-olive underline"
                onClick={() =>
                  set("wallets", [
                    ...form.wallets,
                    { id: uid("w"), label: "", asset: form.defaultAsset, network: "", address: "" },
                  ])
                }
              >
                {t.onboarding.addWallet}
              </button>
            </Step>
          )}
          {step === 3 && (
            <Step title={t.onboarding.step3Title} body={t.onboarding.step3Body}>
              <Field label={t.onboarding.seriesPrefix} hint={t.onboarding.seriesHint}>
                <Input value={form.seriesPrefix} onChange={(e) => set("seriesPrefix", e.target.value)} />
              </Field>
              <Field label={t.onboarding.nextSeq} hint={t.onboarding.nextSeqHint}>
                <Input
                  type="number"
                  min={1}
                  value={form.nextSeq}
                  onChange={(e) => set("nextSeq", Math.max(1, Number(e.target.value) || 1))}
                />
              </Field>
              <p className="text-xs text-muted">{t.onboarding.cadence}</p>
            </Step>
          )}

          {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

          <div className="mt-6 flex flex-wrap gap-2">
            {step > 0 ? (
              <Button variant="ghost" type="button" onClick={() => setStep((s) => s - 1)}>
                {t.onboarding.back}
              </Button>
            ) : null}
            {step < 3 ? (
              <Button type="button" onClick={next}>
                {t.onboarding.continue}
              </Button>
            ) : (
              <Button type="button" onClick={finish}>
                {t.onboarding.finish}
              </Button>
            )}
          </div>
        </div>

        {sampleAvailable ? (
          <p className="mt-5 text-center text-sm text-muted">
            {t.onboarding.samplePrompt}{" "}
            <button type="button" className="text-terracotta underline" onClick={sample}>
              {t.onboarding.loadSample}
            </button>
            <span className="block text-xs mt-1">{t.onboarding.sampleNote}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Step({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <>
      <h1 className="font-display text-2xl mt-1">{title}</h1>
      <p className="mt-2 mb-5 text-sm text-muted">{body}</p>
      <div className="space-y-4">{children}</div>
    </>
  );
}

function WalletFields({
  wallet,
  onChange,
  netLabel,
  labels,
}: {
  wallet: Wallet;
  onChange: (w: Wallet) => void;
  netLabel: (n: string) => string;
  labels: { label: string; asset: string; network: string; address: string; addressHint: string };
}) {
  const nets = NETWORKS[wallet.asset] ?? ["Autre"];
  return (
    <div className="rounded-xl border border-line p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label={labels.label} optional>
          <Input value={wallet.label} onChange={(e) => onChange({ ...wallet, label: e.target.value })} />
        </Field>
        <Field label={labels.asset}>
          <Select value={wallet.asset} onChange={(e) => onChange({ ...wallet, asset: e.target.value })}>
            {CRYPTO_ASSETS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={labels.network} optional>
        <Select value={wallet.network} onChange={(e) => onChange({ ...wallet, network: e.target.value })}>
          {nets.map((n) => (
            <option key={n} value={n}>
              {netLabel(n)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={labels.address} optional hint={labels.addressHint}>
        <Input
          value={wallet.address}
          onChange={(e) => onChange({ ...wallet, address: e.target.value })}
          placeholder="T… / 0x… / bc1…"
        />
      </Field>
    </div>
  );
}

function pick(s: Settings): Partial<Settings> {
  return {
    locale: s.locale,
    nombre: s.nombre,
    nif: s.nif,
    direccion: s.direccion,
    ciudad: s.ciudad,
    cp: s.cp,
    email: s.email,
    activity: s.activity,
    defaultAsset: s.defaultAsset,
    wallets: s.wallets,
    seriesPrefix: s.seriesPrefix,
    nextSeq: s.nextSeq,
  };
}
