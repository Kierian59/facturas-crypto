import { emptyDatabase, type Database, type Settings, type Client, type Invoice } from "./types";
import { isLocale } from "./i18n";

const KEY = "facturas-crypto-v1";

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function migrateClient(raw: unknown): Client | null {
  if (!isObj(raw) || typeof raw.id !== "string") return null;
  return {
    id: raw.id,
    brand: typeof raw.brand === "string" ? raw.brand : "",
    country: typeof raw.country === "string" ? raw.country : "",
    countryCode: typeof raw.countryCode === "string" ? raw.countryCode : "",
    address: typeof raw.address === "string" ? raw.address : "",
    taxId: typeof raw.taxId === "string" ? raw.taxId : "",
    email: typeof raw.email === "string" ? raw.email : "",
    notes: typeof raw.notes === "string" ? raw.notes : "",
    horsUE: Boolean(raw.horsUE),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
  };
}

function migrate(raw: unknown): Database {
  const base = emptyDatabase();
  if (!isObj(raw)) return base;
  const merged = isObj(raw.settings)
    ? { ...base.settings, ...(raw.settings as Partial<Settings>) }
    : base.settings;
  const settings: Settings = {
    ...merged,
    locale: isLocale(merged.locale) ? merged.locale : "es",
  };
  const clients = Array.isArray(raw.clients)
    ? raw.clients.map(migrateClient).filter((c): c is Client => c !== null)
    : [];
  const invoices = Array.isArray(raw.invoices)
    ? (raw.invoices as Invoice[]).map((inv) => {
        const issueDate = typeof inv.issueDate === "string" ? inv.issueDate : "";
        const serviceDate =
          typeof inv.serviceDate === "string" && inv.serviceDate ? inv.serviceDate : issueDate;
        return {
          ...inv,
          issueDate,
          serviceDate,
          huella: typeof inv.huella === "string" ? inv.huella : "",
        };
      })
    : [];
  return { version: 2, settings, clients, invoices };
}

export function loadDb(): Database {
  if (typeof window === "undefined") return emptyDatabase();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyDatabase();
    return migrate(JSON.parse(raw));
  } catch {
    return emptyDatabase();
  }
}

export function saveDb(db: Database): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(db));
}

export function exportJson(db: Database): string {
  return JSON.stringify(db, null, 2);
}

export function parseImport(text: string): Database {
  const parsed = JSON.parse(text) as unknown;
  return migrate(parsed);
}
