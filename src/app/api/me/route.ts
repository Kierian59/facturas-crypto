import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserDatabase, isDatabasePayload, saveUserDatabase } from "@/lib/user-data";
import { emptyDatabase, type Database } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const data = await getUserDatabase(userId);
    const { isNew, ...db } = data;
    return NextResponse.json({ ...db, isNew });
  } catch (err) {
    console.error("GET /api/me", err);
    return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  if (!isDatabasePayload(body)) {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const payload: Database = {
    version: 2,
    settings: body.settings,
    clients: body.clients,
    invoices: body.invoices,
  };

  try {
    const saved = await saveUserDatabase(userId, payload);
    return NextResponse.json(saved);
  } catch (err) {
    console.error("PUT /api/me", err);
    return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
  }
}

/** Import one-shot depuis localStorage (si le compte est encore vide). */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  if (!isDatabasePayload(body)) {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  try {
    const existing = await getUserDatabase(userId);
    const hasData =
      !existing.isNew &&
      (existing.settings.onboarded ||
        existing.clients.length > 0 ||
        existing.invoices.length > 0);
    if (hasData) {
      const { isNew: _i, ...db } = existing;
      return NextResponse.json({ imported: false, reason: "already_has_data", ...db });
    }

    const payload: Database = {
      version: 2,
      settings: body.settings,
      clients: body.clients,
      invoices: body.invoices,
    };
    const saved = await saveUserDatabase(userId, payload);
    return NextResponse.json({ imported: true, ...saved });
  } catch (err) {
    console.error("POST /api/me", err);
    return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
  }
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const empty = emptyDatabase();
    const saved = await saveUserDatabase(userId, empty);
    return NextResponse.json(saved);
  } catch (err) {
    console.error("DELETE /api/me", err);
    return NextResponse.json({ error: "Erreur base de données" }, { status: 500 });
  }
}
