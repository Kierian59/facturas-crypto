import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  const row = await prisma.proofFile.findUnique({ where: { userId_id: { userId, id } } });
  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const body = new Uint8Array(Buffer.from(row.data, "base64"));
  return new NextResponse(body, {
    headers: {
      "content-type": row.mime,
      "content-disposition": `inline; filename="${row.name.replace(/"/g, "")}"`,
      "x-content-type-options": "nosniff",
      "cache-control": "private, max-age=3600",
    },
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await params;
  await prisma.proofFile.deleteMany({ where: { userId, id } });
  return NextResponse.json({ ok: true });
}
