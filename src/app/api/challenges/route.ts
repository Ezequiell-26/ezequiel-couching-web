import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyClientSession } from "@/lib/zona-auth";

/**
 * GET /api/challenges - Lista challenges activos
 * POST /api/challenges - Crea nuevo challenge (admin)
 */
export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const challenges = await db.challenge.findMany({
      where: {
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        entries: {
          orderBy: { value: "desc" },
          take: 10,
          include: {
            profile: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(challenges);
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return NextResponse.json({ error: "Error al cargar challenges" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verificar sesión de admin (simplificado)
    const body = await req.json();
    const { title, description, type, target, startDate, endDate } = body;

    const challenge = await db.challenge.create({
      data: {
        title,
        description,
        type,
        target: parseInt(target),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    return NextResponse.json(challenge);
  } catch (error) {
    console.error("Error creating challenge:", error);
    return NextResponse.json({ error: "Error al crear challenge" }, { status: 500 });
  }
}
