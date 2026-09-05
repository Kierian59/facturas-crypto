"use client";

import type { Database } from "./types";

export const IMPORT_FLAG = "facturas-crypto-imported-v1";

export async function fetchMe(): Promise<(Database & { isNew?: boolean }) | null> {
  const res = await fetch("/api/me", { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as Database & { isNew?: boolean };
}

export async function putMe(db: Database): Promise<boolean> {
  const res = await fetch("/api/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(db),
  });
  return res.ok;
}

export async function postImport(db: Database): Promise<(Database & { imported?: boolean }) | null> {
  const res = await fetch("/api/me", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(db),
  });
  if (!res.ok) return null;
  return (await res.json()) as Database & { imported?: boolean };
}
