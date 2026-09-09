import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/admin/messages — lista de mensajes de contacto (más recientes primero). */
export async function GET() {
  const authed = await isAdminRequest();
  if (!authed) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  try {
    const messages = await db.message.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ ok: true, messages });
  } catch (error) {
    console.error("[api/admin/messages]", error);
    return NextResponse.json({ ok: false, error: "Error interno." }, { status: 500 });
  }
}
