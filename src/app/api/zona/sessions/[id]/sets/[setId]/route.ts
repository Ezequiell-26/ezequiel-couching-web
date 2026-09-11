import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireZonaProfile, zonaUnauthorized } from "@/lib/zona-auth";
import { computeVolumeKg } from "@/lib/zona-utils";

export const dynamic = "force-dynamic";

/** DELETE /api/zona/sessions/[id]/sets/[setId] — borra una serie y recomputa el volumen. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; setId: string }> },
) {
  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const { id, setId } = await params;
    const sessionId = Number(id);
    const setNumId = Number(setId);
    if (!Number.isInteger(sessionId) || sessionId < 1 || !Number.isInteger(setNumId) || setNumId < 1) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    // Owner doble join: la sesión debe ser del perfil y la serie de esa sesión.
    const session = await db.workoutSession.findFirst({
      where: { id: sessionId, profileId: profile.id },
      select: { id: true },
    });
    if (!session) {
      return NextResponse.json({ error: "Sesión no encontrada." }, { status: 404 });
    }

    const set = await db.setLog.findFirst({
      where: { id: setNumId, sessionId: session.id },
      select: { id: true },
    });
    if (!set) {
      return NextResponse.json({ error: "Serie no encontrada." }, { status: 404 });
    }

    const volumeKg = await db.$transaction(async (tx) => {
      await tx.setLog.delete({ where: { id: set.id } });
      const sets = await tx.setLog.findMany({
        where: { sessionId: session.id },
        select: { weightKg: true, reps: true },
      });
      const volume = computeVolumeKg(sets);
      await tx.workoutSession.update({ where: { id: session.id }, data: { volumeKg: volume } });
      return volume;
    });

    return NextResponse.json({ ok: true, volumeKg });
  } catch (error) {
    console.error("[api/zona/sessions/id/sets/setId DELETE]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
