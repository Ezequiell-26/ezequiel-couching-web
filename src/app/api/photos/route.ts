import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyClientSession } from "@/lib/zona-auth";

/**
 * GET /api/photos - Obtiene fotos de progreso del perfil
 * POST /api/photos - Sube nueva foto de progreso
 */
export async function GET(req: NextRequest) {
  try {
    const session = await verifyClientSession(req);
    if (!session?.profileId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const photos = await db.progressPhoto.findMany({
      where: { profileId: session.profileId },
      orderBy: { takenAt: "desc" },
    });

    return NextResponse.json(photos);
  } catch (error) {
    console.error("Error fetching progress photos:", error);
    return NextResponse.json({ error: "Error al cargar fotos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyClientSession(req);
    if (!session?.profileId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { url, type, notes } = body;

    if (!url || !type) {
      return NextResponse.json({ error: "URL y tipo son requeridos" }, { status: 400 });
    }

    const photo = await db.progressPhoto.create({
      data: {
        profileId: session.profileId,
        url,
        type, // front | back | side | comparison
        notes: notes || null,
      },
    });

    return NextResponse.json(photo);
  } catch (error) {
    console.error("Error saving progress photo:", error);
    return NextResponse.json({ error: "Error al guardar foto" }, { status: 500 });
  }
}
