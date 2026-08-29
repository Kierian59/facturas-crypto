"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { useStore } from "@/lib/store";
import { emptySettings, CRYPTO_ASSETS, NETWORKS, type Settings, type Wallet } from "@/lib/types";
import { uid } from "@/lib/format";

export default function BienvenuePage() {
  const { completeOnboarding, loadSample, sampleAvailable, settings } = useStore();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Settings>(() => ({ ...emptySettings(), ...pick(settings) }));
  const [error, setError] = useState("");

  function set<K extends keyof Settings>(k: K, v: Settings[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function next() {
    setError("");
    if (step === 0) {
      if (!form.nombre.trim() || !form.nif.trim() || !form.direccion.trim()) {
        setError("Nom, NIF/NIE et adresse sont requis pour émettre une factura.");
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

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <span className="stamp">F</span>
          <div>
            <p className="font-display text-2xl leading-tight">Facturas</p>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">classeur crypto · EUR</p>
          </div>
        </div>

        <div className="paper-card rounded-2xl p-6 md:p-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-terracotta">
            Étape {step + 1} / 4
          </p>
          {step === 0 && (
            <Step
              title="Toi, sur la factura"
              body="Ces champs figurent sur chaque document. Tu pourras les modifier plus tard."
            >
              <Field label="Nom / raison" required hint="Tel que tu veux l'imprimer (prénom + nom, ou nom commercial).">
                <Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Camille Navarro" />
              </Field>
              <Field label="NIF / NIE" required hint="Identifiant fiscal espagnol de l'émetteur.">
                <Input value={form.nif} onChange={(e) => set("nif", e.target.value.toUpperCase())} placeholder="12345678Z" />
              </Field>
              <Field label="Adresse (Espagne)" required>
                <Input value={form.direccion} onChange={(e) => set("direccion", e.target.value)} placeholder="Calle…" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Code postal" optional>
                  <Input value={form.cp} onChange={(e) => set("cp", e.target.value)} />
                </Field>
                <Field label="Ville" optional>
                  <Input value={form.ciudad} onChange={(e) => set("ciudad", e.target.value)} />
                </Field>
              </div>
              <Field label="E-mail" optional>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
            </Step>
          )}
          {step === 1 && (
            <Step
              title="Ton activité"
              body="Une phrase suffit : elle rappelle la nature des services sur la factura."
            >
              <Field label="Libellé d'activité" required>
                <Textarea
                  value={form.activity}
                  onChange={(e) => set("activity", e.target.value)}
                  rows={3}
                />
              </Field>
            </Step>
          )}
          {step === 2 && (
            <Step
              title="Crypto de règlement"
              body="La factura reste en EUR. Ici tu indiques comment on te paie."
            >
              <Field label="Actif par défaut" hint="USDT convient bien aux marques US / UK.">
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
                + autre adresse
              </button>
            </Step>
          )}
          {step === 3 && (
            <Step
              title="Numérotation"
              body="Série séquentielle : une fois émise, une factura garde son numéro. On ne saute pas."
            >
              <Field
                label="Préfixe de série"
                hint="Ex. F-2026- donnera F-2026-0001, puis 0002…"
              >
                <Input value={form.seriesPrefix} onChange={(e) => set("seriesPrefix", e.target.value)} />
              </Field>
              <Field label="Prochain numéro" hint="Laisse 1 si tu commences cette série.">
                <Input
                  type="number"
                  min={1}
                  value={form.nextSeq}
                  onChange={(e) => set("nextSeq", Math.max(1, Number(e.target.value) || 1))}
                />
              </Field>
              <p className="text-xs text-muted">
                Cadence par défaut : trimestrielle (modelo 303 et modelo 130, fenêtres ~1–20 avril /
                juillet / octobre / janvier).
              </p>
            </Step>
          )}

          {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

          <div className="mt-6 flex flex-wrap gap-2">
            {step > 0 ? (
              <Button variant="ghost" type="button" onClick={() => setStep((s) => s - 1)}>
                Retour
              </Button>
            ) : null}
            {step < 3 ? (
              <Button type="button" onClick={next}>
                Continuer
              </Button>
            ) : (
              <Button type="button" onClick={finish}>
                Ouvrir le classeur
              </Button>
            )}
          </div>
        </div>

        {sampleAvailable ? (
          <p className="mt-5 text-center text-sm text-muted">
            Envie de voir un classeur déjà rempli ?{" "}
            <button type="button" className="text-terracotta underline" onClick={sample}>
              Charger l’exemple
            </button>
            <span className="block text-xs mt-1">Sans effet si tu as déjà terminé l’accueil.</span>
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

function WalletFields({ wallet, onChange }: { wallet: Wallet; onChange: (w: Wallet) => void }) {
  const nets = NETWORKS[wallet.asset] ?? ["Autre"];
  return (
    <div className="rounded-xl border border-line p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Libellé" optional>
          <Input value={wallet.label} onChange={(e) => onChange({ ...wallet, label: e.target.value })} />
        </Field>
        <Field label="Actif">
          <Select value={wallet.asset} onChange={(e) => onChange({ ...wallet, asset: e.target.value })}>
            {CRYPTO_ASSETS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Réseau" optional>
        <Select value={wallet.network} onChange={(e) => onChange({ ...wallet, network: e.target.value })}>
          {nets.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </Select>
      </Field>
      <Field label="Adresse du portefeuille" optional hint="Tu peux la remplir plus tard, avant d’émettre.">
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
