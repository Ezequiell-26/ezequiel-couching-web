import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exerciseName } from "@/lib/content/exercises";
import { requireZonaProfile, zonaUnauthorized } from "@/lib/zona-auth";
import { epley1rm } from "@/lib/zona-utils";

export const dynamic = "force-dynamic";

interface BestSet {
  sessionId: number;
  weightKg: number;
  reps: number;
  e1rm: number;
  finishedAt: Date;
}

/**
 * GET /api/zona/exercise-trend — evolución por ejercicio (Task 27-b).
 *
 * SIN ?exerciseId= → { exercises: [{ exerciseId, exerciseName, sessions }] }:
 * ejercicios con al menos una serie en sesiones COMPLETADAS (finishedAt no
 * null), ordenados por nombre; sessions = cantidad de sesiones completadas
 * que incluyen ese ejercicio (una sesión con varias series cuenta una vez).
 *
 * CON ?exerciseId=X → { points: [{ date, e1rm, weightKg, reps }] }: un punto
 * POR sesión completada — el mejor set de esa sesión según e1RM (Epley, ya
 * redondeado a 1 decimal) — ascendente por fecha de finalización. Solo datos
 * reales: si el ejercicio no tiene series del perfil, points: [] (sin error).
 * ?exerciseId= vacío → 400; sin sesión → 401 (patrón de las rutas de zona).
 */
export async function GET(req: Request) {
  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const url = new URL(req.url);
    const hasParam = url.searchParams.has("exerciseId");
    const exerciseId = (url.searchParams.get("exerciseId") ?? "").trim();

    if (hasParam && !exerciseId) {
      return NextResponse.json({ error: "El parámetro exerciseId está vacío." }, { status: 400 });
    }

    // ── Modo lista: ejercicios entrenados en sesiones completadas ────────
    if (!hasParam) {
      const setPairs = await db.setLog.findMany({
        where: {
          session: { profileId: profile.id, status: "completada", finishedAt: { not: null } },
        },
        select: { exerciseId: true, sessionId: true },
      });

      // Sesiones distintas por ejercicio (una sesión con N series cuenta 1).
      const sessionsByExercise = new Map<string, Set<number>>();
      for (const pair of setPairs) {
        let perSession = sessionsByExercise.get(pair.exerciseId);
        if (!perSession) {
          perSession = new Set();
          sessionsByExercise.set(pair.exerciseId, perSession);
        }
        perSession.add(pair.sessionId);
      }

      const exercises = [...sessionsByExercise.entries()]
        .map(([id, sessionIds]) => ({
          exerciseId: id,
          exerciseName: exerciseName(id),
          sessions: sessionIds.size,
        }))
        .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, "es"));

      return NextResponse.json({ exercises });
    }

    // ── Modo puntos: mejor set por sesión completada del ejercicio ───────
    const sets = await db.setLog.findMany({
      where: {
        exerciseId,
        session: { profileId: profile.id, status: "completada", finishedAt: { not: null } },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        weightKg: true,
        reps: true,
        session: { select: { id: true, finishedAt: true } },
      },
    });

    // Mejor set de cada sesión según e1RM (Epley); empate → mayor peso.
    // Series sin peso (peso corporal sin carga registrada) no generan punto.
    const bestBySession = new Map<number, BestSet>();
    for (const s of sets) {
      if (s.weightKg == null || !s.session.finishedAt) continue;
      const e1rm = epley1rm(s.weightKg, s.reps);
      const current = bestBySession.get(s.session.id);
      if (
        !current ||
        e1rm > current.e1rm ||
        (e1rm === current.e1rm && s.weightKg > current.weightKg)
      ) {
        bestBySession.set(s.session.id, {
          sessionId: s.session.id,
          weightKg: s.weightKg,
          reps: s.reps,
          e1rm,
          finishedAt: s.session.finishedAt,
        });
      }
    }

    const points = [...bestBySession.values()]
      .sort((a, b) => a.finishedAt.getTime() - b.finishedAt.getTime() || a.sessionId - b.sessionId)
      .map((p) => ({
        date: p.finishedAt.toISOString(),
        e1rm: p.e1rm,
        weightKg: p.weightKg,
        reps: p.reps,
      }));

    return NextResponse.json({ points });
  } catch (error) {
    console.error("[api/zona/exercise-trend GET]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
