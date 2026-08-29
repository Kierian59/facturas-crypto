"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { COUNTRIES, DEFAULT_CLIENT_COUNTRY, countryByCode } from "@/lib/countries";
import type { Client } from "@/lib/types";
import { uid, isoDate } from "@/lib/format";
import { useStore } from "@/lib/store";

export function ClientForm({ existing }: { existing?: Client }) {
  const { upsertClient } = useStore();
  const router = useRouter();
  const def = countryByCode(DEFAULT_CLIENT_COUNTRY)!;
  const [brand, setBrand] = useState(existing?.brand ?? "");
  const [countryCode, setCountryCode] = useState(existing?.countryCode ?? def.code);
  const [taxId, setTaxId] = useState(existing?.taxId ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [horsUE, setHorsUE] = useState(existing?.horsUE ?? def.horsUE);
  const [error, setError] = useState("");

  const country = countryByCode(countryCode);

  function onCountry(code: string) {
    setCountryCode(code);
    const c = countryByCode(code);
    if (c) setHorsUE(c.horsUE);
  }

  function save() {
    if (!brand.trim()) {
      setError("Le nom de la marca est requis.");
      return;
    }
    const id = existing?.id ?? uid("cli");
    const client: Client = {
      id,
      brand: brand.trim(),
      country: country?.name ?? countryCode,
      countryCode,
      taxId: taxId.trim(),
      email: email.trim(),
      notes: notes.trim(),
      horsUE,
      createdAt: existing?.createdAt ?? isoDate(),
    };
    upsertClient(client);
    router.push(`/clients/${id}`);
  }

  return (
    <div className="space-y-4 max-w-lg">
      <Field label="Marca / société" required hint="Le nom qui apparaîtra sur la factura.">
        <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Northstar Athletics" />
      </Field>
      <Field
        label="Pays"
        required
        hint="Par défaut hors UE. Si tu choisis un pays UE, le traitement IVA de v1 (no sujeta extra-UE) ne s’applique plus tel quel."
      >
        <Select value={countryCode} onChange={(e) => onCountry(e.target.value)}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
              {c.horsUE ? "" : " (UE)"}
            </option>
          ))}
        </Select>
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={horsUE}
          onChange={(e) => setHorsUE(e.target.checked)}
        />
        <span>
          Client hors UE — operación no sujeta a IVA (art. 69.Uno.1º LIVA).
          {!horsUE ? (
            <span className="block text-warn text-xs mt-1">
              Client UE : v1 n’applique pas l’autoliquidation intra-UE. Vérifie avec ta gestoría.
            </span>
          ) : null}
        </span>
      </label>
      <Field label="Tax ID étranger" optional hint="EIN, UTR, numéro local… pas un NIF-IVA européen.">
        <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} />
      </Field>
      <Field label="E-mail" optional>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Notes" optional>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="button" onClick={save}>
        Enregistrer
      </Button>
    </div>
  );
}
