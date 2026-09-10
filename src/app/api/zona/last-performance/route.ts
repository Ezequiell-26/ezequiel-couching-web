import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getExerciseById } from "@/lib/content/exercises";
import { requireZonaProfile, zonaUnauthorized } from "@/lib/zona-auth";

export const dynamic = "force-dynamic";

interface PerfSet {
  weightKg: number | null;
  reps: number;
  setNumber: number;
  createdAt: Date;
  session: { id: number; finishedAt: Date | null };
}

interface Performance {
  weightKg: number | null;
  reps: number;
  date: string | null;
}

function toPerformance(s: PerfSet): Performance {
  return {
    weightKg: s.weightKg ?? null,
    reps: s.reps,
    date: s.session.finishedAt ? s.session.finishedAt.toISOString() : null,
  };
}

/**
 * GET /api/zona/last-performance?exerciseId=xxx — última performance REAL del
 * perfil en sesiones completadas: la serie más reciente de la última sesión
 * completada (last) y la de la sesión completada anterior (previous).
 * Solo datos reales: sin estimaciones ni sugerencias.
 */
export async function GET(req: Request) {
  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const url = new URL(req.url);
    const exerciseId = (url.searchParams.get("exerciseId") ?? "").trim();
    if (!exerciseId || !getExerciseById(exerciseId)) {
      return NextResponse.json({ error: "Ejercicio no encontrado en la biblioteca." }, { status: 400 });
    }

    const sets = await db.setLog.findMany({
      where: { exerciseId, session: { profileId: profile.id, status: "completada" } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 500,
      select: {
        weightKg: true,
        reps: true,
        setNumber: true,
        createdAt: true,
        session: { select: { id: true, finishedAt: true } },
      },
    });

    // Una entrada por sesión: como vienen ordenadas desc, la primera serie
    // vista de cada sesión es su serie más reciente.
    const bySession = new Map<number, PerfSet>();
    for (const s of sets) {
      if (!bySession.has(s.session.id)) bySession.set(s.session.id, s);
    }
    const latestPerSession = [...bySession.values()].sort((a, b) => {
      const fa = a.session.finishedAt?.getTime() ?? -1;
      const fb = b.session.finishedAt?.getTime() ?? -1;
      return fb - fa; // más reciente primero (sesiones sin finishedAt al final)
    });

    const last = latestPerSession[0] ? toPerformance(latestPerSession[0]) : null;
    const previous = latestPerSession[1] ? toPerformance(latestPerSession[1]) : null;

    return NextResponse.json({ exerciseId, last, previous });
  } catch (error) {
    console.error("[api/zona/last-performance GET]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
