"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Empty, PageTitle, StatusBadge } from "@/components/ui";
import { formatDate, formatEur, invoiceBase, invoiceTotal, isoDate } from "@/lib/format";
import { displayStatus } from "@/lib/tax";
import type { InvoiceStatus } from "@/lib/types";

const FILTERS: { id: "all" | InvoiceStatus | "en_retard"; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "brouillon", label: "Brouillons" },
  { id: "emise", label: "Émises" },
  { id: "en_retard", label: "En retard" },
  { id: "cobrada", label: "Cobradas" },
];

export default function FacturasPage() {
  const { invoices, clients } = useStore();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const today = isoDate();

  const rows = useMemo(() => {
    const name = (id: string) => clients.find((c) => c.id === id)?.brand ?? "—";
    return [...invoices]
      .map((inv) => ({
        inv,
        status: displayStatus(inv, today),
        brand: name(inv.clientId),
        total: invoiceTotal(invoiceBase(inv.items), inv.irpfRate),
      }))
      .filter((r) => (filter === "all" ? true : r.status === filter))
      .sort((a, b) => (b.inv.issueDate || "").localeCompare(a.inv.issueDate || ""));
  }, [invoices, clients, filter, today]);

  return (
    <div>
      <PageTitle
        kicker="Série"
        title="Facturas"
        action={
          <Link href="/facturas/nouvelle">
            <Button>Nouvelle factura</Button>
          </Link>
        }
      />
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1 text-xs ${
              filter === f.id ? "bg-olive text-[#f6f3ec]" : "bg-paper-2 text-ink-soft"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <Empty
          title="Aucune factura ici"
          body="Rédige un brouillon, puis émets-le : le numéro séquentiel se fige à ce moment-là."
          action={
            <Link href="/facturas/nouvelle">
              <Button>Créer</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {rows.map(({ inv, status, brand, total }) => (
            <li key={inv.id}>
              <Link
                href={`/facturas/${inv.id}`}
                className="paper-card rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
              >
                <span>
                  <span className="block font-medium tabular">{inv.number ?? "Brouillon"}</span>
                  <span className="text-sm text-muted">
                    {brand} · {formatDate(inv.issueDate)}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block tabular text-sm">{formatEur(total)}</span>
                  <StatusBadge status={status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
