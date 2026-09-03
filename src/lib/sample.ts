import type { Database, Client, Invoice } from "./types";
import { emptySettings } from "./types";
import { uid, isoDate, addDays } from "./format";
import { DEFAULT_ACTIVITY, type Locale } from "./i18n";

export function canLoadSample(db: Database): boolean {
  return !db.settings.onboarded && db.clients.length === 0 && db.invoices.length === 0;
}

export function buildSample(locale: Locale = "es"): Database {
  const es = locale !== "fr";
  const today = isoDate();
  const lastMonth = addDays(today, -28);
  const twoMonths = addDays(today, -55);
  const overdueDate = addDays(today, -12);
  const dueSoon = addDays(today, 8);

  const settings = emptySettings();
  settings.onboarded = true;
  settings.locale = locale;
  settings.nombre = "Camille Navarro";
  settings.nif = "12345678Z";
  settings.direccion = "Carrer de la Pau 14, 3º";
  settings.ciudad = "València";
  settings.cp = "46003";
  settings.email = "camille@estudio-navarro.example";
  settings.activity = DEFAULT_ACTIVITY[locale];
  settings.defaultAsset = "USDT";
  settings.wallets = [
    {
      id: "w-usdt",
      label: "USDT TRC20",
      asset: "USDT",
      network: "TRC20",
      address: "TXYZdemoWalletDoNotUse111111111111",
    },
    {
      id: "w-btc",
      label: "BTC",
      asset: "BTC",
      network: "Bitcoin",
      address: "bc1qdemowalletdonotuse000000000000000",
    },
  ];
  settings.seriesPrefix = "F-2026-";
  settings.nextSeq = 4;

  const c1: Client = {
    id: "c-northstar",
    brand: "Northstar Athletics",
    country: es ? "Estados Unidos" : "États-Unis",
    countryCode: "US",
    address: "1200 Market Street, Suite 400, Austin, TX 78701",
    taxId: "EIN 87-0000000",
    email: "finance@northstar.example",
    notes: es
      ? "Calendario mensual Instagram + TikTok. Contacto: Jordan."
      : "Calendrier mensuel Instagram + TikTok. Contact: Jordan.",
    horsUE: true,
    createdAt: twoMonths,
  };
  const c2: Client = {
    id: "c-kite",
    brand: "Kite & Loom",
    country: es ? "Reino Unido" : "Royaume-Uni",
    countryCode: "GB",
    address: "14 Brick Lane, London E1 6QL",
    taxId: "UT 000000000",
    email: "ap@kiteandloom.example",
    notes: es ? "Stories de producto, 8 piezas / mes." : "Stories produit, 8 pièces / mois.",
    horsUE: true,
    createdAt: lastMonth,
  };

  const invPaid: Invoice = {
    id: "i-paid",
    number: "F-2026-0001",
    status: "cobrada",
    clientId: c1.id,
    issueDate: twoMonths,
    serviceDate: twoMonths,
    dueDate: addDays(twoMonths, 14),
    cobroDate: lastMonth,
    items: [
      {
        id: uid("li"),
        description: es
          ? "Creación y publicación de contenidos sociales — pack febrero (12 piezas Instagram + 8 TikTok)"
          : "Création et publication de contenus sociaux — forfait février (12 pièces Instagram + 8 TikTok)",
        quantity: 1,
        unitPriceEur: 2400,
      },
    ],
    notes: "",
    irpfRate: 0,
    payment: {
      asset: "USDT",
      amount: 2610,
      eurEquivalent: 2400,
      rate: 2400 / 2610,
      rateDate: lastMonth,
      rateSource: es
        ? "Manual — cotización Binance el día del cobro"
        : "Manuel — cours Binance au jour de l'encaissement",
      txHash: "0xdemo0000000000000000000000000000000001",
      network: "TRC20",
      walletId: "w-usdt",
      walletAddress: settings.wallets[0].address,
    },
    huella: "",
    createdAt: twoMonths,
    updatedAt: lastMonth,
  };

  const invOpen: Invoice = {
    id: "i-open",
    number: "F-2026-0002",
    status: "emise",
    clientId: c2.id,
    issueDate: lastMonth,
    serviceDate: lastMonth,
    dueDate: dueSoon,
    cobroDate: "",
    items: [
      {
        id: uid("li"),
        description: es
          ? "Dirección artística y calendario editorial — marzo (8 stories de producto)"
          : "Direction artistique et calendrier éditorial — mars (8 stories produit)",
        quantity: 1,
        unitPriceEur: 1800,
      },
      {
        id: uid("li"),
        description: es
          ? "Rodaje UGC adicional (3 cápsulas)"
          : "Tournage UGC additionnel (3 capsules)",
        quantity: 3,
        unitPriceEur: 220,
      },
    ],
    notes: es ? "Pago USDT TRC20 a la recepción." : "Paiement USDT TRC20 à réception.",
    irpfRate: 0,
    payment: null,
    huella: "",
    createdAt: lastMonth,
    updatedAt: lastMonth,
  };

  const invLate: Invoice = {
    id: "i-late",
    number: "F-2026-0003",
    status: "emise",
    clientId: c1.id,
    issueDate: addDays(today, -40),
    serviceDate: addDays(today, -40),
    dueDate: overdueDate,
    cobroDate: "",
    items: [
      {
        id: uid("li"),
        description: es
          ? "Serie Reels « training week » — 6 publicaciones"
          : "Série Reels « training week » — 6 publications",
        quantity: 1,
        unitPriceEur: 950,
      },
    ],
    notes: "",
    irpfRate: 0,
    payment: null,
    huella: "",
    createdAt: addDays(today, -40),
    updatedAt: addDays(today, -40),
  };

  const invDraft: Invoice = {
    id: "i-draft",
    number: null,
    status: "brouillon",
    clientId: c2.id,
    issueDate: today,
    serviceDate: today,
    dueDate: addDays(today, 14),
    cobroDate: "",
    items: [
      {
        id: uid("li"),
        description: es
          ? "Pack abril — contenidos orgánicos (por confirmar)"
          : "Forfait avril — contenus organiques (à confirmer)",
        quantity: 1,
        unitPriceEur: 1800,
      },
    ],
    notes: "",
    irpfRate: 0,
    payment: null,
    huella: "",
    createdAt: today,
    updatedAt: today,
  };

  return {
    version: 2,
    settings,
    clients: [c1, c2],
    invoices: [invPaid, invOpen, invLate, invDraft],
  };
}
