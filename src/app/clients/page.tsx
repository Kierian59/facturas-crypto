"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Button, Empty, PageTitle } from "@/components/ui";

export default function ClientsPage() {
  const { clients } = useStore();
  const sorted = [...clients].sort((a, b) => a.brand.localeCompare(b.brand, "fr"));

  return (
    <div>
      <PageTitle
        kicker="Carnet"
        title="Clients"
        action={
          <Link href="/clients/nouveau">
            <Button>Nouvelle marca</Button>
          </Link>
        }
      />
      {sorted.length === 0 ? (
        <Empty
          title="Aucune marca pour l’instant"
          body="Ajoute tes clients hors UE. Le drapeau hors-UE pilote le traitement IVA (operación no sujeta)."
          action={
            <Link href="/clients/nouveau">
              <Button>Ajouter un client</Button>
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
                    {c.horsUE ? " · hors UE" : " · UE"}
                    {c.taxId ? ` · ${c.taxId}` : ""}
                  </span>
                </span>
                <span className="text-muted text-sm">ouvrir</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
