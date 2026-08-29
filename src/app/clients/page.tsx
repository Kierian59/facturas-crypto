"use client";

import Link from "next/link";
import { useStore, useT } from "@/lib/store";
import { Button, Empty, PageTitle } from "@/components/ui";

export default function ClientsPage() {
  const { clients, settings } = useStore();
  const t = useT();
  const sorted = [...clients].sort((a, b) => a.brand.localeCompare(b.brand, settings.locale));

  return (
    <div>
      <PageTitle
        kicker={t.clients.kicker}
        title={t.clients.title}
        action={
          <Link href="/clients/nouveau">
            <Button>{t.clients.newBrand}</Button>
          </Link>
        }
      />
      {sorted.length === 0 ? (
        <Empty
          title={t.clients.emptyTitle}
          body={t.clients.emptyBody}
          action={
            <Link href="/clients/nouveau">
              <Button>{t.clients.addClient}</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {sorted.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clients/${c.id}`}
                className="paper-card rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
              >
                <span>
                  <span className="block font-medium">{c.brand}</span>
                  <span className="text-sm text-muted">
                    {c.country}
                    {c.horsUE ? ` · ${t.horsUE}` : ` · ${t.inUE}`}
                    {c.taxId ? ` · ${c.taxId}` : ""}
                  </span>
                </span>
                <span className="text-muted text-sm">{t.open}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
