"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Client, CryptoPayment, Database, Invoice, Settings } from "./types";
import { emptyDatabase, emptySettings } from "./types";
import { loadDb, saveDb, parseImport } from "./storage";
import { padSeq, uid, isoDate } from "./format";
import { canLoadSample, buildSample } from "./sample";
import { dict, type Dict } from "./i18n";
import { invoiceHuella } from "./aeat";

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
  emitInvoice: (id: string) => Promise<{ ok: true; number: string } | { ok: false; error: string }>;
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
  const dbRef = useRef(db);

  useEffect(() => {
    const loaded = loadDb();
    dbRef.current = loaded;
    setDb(loaded);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveDb(db);
  }, [db, ready]);

  const mutate = useCallback((fn: (prev: Database) => Database) => {
    const next = fn(dbRef.current);
    dbRef.current = next;
    setDb(next);
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
        version: 2,
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

  const emitInvoice = useCallback(async (id: string) => {
    const d = dbRef.current;
    const t = dict(d.settings.locale);
    const inv = d.invoices.find((x) => x.id === id);
    if (!inv) return { ok: false as const, error: t.errors.invoiceNotFound };
    if (inv.status !== "brouillon") return { ok: false as const, error: t.errors.onlyDrafts };
    const number = `${d.settings.seriesPrefix}${padSeq(d.settings.nextSeq)}`;
    const now = isoDate();
    const issueDate = inv.issueDate || now;
    const huella = await invoiceHuella({ ...inv, number, issueDate }, d.settings.nif);
    let result: { ok: true; number: string } | { ok: false; error: string } = {
      ok: true,
      number,
    };
    mutate((prev) => {
      const current = prev.invoices.find((x) => x.id === id);
      if (!current || current.status !== "brouillon") {
        result = { ok: false, error: dict(prev.settings.locale).errors.onlyDrafts };
        return prev;
      }
      return {
        ...prev,
        settings: { ...prev.settings, nextSeq: prev.settings.nextSeq + 1 },
        invoices: prev.invoices.map((x) =>
          x.id === id
            ? {
                ...x,
                number,
                status: "emise" as const,
                issueDate: x.issueDate || now,
                huella,
                updatedAt: now,
              }
            : x,
        ),
      };
    });
    return result;
  }, [mutate]);

  const recordPayment = useCallback((id: string, payment: CryptoPayment, cobroDate: string) => {
    let result: { ok: true } | { ok: false; error: string } = { ok: true };
    mutate((d) => {
      const t = dict(d.settings.locale);
      if (!payment.eurEquivalent || payment.eurEquivalent <= 0) {
        result = { ok: false, error: t.errors.eurRequired };
        return d;
      }
      const inv = d.invoices.find((x) => x.id === id);
      if (!inv || inv.status === "brouillon") {
        result = { ok: false, error: t.errors.invoiceDraft };
        return d;
      }
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
    return result;
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
        serviceDate: now,
        dueDate: inv.dueDate,
        cobroDate: "",
        payment: null,
        huella: "",
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
          error: dict(d.settings.locale).errors.sampleSkipped,
        };
        return d;
      }
      return buildSample(d.settings.locale ?? "es");
    });
    return result;
  }, [mutate]);

  const exportData = useCallback(() => JSON.stringify(db, null, 2), [db]);

  const importData = useCallback((text: string) => {
    try {
      const next = parseImport(text);
      dbRef.current = next;
      setDb(next);
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: dict("es").errors.badJson };
    }
  }, []);

  const resetAll = useCallback(() => {
    const empty = { version: 2 as const, settings: emptySettings(), clients: [], invoices: [] };
    dbRef.current = empty;
    setDb(empty);
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

export function useT(): Dict {
  const { settings } = useStore();
  return dict(settings.locale);
}
