import type { CryptoProof, Invoice, ProofFileRef } from "./types";

/** Taille max d'une pièce jointe (après compression pour les images). */
export const PROOF_MAX_BYTES = 1_000_000;
export const PROOF_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

export function emptyProof(inv?: Invoice): CryptoProof {
  const p = inv?.payment ?? null;
  return {
    txHash: p?.txHash ?? "",
    network: p?.network ?? "",
    toWallet: p?.walletAddress ?? "",
    fromWallet: "",
    amount: p ? String(p.amount) : "",
    asset: p?.asset ?? "",
    receivedAt: "",
    receivedTz: "",
    txFile: null,
    rateSource: p?.rateSource ?? "",
    rate: p && p.rate ? String(Number(p.rate.toFixed(8))) : "",
    rateDate: p?.rateDate ?? "",
    rateUrl: "",
    rateFile: null,
    updatedAt: "",
  };
}

/** Normalise un justificatif lu en base (anciennes données / JSON importé). */
export function normalizeProof(raw: Partial<CryptoProof> | null | undefined): CryptoProof | null {
  if (!raw || typeof raw !== "object") return null;
  const b = emptyProof();
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    ...b,
    txHash: s(raw.txHash), network: s(raw.network), toWallet: s(raw.toWallet), fromWallet: s(raw.fromWallet),
    amount: s(raw.amount), asset: s(raw.asset), receivedAt: s(raw.receivedAt), receivedTz: s(raw.receivedTz),
    txFile: raw.txFile && typeof raw.txFile.id === "string" ? raw.txFile : null,
    rateSource: s(raw.rateSource), rate: s(raw.rate), rateDate: s(raw.rateDate), rateUrl: s(raw.rateUrl),
    rateFile: raw.rateFile && typeof raw.rateFile.id === "string" ? raw.rateFile : null,
    updatedAt: s(raw.updatedAt),
  };
}

export type ProofState = "none" | "incomplete" | "complete";

/** Champs « essentiels » du justificatif (les pièces jointes sont recommandées mais pas exigées). */
export function missingProofFields(p: CryptoProof | null | undefined): string[] {
  const x = p ?? null;
  const miss: string[] = [];
  if (!x?.txHash.trim()) miss.push("txHash");
  if (!x?.toWallet.trim()) miss.push("toWallet");
  if (!x?.fromWallet.trim()) miss.push("fromWallet");
  if (!x?.amount.trim() || !x?.asset.trim()) miss.push("amount");
  if (!x?.receivedAt) miss.push("receivedAt");
  if (!x?.rateSource.trim() || !x?.rate.trim() || !x?.rateDate) miss.push("rate");
  return miss;
}

export function proofHasData(p: CryptoProof | null | undefined): boolean {
  if (!p) return false;
  return Boolean(
    p.txHash.trim() || p.toWallet.trim() || p.fromWallet.trim() || p.amount.trim() || p.receivedAt ||
    p.rateSource.trim() || p.rate.trim() || p.rateUrl.trim() || p.txFile || p.rateFile,
  );
}

export function proofState(p: CryptoProof | null | undefined): ProofState {
  if (!proofHasData(p)) return "none";
  return missingProofFields(p).length === 0 ? "complete" : "incomplete";
}

const EXPLORERS: Record<string, string> = {
  TRC20: "https://tronscan.org/#/transaction/",
  TRON: "https://tronscan.org/#/transaction/",
  ERC20: "https://etherscan.io/tx/",
  ETHEREUM: "https://etherscan.io/tx/",
  BEP20: "https://bscscan.com/tx/",
  BSC: "https://bscscan.com/tx/",
  SOLANA: "https://solscan.io/tx/",
  BASE: "https://basescan.org/tx/",
  BITCOIN: "https://mempool.space/tx/",
  POLYGON: "https://polygonscan.com/tx/",
  ARBITRUM: "https://arbiscan.io/tx/",
  OPTIMISM: "https://optimistic.etherscan.io/tx/",
};

/** Lien explorateur si le réseau est connu et le hash plausible ; sinon null (le hash reste du texte libre). */
export function explorerUrl(network: string, txHash: string): string | null {
  const base = EXPLORERS[network.trim().toUpperCase()];
  const h = txHash.trim();
  if (!base || !/^[0-9a-zA-Z]{20,128}$/.test(h)) return null;
  return base + encodeURIComponent(h);
}

/** Décimal saisi (point ou virgule) → texte normalisé avec point ; null si invalide. */
export function normalizeDecimal(v: string): string | null {
  const s = v.trim().replace(/\s/g, "").replace(",", ".");
  if (!s) return "";
  return /^\d+(\.\d+)?$/.test(s) ? s : null;
}

export function safeUrl(u: string): string | null {
  const s = u.trim();
  if (!s) return null;
  try {
    const url = new URL(s);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function fileUrl(f: ProofFileRef): string {
  return `/api/proof-files/${encodeURIComponent(f.id)}`;
}

export function formatDateTime(local: string, tz: string): string {
  if (!local) return "—";
  const [d, t] = local.split("T");
  const [y, m, day] = (d ?? "").split("-");
  return `${day}/${m}/${y}${t ? " " + t : ""}${tz ? ` (${tz})` : ""}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const res = String(r.result ?? "");
      resolve(res.slice(res.indexOf(",") + 1));
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function compressImage(file: File): Promise<Blob | null> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return null;
  let maxSide = 1800;
  let quality = 0.85;
  for (let i = 0; i < 6; i++) {
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * scale));
    c.height = Math.max(1, Math.round(bmp.height * scale));
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", quality));
    if (blob && blob.size <= PROOF_MAX_BYTES * 0.9) return blob;
    maxSide = Math.round(maxSide * 0.8);
    quality = Math.max(0.5, quality - 0.08);
  }
  return null;
}

export type UploadResult = { ok: true; ref: ProofFileRef } | { ok: false; error: "tooBig" | "type" | "failed" };

/** Compresse (images) puis envoie la pièce jointe à /api/proof-files (table à part, pas dans le JSON de la facture). */
export async function uploadProofFile(invoiceId: string, file: File): Promise<UploadResult> {
  const isPdf = file.type === "application/pdf";
  const isImg = /^image\/(jpeg|png|webp)$/.test(file.type);
  if (!isPdf && !isImg) return { ok: false, error: "type" };
  let blob: Blob = file;
  let name = file.name;
  let mime = file.type;
  if (isImg) {
    const c = await compressImage(file);
    if (!c) return { ok: false, error: "tooBig" };
    blob = c;
    mime = "image/jpeg";
    name = name.replace(/\.[a-z0-9]+$/i, "") + ".jpg";
  }
  if (blob.size > PROOF_MAX_BYTES) return { ok: false, error: "tooBig" };
  try {
    const res = await fetch("/api/proof-files", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invoiceId, name, mime, data: await blobToBase64(blob) }),
    });
    if (res.status === 413) return { ok: false, error: "tooBig" };
    if (!res.ok) return { ok: false, error: "failed" };
    return { ok: true, ref: (await res.json()) as ProofFileRef };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function deleteProofFile(id: string): Promise<void> {
  try {
    await fetch(`/api/proof-files/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch {
    /* un fichier orphelin est purgé à la suppression de la facture */
  }
}
