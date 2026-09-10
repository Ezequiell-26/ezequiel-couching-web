import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exerciseName } from "@/lib/content/exercises";
import { requireZonaProfile, zonaUnauthorized } from "@/lib/zona-auth";
import { computeVolumeKg, epley1rm, serializeSession } from "@/lib/zona-utils";

export const dynamic = "force-dynamic";

interface NewPR {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  e1rm: number;
}

/**
 * POST /api/zona/sessions/[id]/finish — completa la sesión y detecta PRs
 * comparando el mejor peso de esta sesión contra el máximo de sesiones
 * completadas anteriores del perfil.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId < 1) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    // Owner check por construcción. Al comparar PRs, esta sesión aún está
    // "activa", por lo que queda excluida del máximo previo automáticamente.
    const session = await db.workoutSession.findFirst({
      where: { id: numId, profileId: profile.id },
      include: { sets: true },
    });
    if (!session) {
      return NextResponse.json({ error: "Sesión no encontrada." }, { status: 404 });
    }
    if (session.status !== "activa") {
      return NextResponse.json({ error: "La sesión ya está completada." }, { status: 409 });
    }

    const exerciseIds = [...new Set(session.sets.map((s) => s.exerciseId))];
    const newPRs: NewPR[] = [];

    if (exerciseIds.length > 0) {
      const prevSets = await db.setLog.findMany({
        where: {
          exerciseId: { in: exerciseIds },
          weightKg: { not: null },
          session: { profileId: profile.id, status: "completada" },
        },
        select: { exerciseId: true, weightKg: true },
      });
      const prevMax = new Map<string, number>();
      for (const s of prevSets) {
        if (s.weightKg == null) continue;
        prevMax.set(s.exerciseId, Math.max(prevMax.get(s.exerciseId) ?? -Infinity, s.weightKg));
      }

      for (const exerciseId of exerciseIds) {
        // Mejor serie con peso de ESTA sesión para el ejercicio.
        const best = session.sets
          .filter((s) => s.exerciseId === exerciseId && s.weightKg != null)
          .sort((a, b) => (b.weightKg ?? 0) - (a.weightKg ?? 0))[0];
        if (!best || best.weightKg == null) continue; // peso corporal: sin PR de peso
        const prev = prevMax.get(exerciseId);
        if (prev === undefined || best.weightKg > prev) {
          newPRs.push({
            exerciseId,
            exerciseName: exerciseName(exerciseId),
            weightKg: best.weightKg,
            reps: best.reps,
            e1rm: epley1rm(best.weightKg, best.reps),
          });
        }
      }
      newPRs.sort((a, b) => b.weightKg - a.weightKg);
    }

    const finished = await db.workoutSession.update({
      where: { id: session.id },
      data: {
        status: "completada",
        finishedAt: new Date(),
        volumeKg: computeVolumeKg(session.sets),
      },
      include: { _count: { select: { sets: true } }, routine: { select: { name: true } } },
    });

    return NextResponse.json({
      session: serializeSession(finished, finished._count.sets, finished.routine?.name ?? null),
      newPRs,
    });
  } catch (error) {
    console.error("[api/zona/sessions/id/finish POST]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
