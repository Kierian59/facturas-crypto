import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import {
  emptySettings,
  type Client,
  type CryptoPayment,
  type Database,
  type Invoice,
  type InvoiceStatus,
  type LineItem,
  type Settings,
  type Wallet,
} from "./types";
import { isLocale } from "./i18n";

function asWallets(value: unknown): Wallet[] {
  if (!Array.isArray(value)) return emptySettings().wallets;
  return value as Wallet[];
}

function asItems(value: unknown): LineItem[] {
  if (!Array.isArray(value)) return [];
  return value as LineItem[];
}

function asPayment(value: unknown): CryptoPayment | null {
  if (!value || typeof value !== "object") return null;
  return value as CryptoPayment;
}

function settingsFromRow(row: {
  onboarded: boolean;
  locale: string;
  nombre: string;
  nif: string;
  direccion: string;
  ciudad: string;
  cp: string;
  email: string;
  activity: string;
  defaultAsset: string;
  wallets: unknown;
  seriesPrefix: string;
  nextSeq: number;
}): Settings {
  const base = emptySettings();
  return {
    onboarded: row.onboarded,
    locale: isLocale(row.locale) ? row.locale : base.locale,
    nombre: row.nombre,
    nif: row.nif,
    direccion: row.direccion,
    ciudad: row.ciudad,
    cp: row.cp,
    email: row.email,
    activity: row.activity || base.activity,
    defaultAsset: row.defaultAsset || base.defaultAsset,
    wallets: asWallets(row.wallets),
    seriesPrefix: row.seriesPrefix || base.seriesPrefix,
    nextSeq: row.nextSeq || 1,
  };
}

function clientFromRow(row: {
  id: string;
  brand: string;
  country: string;
  countryCode: string;
  address: string;
  taxId: string;
  email: string;
  notes: string;
  horsUE: boolean;
  createdAt: string;
}): Client {
  return {
    id: row.id,
    brand: row.brand,
    country: row.country,
    countryCode: row.countryCode,
    address: row.address,
    taxId: row.taxId,
    email: row.email,
    notes: row.notes,
    horsUE: row.horsUE,
    createdAt: row.createdAt,
  };
}

function invoiceFromRow(row: {
  id: string;
  number: string | null;
  status: string;
  clientId: string;
  issueDate: string;
  serviceDate: string;
  dueDate: string;
  cobroDate: string;
  items: unknown;
  notes: string;
  irpfRate: number;
  payment: unknown;
  huella: string;
  createdAt: string;
  updatedAt: string;
}): Invoice {
  return {
    id: row.id,
    number: row.number,
    status: row.status as InvoiceStatus,
    clientId: row.clientId,
    issueDate: row.issueDate,
    serviceDate: row.serviceDate,
    dueDate: row.dueDate,
    cobroDate: row.cobroDate,
    items: asItems(row.items),
    notes: row.notes,
    irpfRate: row.irpfRate,
    payment: asPayment(row.payment),
    huella: row.huella,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getUserDatabase(userId: string): Promise<Database & { isNew: boolean }> {
  const [settingsRow, clients, invoices] = await Promise.all([
    prisma.settings.findUnique({ where: { userId } }),
    prisma.client.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.invoice.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
  ]);

  if (!settingsRow) {
    return {
      version: 2,
      settings: emptySettings(),
      clients: [],
      invoices: [],
      isNew: true,
    };
  }

  return {
    version: 2,
    settings: settingsFromRow(settingsRow),
    clients: clients.map(clientFromRow),
    invoices: invoices.map(invoiceFromRow),
    isNew: false,
  };
}

export async function saveUserDatabase(userId: string, db: Database): Promise<Database> {
  const settings = db.settings;
  const wallets = settings.wallets as unknown as Prisma.InputJsonValue;

  await prisma.$transaction(async (tx) => {
    await tx.settings.upsert({
      where: { userId },
      create: {
        userId,
        onboarded: settings.onboarded,
        locale: settings.locale,
        nombre: settings.nombre,
        nif: settings.nif,
        direccion: settings.direccion,
        ciudad: settings.ciudad,
        cp: settings.cp,
        email: settings.email,
        activity: settings.activity,
        defaultAsset: settings.defaultAsset,
        wallets,
        seriesPrefix: settings.seriesPrefix,
        nextSeq: settings.nextSeq,
      },
      update: {
        onboarded: settings.onboarded,
        locale: settings.locale,
        nombre: settings.nombre,
        nif: settings.nif,
        direccion: settings.direccion,
        ciudad: settings.ciudad,
        cp: settings.cp,
        email: settings.email,
        activity: settings.activity,
        defaultAsset: settings.defaultAsset,
        wallets,
        seriesPrefix: settings.seriesPrefix,
        nextSeq: settings.nextSeq,
      },
    });

    await tx.client.deleteMany({ where: { userId } });
    if (db.clients.length > 0) {
      await tx.client.createMany({
        data: db.clients.map((c) => ({
          userId,
          id: c.id,
          brand: c.brand,
          country: c.country,
          countryCode: c.countryCode,
          address: c.address,
          taxId: c.taxId,
          email: c.email,
          notes: c.notes,
          horsUE: c.horsUE,
          createdAt: c.createdAt,
        })),
      });
    }

    await tx.invoice.deleteMany({ where: { userId } });
    if (db.invoices.length > 0) {
      await tx.invoice.createMany({
        data: db.invoices.map((inv) => ({
          userId,
          id: inv.id,
          number: inv.number,
          status: inv.status,
          clientId: inv.clientId,
          issueDate: inv.issueDate,
          serviceDate: inv.serviceDate,
          dueDate: inv.dueDate,
          cobroDate: inv.cobroDate,
          items: inv.items as unknown as Prisma.InputJsonValue,
          notes: inv.notes,
          irpfRate: inv.irpfRate,
          payment: (inv.payment ?? undefined) as unknown as Prisma.InputJsonValue | undefined,
          huella: inv.huella,
          createdAt: inv.createdAt,
          updatedAt: inv.updatedAt,
        })),
      });
    }
  });

  const next = await getUserDatabase(userId);
  const { isNew: _ignored, ...rest } = next;
  return rest;
}

export function isDatabasePayload(value: unknown): value is Database {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.settings === "object" &&
    v.settings !== null &&
    Array.isArray(v.clients) &&
    Array.isArray(v.invoices)
  );
}
