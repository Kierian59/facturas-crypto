"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { COUNTRIES, DEFAULT_CLIENT_COUNTRY, countryByCode, countryName } from "@/lib/countries";
import type { Client } from "@/lib/types";
import { uid, isoDate } from "@/lib/format";
import { useStore, useT } from "@/lib/store";

export function ClientForm({ existing }: { existing?: Client }) {
  const { upsertClient, settings } = useStore();
  const t = useT();
  const router = useRouter();
  const def = countryByCode(DEFAULT_CLIENT_COUNTRY)!;
  const [brand, setBrand] = useState(existing?.brand ?? "");
  const [countryCode, setCountryCode] = useState(existing?.countryCode ?? def.code);
  const [address, setAddress] = useState(existing?.address ?? "");
  const [taxId, setTaxId] = useState(existing?.taxId ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [horsUE, setHorsUE] = useState(existing?.horsUE ?? def.horsUE);
  const [error, setError] = useState("");

  const country = countryByCode(countryCode);
  const locale = settings.locale;

  function onCountry(code: string) {
    setCountryCode(code);
    const c = countryByCode(code);
    if (c) setHorsUE(c.horsUE);
  }

  function save() {
    if (!brand.trim()) {
      setError(t.errors.brandRequired);
      return;
    }
    const id = existing?.id ?? uid("cli");
    const client: Client = {
      id,
      brand: brand.trim(),
      country: countryName(country, locale) || countryCode,
      countryCode,
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
        <Select value={countryCode} onChange={(e) => onCountry(e.target.value)}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {countryName(c, locale)}
              {c.horsUE ? "" : ` (${t.inUE})`}
            </option>
          ))}
        </Select>
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
