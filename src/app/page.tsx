"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore, useT } from "@/lib/store";
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
  const t = useT();
  const locale = settings.locale;
  const today = isoDate();
  const stats = useMemo(() => {
    const f = filingTarget(today, locale);
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
  }, [invoices, today, locale]);

  const clientName = (id: string) => clients.find((c) => c.id === id)?.brand ?? "—";

  return (
    <div>
      <PageTitle
        kicker={settings.nombre || t.dash.kickerFallback}
        title={t.dash.title}
        action={
          <Link href="/facturas/nouvelle">
            <Button>{t.dash.newInvoice}</Button>
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t.dash.cobrado} value={formatEur(stats.cobradoQ, locale)} hint={stats.f.current.label} />
        <Stat label={t.dash.unpaid} value={formatEur(stats.unpaid, locale)} hint={t.dash.unpaidHint} />
        <Stat
          label={t.dash.toDeclare}
          value={formatEur(stats.aDeclarer, locale)}
          hint={t.dash.toDeclareHint(stats.f.toFile.label)}
        />
        <Stat
          label={t.dash.billedVs}
          value={`${formatEur(stats.factureQ, locale)} / ${formatEur(stats.cobradoQ, locale)}`}
          hint={t.dash.billedHint}
        />
      </div>

      <section className="mt-6 paper-card rounded-2xl p-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-terracotta">
          modelo 303 · modelo 130
        </p>
        <h2 className="font-display text-xl mt-1">
          {stats.f.inWindow ? t.dash.windowOpen : t.dash.nextWindow}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          {t.dash.windowBody(
            stats.f.nextWindow.label,
            formatDate(stats.f.nextWindow.windowStart),
            formatDate(stats.f.nextWindow.windowEnd),
          )}
        </p>
        <p className="mt-1 text-sm">
          {t.dash.indicative}{" "}
          <strong className="tabular">{formatEur(stats.aDeclarer, locale)}</strong>
        </p>
        <p className="mt-2 text-xs text-muted">
          {t.dash.windowNote}
        </p>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="paper-card rounded-2xl p-5">
          <h2 className="font-display text-lg">{t.dash.followUp}</h2>
          {stats.overdue.length === 0 && stats.upcoming.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t.dash.nothingDue}</p>
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
                    <span className="text-muted tabular">{t.dash.dueAbbr} {formatDate(i.dueDate)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="paper-card rounded-2xl p-5">
          <h2 className="font-display text-lg">{t.dash.cryptoMix}</h2>
          {stats.mix.size === 0 ? (
            <p className="mt-2 text-sm text-muted">{t.dash.noCobro}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {[...stats.mix.entries()].map(([asset, eur]) => (
                <li key={asset} className="flex justify-between text-sm">
                  <span>{asset}</span>
                  <span className="tabular">{formatEur(eur, locale)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {sampleAvailable ? (
        <div className="mt-6 paper-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">{t.dash.sampleTitle}</p>
            <p className="text-sm text-muted">{t.dash.sampleBody}</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              loadSample();
            }}
          >
            {t.dash.loadSample}
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
