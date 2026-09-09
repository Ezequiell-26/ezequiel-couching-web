import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/admin/leads — lista de leads (más recientes primero). */
export async function GET() {
  const authed = await isAdminRequest();
  if (!authed) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  try {
    const leads = await db.lead.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ ok: true, leads });
  } catch (error) {
    console.error("[api/admin/leads]", error);
    return NextResponse.json({ ok: false, error: "Error interno." }, { status: 500 });
  }
}
