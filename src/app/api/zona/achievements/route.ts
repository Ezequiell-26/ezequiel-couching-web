import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireZonaProfile, zonaUnauthorized } from "@/lib/zona-auth";
import { addDays, computeStreak, dateKey, utcMidnight } from "@/lib/zona-utils";

export const dynamic = "force-dynamic";

interface AchievementDef {
  id: string;
  title: string;
  desc: string;
}

/** Definiciones estáticas; el desbloqueo SIEMPRE se evalúa con datos reales de BD. */
const DEFINITIONS: AchievementDef[] = [
  { id: "primera-sesion", title: "Primer entrenamiento", desc: "Completa tu primera sesión" },
  { id: "racha-7", title: "Racha de 7 días", desc: "Mantente activo 7 días seguidos" },
  { id: "sesiones-10", title: "10 sesiones", desc: "Completa 10 sesiones de entrenamiento" },
  { id: "sesiones-25", title: "25 sesiones", desc: "Completa 25 sesiones de entrenamiento" },
  { id: "primer-pr", title: "Nuevo récord personal", desc: "Logra tu primer PR con peso" },
  { id: "prs-5", title: "5 récords personales", desc: "Consigue PRs en 5 ejercicios distintos" },
  { id: "volumen-10t", title: "10.000 kg acumulados", desc: "Suma 10 toneladas de volumen total" },
  { id: "agua-7", title: "Hidratado 7 días seguidos", desc: "Registra ≥1,5 L de agua durante 7 días seguidos" },
  { id: "peso-4", title: "4 registros de peso corporal", desc: "Pesa tu progreso en 4 días distintos" },
  { id: "rutina-ia", title: "Tu primera rutina con IA", desc: "Genera una rutina con el entrenador IA" },
];

/** GET /api/zona/achievements — logros con desbloqueo y progreso reales (0 fake). */
export async function GET() {
  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const now = new Date();
    const todayUtc = utcMidnight(dateKey(now));
    const since400 = addDays(now, -400);

    const [sessionsCompleted, weightedSets, waterLogs, weightCount, iaRoutines, activitySetLogs, weightLogs, habitLogs] =
      await Promise.all([
        db.workoutSession.count({ where: { profileId: profile.id, status: "completada" } }),
        db.setLog.findMany({
          where: { weightKg: { not: null }, session: { profileId: profile.id } },
          select: { exerciseId: true, weightKg: true, reps: true },
        }),
        db.waterLog.findMany({
          where: { profileId: profile.id, ml: { gte: 500 }, date: { gte: addDays(todayUtc, -400) } },
          select: { date: true, ml: true },
        }),
        db.weightLog.count({ where: { profileId: profile.id } }),
        db.routine.count({ where: { profileId: profile.id, source: "ia" } }),
        db.setLog.findMany({
          where: { session: { profileId: profile.id }, createdAt: { gte: since400 } },
          select: { createdAt: true },
        }),
        db.weightLog.findMany({
          where: { profileId: profile.id, date: { gte: addDays(todayUtc, -400) } },
          select: { date: true },
        }),
        db.habitLog.findMany({
          where: { profileId: profile.id, done: true, date: { gte: addDays(todayUtc, -400) } },
          select: { date: true },
        }),
      ]);

    // ── Racha de actividad general (series, peso, agua ≥500 ml, hábitos) ──
    const activityDays = new Set<string>();
    for (const s of activitySetLogs) activityDays.add(dateKey(s.createdAt));
    for (const w of weightLogs) activityDays.add(dateKey(w.date));
    for (const w of waterLogs) activityDays.add(dateKey(w.date));
    for (const h of habitLogs) activityDays.add(dateKey(h.date));
    const streak = computeStreak(activityDays, now);

    // ── Racha específica de hidratación: días con ≥1,5 L ──────────────────
    const waterStreak = computeStreak(
      new Set(waterLogs.filter((w) => w.ml >= 1500).map((w) => dateKey(w.date))),
      now,
    );

    // ── PRs y volumen total, derivados de series con peso reales ──────────
    const prExercises = new Set<string>();
    let totalVolumeKg = 0;
    for (const s of weightedSets) {
      if (s.weightKg == null) continue;
      prExercises.add(s.exerciseId);
      totalVolumeKg += s.weightKg * s.reps;
    }

    const values: Record<string, { unlocked: boolean; progress?: { current: number; target: number } }> = {
      "primera-sesion": { unlocked: sessionsCompleted >= 1 },
      "racha-7": { unlocked: streak.days >= 7 },
      "sesiones-10": { unlocked: sessionsCompleted >= 10, progress: { current: sessionsCompleted, target: 10 } },
      "sesiones-25": { unlocked: sessionsCompleted >= 25, progress: { current: sessionsCompleted, target: 25 } },
      "primer-pr": { unlocked: prExercises.size >= 1 },
      "prs-5": { unlocked: prExercises.size >= 5 },
      "volumen-10t": {
        unlocked: totalVolumeKg >= 10_000,
        progress: { current: Math.round(totalVolumeKg), target: 10_000 },
      },
      "agua-7": {
        unlocked: waterStreak.days >= 7,
        progress: { current: Math.min(waterStreak.days, 7), target: 7 },
      },
      "peso-4": { unlocked: weightCount >= 4, progress: { current: weightCount, target: 4 } },
      "rutina-ia": { unlocked: iaRoutines >= 1 },
    };

    return NextResponse.json(
      DEFINITIONS.map((def) => ({
        ...def,
        unlocked: values[def.id]?.unlocked ?? false,
        ...(values[def.id]?.progress ? { progress: values[def.id].progress } : {}),
      })),
    );
  } catch (error) {
    console.error("[api/zona/achievements GET]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
