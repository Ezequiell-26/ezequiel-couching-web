import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireZonaProfile, zonaUnauthorized } from "@/lib/zona-auth";
import { dateKey, serializeRoutine, serializeSession, serializeSet } from "@/lib/zona-utils";

export const dynamic = "force-dynamic";

/** Techo por colección: blindaje de memoria sin límite artificial razonable. */
const MAX_PER_COLLECTION = 500;

/**
 * GET /api/zona/export — portabilidad de datos (wger-style): descarga JSON
 * con TODOS los datos del perfil autenticado. Jamás incluye pinHash,
 * sessionToken ni sessionExpiry.
 */
export async function GET() {
  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const [routines, sessions, weights, water, habits] = await Promise.all([
      db.routine.findMany({
        where: { profileId: profile.id },
        include: { items: true },
        orderBy: { createdAt: "asc" },
        take: MAX_PER_COLLECTION,
      }),
      db.workoutSession.findMany({
        where: { profileId: profile.id },
        include: { sets: { orderBy: { createdAt: "asc" } }, routine: { select: { name: true } } },
        orderBy: { startedAt: "desc" },
        take: MAX_PER_COLLECTION,
      }),
      db.weightLog.findMany({
        where: { profileId: profile.id },
        orderBy: { date: "asc" },
        take: MAX_PER_COLLECTION,
      }),
      db.waterLog.findMany({
        where: { profileId: profile.id },
        orderBy: { date: "asc" },
        take: MAX_PER_COLLECTION,
      }),
      db.habitLog.findMany({
        where: { profileId: profile.id },
        orderBy: [{ date: "asc" }, { habit: "asc" }],
        take: MAX_PER_COLLECTION,
      }),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      // Solo campos no sensibles del perfil (ClientProfile no guarda
      // goal/level/equipment/daysPerWeek: esos viven en cada Routine).
      // Aditivo (Task 26-a): metas personales opcionales (null = sin meta).
      profile: {
        id: profile.id,
        name: profile.name,
        createdAt: profile.createdAt.toISOString(),
        weightGoalKg: profile.weightGoalKg,
        waterGoalMl: profile.waterGoalMl,
      },
      routines: routines.map(serializeRoutine),
      sessions: sessions.map((s) => ({
        ...serializeSession(s, s.sets.length, s.routine?.name ?? null),
        sets: s.sets.map(serializeSet),
      })),
      weights: weights.map((w) => ({ date: dateKey(w.date), kg: w.kg })),
      water: water.map((w) => ({ date: dateKey(w.date), ml: w.ml })),
      habits: habits.map((h) => ({ date: dateKey(h.date), habit: h.habit, done: h.done })),
    };

    return NextResponse.json(payload, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="ezequiel-coaching-mis-datos.json"',
      },
    });
  } catch (error) {
    console.error("[api/zona/export GET]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
