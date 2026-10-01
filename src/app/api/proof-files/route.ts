import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PROOF_MAX_BYTES } from "@/lib/proof";

export const runtime = "nodejs";

const MAX_FILES_PER_INVOICE = 10;

function magicOk(mime: string, buf: Buffer): boolean {
  switch (mime) {
    case "image/jpeg":
      return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case "image/png":
      return buf.length > 4 && buf.subarray(0, 4).toString("hex") === "89504e47";
    case "image/webp":
      return buf.length > 12 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP";
    case "application/pdf":
      return buf.subarray(0, 5).toString() === "%PDF-";
    default:
      return false;
  }
}

/** Dépose une pièce jointe d'un justificatif (≤ 1 Mo, image/PDF). */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const { invoiceId, name, mime, data } = body;
  if (typeof invoiceId !== "string" || !invoiceId || invoiceId.length > 100 || typeof data !== "string" || typeof mime !== "string") {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }
  if (data.length > Math.ceil((PROOF_MAX_BYTES * 4) / 3) + 8) {
    return NextResponse.json({ error: "Fichier trop volumineux" }, { status: 413 });
  }
  const buf = Buffer.from(data, "base64");
  if (buf.length === 0 || buf.length > PROOF_MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux" }, { status: 413 });
  }
  if (!magicOk(mime, buf)) {
    return NextResponse.json({ error: "Type de fichier non accepté" }, { status: 415 });
  }

  try {
    const count = await prisma.proofFile.count({ where: { userId, invoiceId } });
    if (count >= MAX_FILES_PER_INVOICE) {
      return NextResponse.json({ error: "Trop de fichiers pour cette facture" }, { status: 409 });
    }
    const id = `pf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    const safeName = (typeof name === "string" ? name : "justificatif").replace(/[^\w.\- ()]/g, "_").slice(0, 120) || "justificatif";
    await prisma.proofFile.create({
      data: { userId, id, invoiceId, name: safeName, mime, size: buf.length, data: buf.toString("base64") },
    });
    return NextResponse.json({ id, name: safeName, mime, size: buf.length });
  } catch (err) {
    console.error("POST /api/proof-files", err);
    return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
  }
}
