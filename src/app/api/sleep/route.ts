import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyClientSession } from "@/lib/zona-auth";

/**
 * GET /api/sleep - Obtiene logs de sueño del perfil
 * POST /api/sleep - Crea nuevo log de sueño
 */
export async function GET(req: NextRequest) {
  try {
    const session = await verifyClientSession(req);
    if (!session?.profileId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - days);

    const logs = await db.sleepLog.findMany({
      where: {
        profileId: session.profileId,
        date: { gte: limitDate },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching sleep logs:", error);
    return NextResponse.json({ error: "Error al cargar datos de sueño" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyClientSession(req);
    if (!session?.profileId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { date, hours, quality, notes } = body;

    // Normalizar fecha a medianoche
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const log = await db.sleepLog.upsert({
      where: {
        profileId_date: {
          profileId: session.profileId,
          date: normalizedDate,
        },
      },
      update: {
        hours: parseFloat(hours),
        quality: quality ? parseInt(quality) : null,
        notes: notes || null,
      },
      create: {
        profileId: session.profileId,
        date: normalizedDate,
        hours: parseFloat(hours),
        quality: quality ? parseInt(quality) : null,
        notes: notes || null,
      },
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error("Error saving sleep log:", error);
    return NextResponse.json({ error: "Error al guardar datos de sueño" }, { status: 500 });
  }
}
