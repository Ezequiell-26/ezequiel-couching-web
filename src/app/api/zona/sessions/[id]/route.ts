import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireZonaProfile, zonaUnauthorized } from "@/lib/zona-auth";
import { serializeSession, serializeSet } from "@/lib/zona-utils";

export const dynamic = "force-dynamic";

/** GET /api/zona/sessions/[id] — sesión con series y nombres de ejercicios resueltos. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId < 1) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    // Owner check por construcción.
    const session = await db.workoutSession.findFirst({
      where: { id: numId, profileId: profile.id },
      include: {
        sets: { orderBy: { createdAt: "asc" } },
        routine: { select: { name: true } },
      },
    });
    if (!session) {
      return NextResponse.json({ error: "Sesión no encontrada." }, { status: 404 });
    }

    return NextResponse.json({
      ...serializeSession(session, session.sets.length, session.routine?.name ?? null),
      sets: session.sets.map(serializeSet),
    });
  } catch (error) {
    console.error("[api/zona/sessions/id GET]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
