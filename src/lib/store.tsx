"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Client, CryptoPayment, Database, Invoice, Settings } from "./types";
import { emptyDatabase, emptySettings } from "./types";
import { loadDb, saveDb, parseImport } from "./storage";
import { padSeq, uid, isoDate } from "./format";
import { canLoadSample, buildSample } from "./sample";

type Store = {
  ready: boolean;
  db: Database;
  settings: Settings;
  clients: Client[];
  invoices: Invoice[];
  updateSettings: (patch: Partial<Settings>) => void;
  setWallets: (wallets: Settings["wallets"]) => void;
  completeOnboarding: (s: Settings) => void;
  upsertClient: (c: Client) => void;
  deleteClient: (id: string) => void;
  upsertInvoice: (inv: Invoice) => void;
  emitInvoice: (id: string) => { ok: true; number: string } | { ok: false; error: string };
  recordPayment: (id: string, payment: CryptoPayment, cobroDate: string) => { ok: true } | { ok: false; error: string };
  duplicateInvoice: (id: string) => Invoice | null;
  deleteInvoice: (id: string) => void;
  loadSample: () => { ok: true } | { ok: false; error: string };
  exportData: () => string;
  importData: (text: string) => { ok: true } | { ok: false; error: string };
  resetAll: () => void;
  sampleAvailable: boolean;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(emptyDatabase);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDb(loadDb());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveDb(db);
  }, [db, ready]);

  const mutate = useCallback((fn: (prev: Database) => Database) => {
    setDb((prev) => fn(prev));
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      mutate((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
    },
    [mutate],
  );

  const setWallets = useCallback(
    (wallets: Settings["wallets"]) => {
      mutate((d) => ({ ...d, settings: { ...d.settings, wallets } }));
    },
    [mutate],
  );

  const completeOnboarding = useCallback(
    (s: Settings) => {
      mutate(() => ({
        version: 1,
        settings: { ...s, onboarded: true },
        clients: [],
        invoices: [],
      }));
    },
    [mutate],
  );

  const upsertClient = useCallback(
    (c: Client) => {
      mutate((d) => {
        const i = d.clients.findIndex((x) => x.id === c.id);
        const clients = i === -1 ? [...d.clients, c] : d.clients.map((x) => (x.id === c.id ? c : x));
        return { ...d, clients };
      });
    },
    [mutate],
  );

  const deleteClient = useCallback(
    (id: string) => {
      mutate((d) => ({
        ...d,
        clients: d.clients.filter((c) => c.id !== id),
      }));
    },
    [mutate],
  );

  const upsertInvoice = useCallback(
    (inv: Invoice) => {
      mutate((d) => {
        const i = d.invoices.findIndex((x) => x.id === inv.id);
        const invoices =
          i === -1 ? [...d.invoices, inv] : d.invoices.map((x) => (x.id === inv.id ? inv : x));
        return { ...d, invoices };
      });
    },
    [mutate],
  );

  const emitInvoice = useCallback((id: string) => {
    let result: { ok: true; number: string } | { ok: false; error: string } = {
      ok: false,
      error: "Factura introuvable.",
    };
    mutate((d) => {
      const inv = d.invoices.find((x) => x.id === id);
      if (!inv) return d;
      if (inv.status !== "brouillon") {
        result = { ok: false, error: "Seuls les brouillons peuvent être émis." };
        return d;
      }
      const number = `${d.settings.seriesPrefix}${padSeq(d.settings.nextSeq)}`;
      const now = isoDate();
      result = { ok: true, number };
      return {
        ...d,
        settings: { ...d.settings, nextSeq: d.settings.nextSeq + 1 },
        invoices: d.invoices.map((x) =>
          x.id === id
            ? {
                ...x,
                number,
                status: "emise" as const,
                issueDate: x.issueDate || now,
                updatedAt: now,
              }
            : x,
        ),
      };
    });
    return result;
  }, [mutate]);

  const recordPayment = useCallback((id: string, payment: CryptoPayment, cobroDate: string) => {
    if (!payment.eurEquivalent || payment.eurEquivalent <= 0) {
      return { ok: false as const, error: "L'équivalent EUR est obligatoire pour marquer cobrada." };
    }
    let ok = false;
    mutate((d) => {
      const inv = d.invoices.find((x) => x.id === id);
      if (!inv || inv.status === "brouillon") return d;
      ok = true;
      return {
        ...d,
        invoices: d.invoices.map((x) =>
          x.id === id
            ? {
                ...x,
                status: "cobrada" as const,
                payment,
                cobroDate: cobroDate || isoDate(),
                updatedAt: isoDate(),
              }
            : x,
        ),
      };
    });
    return ok ? { ok: true as const } : { ok: false as const, error: "Factura introuvable ou encore brouillon." };
  }, [mutate]);

  const duplicateInvoice = useCallback((id: string) => {
    let copy: Invoice | null = null;
    mutate((d) => {
      const inv = d.invoices.find((x) => x.id === id);
      if (!inv) return d;
      const now = isoDate();
      copy = {
        ...inv,
        id: uid("inv"),
        number: null,
        status: "brouillon",
        issueDate: now,
        dueDate: inv.dueDate,
        cobroDate: "",
        payment: null,
        items: inv.items.map((it) => ({ ...it, id: uid("li") })),
        createdAt: now,
        updatedAt: now,
      };
      return { ...d, invoices: [...d.invoices, copy] };
    });
    return copy;
  }, [mutate]);

  const deleteInvoice = useCallback(
    (id: string) => {
      mutate((d) => {
        const inv = d.invoices.find((x) => x.id === id);
        if (!inv) return d;
        if (inv.status !== "brouillon") return d;
        return { ...d, invoices: d.invoices.filter((x) => x.id !== id) };
      });
    },
    [mutate],
  );

  const loadSample = useCallback(() => {
    let result: { ok: true } | { ok: false; error: string } = { ok: true };
    mutate((d) => {
      if (!canLoadSample(d)) {
        result = {
          ok: false,
          error: "Données d'exemple ignorées : tu es déjà configuré·e. Ça évite de polluer ton fichier.",
        };
        return d;
      }
      return buildSample();
    });
    return result;
  }, [mutate]);

  const exportData = useCallback(() => JSON.stringify(db, null, 2), [db]);

  const importData = useCallback((text: string) => {
    try {
      const next = parseImport(text);
      setDb(next);
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: "JSON illisible." };
    }
  }, []);

  const resetAll = useCallback(() => {
    setDb({ version: 1, settings: emptySettings(), clients: [], invoices: [] });
  }, []);

  const value = useMemo<Store>(
    () => ({
      ready,
      db,
      settings: db.settings,
      clients: db.clients,
      invoices: db.invoices,
      updateSettings,
      setWallets,
      completeOnboarding,
      upsertClient,
      deleteClient,
      upsertInvoice,
      emitInvoice,
      recordPayment,
      duplicateInvoice,
      deleteInvoice,
      loadSample,
      exportData,
      importData,
      resetAll,
      sampleAvailable: canLoadSample(db),
    }),
    [
      ready,
      db,
      updateSettings,
      setWallets,
      completeOnboarding,
      upsertClient,
      deleteClient,
      upsertInvoice,
      emitInvoice,
      recordPayment,
      duplicateInvoice,
      deleteInvoice,
      loadSample,
      exportData,
      importData,
      resetAll,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore hors StoreProvider");
  return ctx;
}
