import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyClientSession } from "@/lib/zona-auth";

/**
 * GET /api/notifications - Obtiene notificaciones del perfil
 * POST /api/notifications - Marca notificación como leída
 */
export async function GET(req: NextRequest) {
  try {
    const session = await verifyClientSession(req);
    if (!session?.profileId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const notifications = await db.notification.findMany({
      where: { profileId: session.profileId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Error al cargar notificaciones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyClientSession(req);
    if (!session?.profileId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    await db.notification.update({
      where: { id: parseInt(id) },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json({ error: "Error al actualizar notificación" }, { status: 500 });
  }
}
