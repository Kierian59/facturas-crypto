"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { Button, Disclaimer, PageTitle, StatusBadge } from "@/components/ui";
import { formatDate, formatEur, isoDate } from "@/lib/format";
import {
  cobradoEur,
  displayStatus,
  facturadoEur,
  filingTarget,
  inQuarterByCobro,
  inQuarterByIssue,
  unpaidEur,
} from "@/lib/tax";

export default function DashboardPage() {
  const { invoices, clients, settings, loadSample, sampleAvailable } = useStore();
  const today = isoDate();
  const stats = useMemo(() => {
    const f = filingTarget(today);
    const cobradoQ = invoices
      .filter((i) => inQuarterByCobro(i, f.current))
      .reduce((s, i) => s + cobradoEur(i), 0);
    const factureQ = invoices
      .filter((i) => inQuarterByIssue(i, f.current))
      .reduce((s, i) => s + facturadoEur(i), 0);
    const aDeclarer = invoices
      .filter((i) => inQuarterByCobro(i, f.toFile))
      .reduce((s, i) => s + cobradoEur(i), 0);
    const unpaid = invoices.reduce((s, i) => s + unpaidEur(i, today), 0);
    const overdue = invoices.filter((i) => displayStatus(i, today) === "en_retard");
    const upcoming = invoices
      .filter((i) => i.status === "emise" && i.dueDate >= today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 4);
    const mix = new Map<string, number>();
    invoices.filter((i) => inQuarterByCobro(i, f.current) && i.payment).forEach((i) => {
      const k = i.payment!.asset;
      mix.set(k, (mix.get(k) ?? 0) + i.payment!.eurEquivalent);
    });
    return { f, cobradoQ, factureQ, aDeclarer, unpaid, overdue, upcoming, mix };
  }, [invoices, today]);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.brand ?? "—";

  return (
    <div>
      <PageTitle
        kicker={settings.nombre || "Tableau"}
        title="Ce trimestre"
        action={
          <Link href="/facturas/nouvelle">
            <Button>Nouvelle factura</Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Cobrado (encaissé)" value={formatEur(stats.cobradoQ)} hint={stats.f.current.label} />
        <Stat label="Non payé" value={formatEur(stats.unpaid)} hint="Facturas émises en attente" />
        <Stat
          label="À déclarer"
          value={formatEur(stats.aDeclarer)}
          hint={`Encaissé ${stats.f.toFile.label} · fecha de cobro`}
        />
        <Stat
          label="Facturé vs cobrado"
          value={`${formatEur(stats.factureQ)} / ${formatEur(stats.cobradoQ)}`}
          hint="Émis ce trimestre / encaissé ce trimestre"
        />
      </div>

      <section className="mt-6 paper-card rounded-2xl p-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-terracotta">
          modelo 303 · modelo 130
        </p>
        <h2 className="font-display text-xl mt-1">
          {stats.f.inWindow ? "Fenêtre ouverte" : "Prochaine fenêtre"}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          {stats.f.nextWindow.label} : à déposer environ du{" "}
          <span className="tabular">{formatDate(stats.f.nextWindow.windowStart)}</span> au{" "}
          <span className="tabular">{formatDate(stats.f.nextWindow.windowEnd)}</span>.
        </p>
        <p className="mt-1 text-sm">
          Montant indicatif à déclarer (cobrado EUR) :{" "}
          <strong className="tabular">{formatEur(stats.aDeclarer)}</strong>
        </p>
        <p className="mt-2 text-xs text-muted">
          Fenêtres usuelles ~1–20 avril / juillet / octobre / janvier. Le 4e trimestre va souvent
          jusqu’au 30 janvier. Aide-mémoire seulement.
        </p>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="paper-card rounded-2xl p-5">
          <h2 className="font-display text-lg">À relancer</h2>
          {stats.overdue.length === 0 && stats.upcoming.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Rien en souffrance. Tranquille.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stats.overdue.map((i) => (
                <li key={i.id}>
                  <Link href={`/facturas/${i.id}`} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {i.number} · {clientName(i.clientId)}
                    </span>
                    <StatusBadge status="en_retard" />
                  </Link>
                </li>
              ))}
              {stats.upcoming.map((i) => (
                <li key={i.id}>
                  <Link href={`/facturas/${i.id}`} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {i.number} · {clientName(i.clientId)}
                    </span>
                    <span className="text-muted tabular">éch. {formatDate(i.dueDate)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="paper-card rounded-2xl p-5">
          <h2 className="font-display text-lg">Mix crypto (encaissé)</h2>
          {stats.mix.size === 0 ? (
            <p className="mt-2 text-sm text-muted">Pas encore de cobro ce trimestre.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {[...stats.mix.entries()].map(([asset, eur]) => (
                <li key={asset} className="flex justify-between text-sm">
                  <span>{asset}</span>
                  <span className="tabular">{formatEur(eur)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {sampleAvailable ? (
        <div className="mt-6 paper-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">Données d’exemple</p>
            <p className="text-sm text-muted">Un classeur fictif, seulement si tu n’as pas encore d’activité.</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              loadSample();
            }}
          >
            Charger l’exemple
          </Button>
        </div>
      ) : null}

      <Disclaimer className="mt-8" />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="paper-card rounded-2xl p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl tabular leading-tight">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}
