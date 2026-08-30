"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore, useT } from "@/lib/store";
import { Button, Disclaimer, PageTitle, StatusBadge } from "@/components/ui";
import { formatDate, formatEur, isoDate } from "@/lib/format";
import {
  cobradoEur,
  cobrosByDay,
  cobrosByMonth,
  cobroYears,
  displayStatus,
  facturadoEur,
  filingTarget,
  fiscalDeadlines,
  inQuarterByCobro,
  inQuarterByIssue,
  unpaidEur,
} from "@/lib/tax";
import { AEAT_LINKS } from "@/lib/aeat";
import type { Client, Invoice } from "@/lib/types";
import type { Locale } from "@/lib/i18n";

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
    const deadlines = fiscalDeadlines(today, locale);
    return { f, cobradoQ, factureQ, aDeclarer, unpaid, overdue, upcoming, mix, deadlines };
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

      <DeclaredSection invoices={invoices} clients={clients} locale={locale} today={today} />

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
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={AEAT_LINKS.facturacionApp} target="_blank" rel="noreferrer">
            <Button type="button">{t.dash.postInvoices}</Button>
          </a>
          <a href={AEAT_LINKS.modelo303} target="_blank" rel="noreferrer">
            <Button type="button" variant="secondary">{t.dash.present303}</Button>
          </a>
          <a href={AEAT_LINKS.modelo130} target="_blank" rel="noreferrer">
            <Button type="button" variant="secondary">{t.dash.present130}</Button>
          </a>
        </div>
        <p className="mt-2 text-xs text-muted">{t.dash.postInvoicesHint}</p>
      </section>

      <section className="mt-6 paper-card rounded-2xl p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl">{t.dash.calendarTitle}</h2>
          <a
            href={AEAT_LINKS.calendario}
            target="_blank"
            rel="noreferrer"
            className="text-xs uppercase tracking-wide text-terracotta"
          >
            {t.dash.calendarOfficial}
          </a>
        </div>
        <ul className="mt-3 divide-y divide-line">
          {stats.deadlines.map((d) => {
            const open = today >= d.windowStart && today <= d.windowEnd;
            const past = today > d.windowEnd;
            const label =
              d.kind === "quarter"
                ? t.dash.models303130
                : d.kind === "renta"
                  ? t.dash.renta
                  : t.dash.verifactuDate;
            const when =
              d.kind === "verifactu"
                ? formatDate(d.windowStart)
                : `${formatDate(d.windowStart)} → ${formatDate(d.windowEnd)}`;
            const badge = open ? t.dash.deadlineOpen : past ? t.dash.deadlinePast : t.dash.deadlineSoon;
            return (
              <li key={d.id} className="py-2.5 flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">
                    {label}
                    {d.kind !== "verifactu" ? ` · ${d.periodLabel}` : ""}
                  </p>
                  <p className="text-xs text-muted tabular">
                    {t.dash.until} {when}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-[11px] uppercase tracking-wide ${
                    open ? "text-olive" : past ? "text-muted" : "text-terracotta"
                  }`}
                >
                  {badge}
                </span>
              </li>
            );
          })}
        </ul>
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

function monthLabel(month: number, locale: Locale): string {
  const tag = locale === "fr" ? "fr-FR" : "es-ES";
  const raw = new Intl.DateTimeFormat(tag, { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2020, month - 1, 15)),
  );
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function DeclaredSection({
  invoices,
  clients,
  locale,
  today,
}: {
  invoices: Invoice[];
  clients: Client[];
  locale: Locale;
  today: string;
}) {
  const t = useT();
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));
  const [year, setYear] = useState(currentYear);
  const [openMonth, setOpenMonth] = useState<number | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const years = useMemo(() => {
    const ys = new Set(cobroYears(invoices));
    ys.add(currentYear);
    ys.add(currentYear - 1);
    return [...ys].sort((a, b) => a - b);
  }, [invoices, currentYear]);

  const byMonth = useMemo(() => cobrosByMonth(invoices, year), [invoices, year]);
  const byDay = useMemo(
    () => (openMonth ? cobrosByDay(invoices, year, openMonth) : null),
    [invoices, year, openMonth],
  );

  const clientName = (id: string) => clients.find((c) => c.id === id)?.brand ?? "—";
  const maxMonth = Math.max(0, ...byMonth.months.map((m) => m.total));
  const minYear = years[0] ?? currentYear;
  const isCurrentYear = year === currentYear;

  function setYearAndReset(next: number) {
    setYear(next);
    setOpenMonth(null);
    setOpenDay(null);
  }

  function toggleMonth(month: number) {
    setOpenMonth((prev) => (prev === month ? null : month));
    setOpenDay(null);
  }

  return (
    <section className="mt-6 paper-card rounded-2xl p-5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-terracotta">{t.dash.byMonth}</p>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-xl">{t.dash.declaredTitle}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`${year - 1}`}
            disabled={year <= minYear}
            onClick={() => setYearAndReset(year - 1)}
            className="rounded-lg px-2 py-1 text-sm text-ink-soft hover:bg-paper-2 disabled:opacity-35"
          >
            ‹
          </button>
          <select
            value={year}
            onChange={(e) => setYearAndReset(Number(e.target.value))}
            className="rounded-xl border border-line bg-card px-2 py-1.5 font-display text-lg tabular"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
            {years.includes(year) ? null : <option value={year}>{year}</option>}
          </select>
          <button
            type="button"
            aria-label={`${year + 1}`}
            disabled={year >= currentYear}
            onClick={() => setYearAndReset(year + 1)}
            className="rounded-lg px-2 py-1 text-sm text-ink-soft hover:bg-paper-2 disabled:opacity-35"
          >
            ›
          </button>
        </div>
      </div>
      <p className="mt-2 text-sm text-ink-soft">{t.dash.declaredHint}</p>
      <p className="mt-3 font-display text-2xl tabular leading-tight">{formatEur(byMonth.yearTotal, locale)}</p>
      <p className="mt-0.5 text-xs text-muted">
        {t.dash.yearTotal} · {year}
      </p>

      {byMonth.yearTotal === 0 ? (
        <p className="mt-4 text-sm text-muted">{t.dash.noDeclared}</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {byMonth.quarters.map((q) => (
              <div key={q.q} className="rounded-xl bg-paper-2 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted">{t.dash.quarterTotal(q.q)}</p>
                <p className="mt-0.5 font-display text-lg tabular">{formatEur(q.total, locale)}</p>
              </div>
            ))}
          </div>

          <ul className="mt-4 divide-y divide-line">
            {byMonth.months.map((m) => {
              const current = isCurrentYear && m.month === currentMonth;
              const open = openMonth === m.month;
              const pct = maxMonth > 0 ? Math.round((m.total / maxMonth) * 100) : 0;
              return (
                <li key={m.month}>
                  <button
                    type="button"
                    onClick={() => toggleMonth(m.month)}
                    className={`w-full py-2.5 text-left ${current ? "bg-olive-mist -mx-2 px-2 rounded-xl" : ""}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-[7.5rem] shrink-0 text-sm font-medium">
                        {monthLabel(m.month, locale)}
                        {current ? (
                          <span className="ml-1.5 text-[10px] uppercase tracking-wide text-olive">
                            {t.dash.currentMonth}
                          </span>
                        ) : null}
                      </span>
                      <span className="h-1.5 min-w-0 flex-1 rounded-full bg-paper-2">
                        <span
                          className={`block h-1.5 rounded-full ${open ? "bg-olive" : "bg-terracotta"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="shrink-0 tabular text-sm">{formatEur(m.total, locale)}</span>
                    </span>
                  </button>
                  {open && byDay ? (
                    <div className="mb-3 ml-1 border-l border-line pl-4">
                      <p className="text-[11px] uppercase tracking-wide text-muted">{t.dash.byDay}</p>
                      {byDay.days.length === 0 ? (
                        <p className="mt-1 text-sm text-muted">{t.dash.noDeclared}</p>
                      ) : (
                        <ul className="mt-1">
                          {byDay.days.map((d) => {
                            const dayOpen = openDay === d.date;
                            return (
                              <li key={d.date} className="py-1">
                                <button
                                  type="button"
                                  onClick={() => setOpenDay(dayOpen ? null : d.date)}
                                  className="flex w-full items-center justify-between gap-2 py-1 text-left text-sm"
                                >
                                  <span className="tabular">{formatDate(d.date)}</span>
                                  <span className="tabular">{formatEur(d.total, locale)}</span>
                                </button>
                                {dayOpen ? (
                                  <div className="mb-2">
                                    <p className="text-[11px] uppercase tracking-wide text-muted">
                                      {t.dash.invoicesThatDay}
                                    </p>
                                    <ul className="mt-1 space-y-1">
                                      {d.invoices.map((inv) => (
                                        <li key={inv.id}>
                                          <Link
                                            href={`/facturas/${inv.id}`}
                                            className="flex items-center justify-between gap-2 text-sm text-terracotta hover:underline"
                                          >
                                            <span>
                                              {inv.number ?? "—"} · {clientName(inv.clientId)}
                                            </span>
                                            <span className="tabular text-ink">
                                              {formatEur(cobradoEur(inv), locale)}
                                            </span>
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
