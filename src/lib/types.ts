import { DEFAULT_ACTIVITY, type Locale } from "./i18n";

export type InvoiceStatus = "brouillon" | "emise" | "cobrada";

export type Wallet = {
  id: string;
  label: string;
  asset: string;
  network: string;
  address: string;
};

export type Settings = {
  onboarded: boolean;
  locale: Locale;
  nombre: string;
  nif: string;
  direccion: string;
  ciudad: string;
  cp: string;
  email: string;
  activity: string;
  defaultAsset: string;
  wallets: Wallet[];
  seriesPrefix: string;
  nextSeq: number;
};

export type Client = {
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
};

export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPriceEur: number;
};

export type CryptoPayment = {
  asset: string;
  amount: number;
  eurEquivalent: number;
  rate: number;
  rateDate: string;
  rateSource: string;
  txHash: string;
  network: string;
  walletId: string;
  walletAddress: string;
};

export type Invoice = {
  id: string;
  number: string | null;
  status: InvoiceStatus;
  clientId: string;
  issueDate: string;
  serviceDate: string;
  dueDate: string;
  cobroDate: string;
  items: LineItem[];
  notes: string;
  irpfRate: number;
  payment: CryptoPayment | null;
  huella: string;
  createdAt: string;
  updatedAt: string;
};

export type Database = {
  version: 2;
  settings: Settings;
  clients: Client[];
  invoices: Invoice[];
};

export const CRYPTO_ASSETS = [
  "USDT",
  "USDC",
  "EURC",
  "BTC",
  "ETH",
  "SOL",
] as const;

export const NETWORKS: Record<string, string[]> = {
  USDT: ["TRC20", "ERC20", "BEP20", "Solana", "Autre"],
  USDC: ["ERC20", "Solana", "Base", "Autre"],
  EURC: ["ERC20", "Solana", "Autre"],
  BTC: ["Bitcoin", "Lightning", "Autre"],
  ETH: ["Ethereum", "Autre"],
  SOL: ["Solana", "Autre"],
};

/** Toutes les réseaux connus (proposés pour une crypto saisie librement, ex. PEPE, un token maison…). */
export const ALL_NETWORKS: string[] = [
  ...new Set(Object.values(NETWORKS).flat().filter((n) => n !== "Autre")),
  "Autre",
];

/** Crypto saisie librement : on nettoie seulement les espaces (SOL, PEPE, « mon token »… tout est accepté). */
export function cleanAsset(asset: string): string {
  return asset.trim().replace(/\s+/g, " ");
}

/** Réseaux proposés pour une crypto (insensible à la casse) ; la valeur courante est toujours conservée. */
export function networksFor(asset: string, current?: string): string[] {
  const list = NETWORKS[cleanAsset(asset).toUpperCase()] ?? ALL_NETWORKS;
  return current && !list.includes(current) ? [current, ...list] : list;
}

export function emptySettings(): Settings {
  const year = new Date().getFullYear();
  return {
    onboarded: false,
    locale: "es",
    nombre: "",
    nif: "",
    direccion: "",
    ciudad: "",
    cp: "",
    email: "",
    activity: DEFAULT_ACTIVITY.es,
    defaultAsset: "USDT",
    wallets: [
      {
        id: "w-default",
        label: "USDT principal",
        asset: "USDT",
        network: "TRC20",
        address: "",
      },
    ],
    seriesPrefix: "F-" + year + "-",
    nextSeq: 1,
  };
}

export function emptyDatabase(): Database {
  return {
    version: 2,
    settings: emptySettings(),
    clients: [],
    invoices: [],
  };
}
