"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore, useT } from "@/lib/store";
import { LanguageToggle } from "@/components/ui";
import { activityForLocale, type Locale } from "@/lib/i18n";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, settings, updateSettings } = useStore();
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const isPrint = pathname.includes("/imprimer");
  const isWelcome = pathname.startsWith("/bienvenue");

  useEffect(() => {
    if (!ready) return;
    if (!settings.onboarded && !isWelcome) router.replace("/bienvenue");
    if (settings.onboarded && isWelcome) router.replace("/");
  }, [ready, settings.onboarded, isWelcome, router]);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = settings.locale === "fr" ? "fr" : "es";
  }, [ready, settings.locale]);

  function setLocale(locale: Locale) {
    updateSettings({
      locale,
      activity: activityForLocale(settings.activity, locale),
    });
  }

  const NAV = [
    { href: "/", label: t.nav.dashboard, icon: IconHome },
    { href: "/facturas", label: t.nav.facturas, icon: IconSheet },
    { href: "/clients", label: t.nav.clients, icon: IconPeople },
    { href: "/parametres", label: t.nav.settings, icon: IconGear },
  ];

  if (!ready) {
    return (
      <div className="min-h-dvh grid place-items-center">
        <div className="text-center">
          <div className="stamp mx-auto text-lg">F</div>
          <p className="mt-3 font-display text-lg">Facturas</p>
          <p className="text-sm text-muted">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (isPrint) return <>{children}</>;

  if (!settings.onboarded) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15.5rem_1fr]">
      <aside className="no-print hidden md:flex md:flex-col border-r border-line bg-paper-2/50 px-5 py-6">
        <Link href="/" className="flex items-center gap-3 mb-8">
          <span className="stamp text-base">F</span>
          <span>
            <span className="block font-display text-[1.15rem] leading-tight">Facturas</span>
            <span className="block text-[11px] uppercase tracking-[0.16em] text-muted">
              {t.cryptoEur}
            </span>
          </span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-olive text-[#f6f3ec]"
                    : "text-ink-soft hover:bg-card"
                }`}
              >
                <item.icon />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-8 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted">{t.lang}</span>
            <LanguageToggle locale={settings.locale} onChange={setLocale} />
          </div>
          <p className="text-[11px] leading-relaxed text-muted">
            {t.localTool}
          </p>
        </div>
      </aside>

      <div className="pb-24 md:pb-0">
        <header className="no-print md:hidden sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur">
          <span className="stamp text-sm">F</span>
          <span className="font-display text-lg">Facturas</span>
          <span className="ml-auto">
            <LanguageToggle locale={settings.locale} onChange={setLocale} />
          </span>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-5 md:px-8 md:py-8">{children}</main>
      </div>

      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-line bg-card/95 backdrop-blur">
        <ul className="grid grid-cols-4">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${
                    active ? "text-terracotta" : "text-muted"
                  }`}
                >
                  <item.icon />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}
function IconSheet() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 3h8l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M15 3v5h5M8 13h8M8 17h6" />
    </svg>
  );
}
function IconPeople() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.6-3 2.8-5 5.5-5s4.9 2 5.5 5" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M16 14.2c2.2.4 3.8 2 4.4 4.3" />
    </svg>
  );
}
function IconGear() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3V20.5M4.8 6.5l1.6 1.6M17.6 15.9l1.6 1.6M3.5 12h2.2M18.3 12H20.5M4.8 17.5l1.6-1.6M17.6 8.1l1.6-1.6" />
    </svg>
  );
}
