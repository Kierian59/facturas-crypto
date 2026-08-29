"use client";

import { useRef, useState } from "react";
import { Button, Disclaimer, Field, Input, PageTitle, Select, Textarea } from "@/components/ui";
import { useStore } from "@/lib/store";
import { CRYPTO_ASSETS, NETWORKS, type Wallet } from "@/lib/types";
import { uid } from "@/lib/format";

export default function ParametresPage() {
  const { settings, updateSettings, setWallets, exportData, importData, resetAll, sampleAvailable, loadSample } =
    useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");

  function patchWallet(id: string, next: Partial<Wallet>) {
    setWallets(settings.wallets.map((w) => (w.id === id ? { ...w, ...next } : w)));
  }

  return (
    <div className="max-w-lg">
      <PageTitle kicker="Compte local" title="Paramètres" />
      <div className="space-y-4">
        <Field label="Nom" required>
          <Input value={settings.nombre} onChange={(e) => updateSettings({ nombre: e.target.value })} />
        </Field>
        <Field label="NIF / NIE" required>
          <Input
            value={settings.nif}
            onChange={(e) => updateSettings({ nif: e.target.value.toUpperCase() })}
          />
        </Field>
        <Field label="Adresse" required>
          <Input value={settings.direccion} onChange={(e) => updateSettings({ direccion: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Code postal" optional>
            <Input value={settings.cp} onChange={(e) => updateSettings({ cp: e.target.value })} />
          </Field>
          <Field label="Ville" optional>
            <Input value={settings.ciudad} onChange={(e) => updateSettings({ ciudad: e.target.value })} />
          </Field>
        </div>
        <Field label="E-mail" optional>
          <Input type="email" value={settings.email} onChange={(e) => updateSettings({ email: e.target.value })} />
        </Field>
        <Field label="Activité">
          <Textarea value={settings.activity} onChange={(e) => updateSettings({ activity: e.target.value })} />
        </Field>
        <Field label="Actif crypto par défaut">
          <Select
            value={settings.defaultAsset}
            onChange={(e) => updateSettings({ defaultAsset: e.target.value })}
          >
            {CRYPTO_ASSETS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
        </Field>
        <Field label="Préfixe de série">
          <Input
            value={settings.seriesPrefix}
            onChange={(e) => updateSettings({ seriesPrefix: e.target.value })}
          />
        </Field>
        <Field
          label="Prochain numéro"
          hint="Ne baisse ce chiffre que si tu sais ce que tu fais : les numéros émis ne se réutilisent pas."
        >
          <Input
            type="number"
            min={1}
            value={settings.nextSeq}
            onChange={(e) => updateSettings({ nextSeq: Math.max(1, Number(e.target.value) || 1) })}
          />
        </Field>
        <p className="text-xs text-muted">Cadence : trimestrielle (modelo 303 / modelo 130).</p>

        <h2 className="font-display text-xl pt-4">Portefeuilles</h2>
        {settings.wallets.map((w) => (
          <div key={w.id} className="paper-card rounded-2xl p-3 space-y-2">
            <Field label="Libellé">
              <Input value={w.label} onChange={(e) => patchWallet(w.id, { label: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Actif">
                <Select value={w.asset} onChange={(e) => patchWallet(w.id, { asset: e.target.value })}>
                  {CRYPTO_ASSETS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Réseau">
                <Select value={w.network} onChange={(e) => patchWallet(w.id, { network: e.target.value })}>
                  {(NETWORKS[w.asset] ?? ["Autre"]).map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Adresse">
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
          + portefeuille
        </button>

        <h2 className="font-display text-xl pt-4">Sauvegarde</h2>
        <p className="text-sm text-muted">Tout reste dans ce navigateur. Exporte un JSON de temps en temps.</p>
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
            Exporter JSON
          </Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            Importer JSON
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
              setMsg(r.ok ? "Import OK." : r.error);
            }}
          />
        </div>
        {sampleAvailable ? (
          <Button variant="ghost" onClick={() => loadSample()}>
            Charger l’exemple
          </Button>
        ) : (
          <p className="text-xs text-muted">Exemple désactivé : tu es déjà configuré·e.</p>
        )}
        <Button
          variant="danger"
          onClick={() => {
            if (!confirm("Effacer tout le classeur de ce navigateur ?")) return;
            resetAll();
            setMsg("Classeur vidé.");
          }}
        >
          Tout effacer
        </Button>
        {msg ? <p className="text-sm text-olive">{msg}</p> : null}
        <Disclaimer className="pt-4" />
      </div>
    </div>
  );
}
