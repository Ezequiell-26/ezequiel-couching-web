import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyClientSession } from "@/lib/zona-auth";

/**
 * GET /api/export - Obtiene exportaciones del perfil
 * POST /api/export - Solicita nueva exportación
 */
export async function GET(req: NextRequest) {
  try {
    const session = await verifyClientSession(req);
    if (!session?.profileId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const exports = await db.export.findMany({
      where: { profileId: session.profileId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(exports);
  } catch (error) {
    console.error("Error fetching exports:", error);
    return NextResponse.json({ error: "Error al cargar exportaciones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyClientSession(req);
    if (!session?.profileId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { type, format } = body;

    if (!type || !format) {
      return NextResponse.json({ error: "Tipo y formato son requeridos" }, { status: 400 });
    }

    // Crear registro de exportación pendiente
    const exportRecord = await db.export.create({
      data: {
        profileId: session.profileId,
        type, // routines | progress | workouts | nutrition
        format, // pdf | csv | json | ics
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
      },
    });

    // Aquí iría la lógica real de generación del archivo
    // Por ahora solo creamos el registro y retornamos ID
    // En producción usarías colas (Bull, Agenda) para procesar en background

    return NextResponse.json({
      id: exportRecord.id,
      status: "pending",
      message: "Exportación en proceso. El archivo estará disponible pronto.",
    });
  } catch (error) {
    console.error("Error creating export:", error);
    return NextResponse.json({ error: "Error al crear exportación" }, { status: 500 });
  }
}
