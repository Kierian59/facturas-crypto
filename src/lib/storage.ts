import { emptyDatabase, type Database, type Settings, type Client, type Invoice } from "./types";

const KEY = "facturas-crypto-v1";

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function migrate(raw: unknown): Database {
  const base = emptyDatabase();
  if (!isObj(raw)) return base;
  const settings = isObj(raw.settings) ? { ...base.settings, ...(raw.settings as Partial<Settings>) } : base.settings;
  const clients = Array.isArray(raw.clients) ? (raw.clients as Client[]) : [];
  const invoices = Array.isArray(raw.invoices) ? (raw.invoices as Invoice[]) : [];
  return { version: 1, settings, clients, invoices };
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
