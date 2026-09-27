"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Textarea } from "@/components/ui";
import {
  COUNTRIES,
  DEFAULT_CLIENT_COUNTRY,
  clientCountryLabel,
  countryByCode,
  countryName,
  resolveCountry,
} from "@/lib/countries";
import type { Client } from "@/lib/types";
import { uid, isoDate } from "@/lib/format";
import { useStore, useT } from "@/lib/store";

export function ClientForm({ existing }: { existing?: Client }) {
  const { upsertClient, settings } = useStore();
  const t = useT();
  const router = useRouter();
  const def = countryByCode(DEFAULT_CLIENT_COUNTRY)!;
  const [brand, setBrand] = useState(existing?.brand ?? "");
  const locale = settings.locale;
  const [countryText, setCountryText] = useState(
    existing ? clientCountryLabel(existing, locale) : countryName(def, locale),
  );
  const [address, setAddress] = useState(existing?.address ?? "");
  const [taxId, setTaxId] = useState(existing?.taxId ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [horsUE, setHorsUE] = useState(existing?.horsUE ?? def.horsUE);
  const [error, setError] = useState("");

  // Saisie libre : si le texte correspond à un pays connu, on en déduit le code ISO et le statut UE.
  // Texte inconnu → pas de code, client traité hors UE (no sujeta art. 69.Uno.1º) ; case modifiable à la main.
  function onCountry(text: string) {
    setCountryText(text);
    const c = resolveCountry(text);
    setHorsUE(c ? c.horsUE : true);
  }

  function save() {
    if (!brand.trim()) {
      setError(t.errors.brandRequired);
      return;
    }
    const country = countryText.trim();
    if (!country) {
      setError(t.blockers.country);
      return;
    }
    const resolved = resolveCountry(country);
    const id = existing?.id ?? uid("cli");
    const client: Client = {
      id,
      brand: brand.trim(),
      country,
      countryCode: resolved?.code ?? "",
      address: address.trim(),
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
      <Field label={t.clients.brand} required hint={t.clients.brandHint}>
        <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Northstar Athletics" />
      </Field>
      <Field label={t.clients.country} required hint={t.clients.countryHint}>
        <Input
          value={countryText}
          onChange={(e) => onCountry(e.target.value)}
          list="client-country-suggestions"
          autoComplete="country-name"
          placeholder={t.clients.countryPlaceholder}
        />
        <datalist id="client-country-suggestions">
          {COUNTRIES.map((c) => (
            <option key={c.code} value={countryName(c, locale)}>
              {c.horsUE ? t.horsUE : t.inUE}
            </option>
          ))}
        </datalist>
      </Field>
      <Field label={t.clients.address} required hint={t.clients.addressHint}>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="1200 Market Street, Austin, TX"
        />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={horsUE}
          onChange={(e) => setHorsUE(e.target.checked)}
        />
        <span>
          {t.clients.horsUECheck}
          {!horsUE ? (
            <span className="block text-warn text-xs mt-1">
              {t.clients.ueWarn}
            </span>
          ) : null}
        </span>
      </label>
      <Field label={t.clients.taxId} optional hint={t.clients.taxIdHint}>
        <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} />
      </Field>
      <Field label={t.onboarding.email} optional>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label={t.clients.notes} optional>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="button" onClick={save}>
        {t.clients.save}
      </Button>
    </div>
  );
}
