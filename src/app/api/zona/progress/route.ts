import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exerciseName } from "@/lib/content/exercises";
import { requireZonaProfile, zonaUnauthorized } from "@/lib/zona-auth";
import {
  addDays,
  computeStreak,
  dateKey,
  epley1rm,
  isoWeekKey,
  serializeSession,
  startOfUtcWeek,
  utcMidnight,
} from "@/lib/zona-utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/zona/progress?weeks=8 — una única llamada agregada del perfil:
 * peso, agua, hábitos, volumen semanal, PRs, totales, racha y sesión activa.
 */
export async function GET(req: Request) {
  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const url = new URL(req.url);
    const weeksRaw = Number(url.searchParams.get("weeks") ?? 8);
    const weeks = Number.isInteger(weeksRaw) ? Math.min(Math.max(weeksRaw, 1), 12) : 8;

    const now = new Date();
    const todayKey = dateKey(now);
    const todayUtc = utcMidnight(todayKey);
    const since90 = addDays(todayUtc, -89);
    const since7 = addDays(todayUtc, -6);
    const since400 = addDays(now, -400);
    const firstMonday = addDays(startOfUtcWeek(now), -7 * (weeks - 1));

    const [
      weights,
      waterLogs,
      habitLogs,
      volumeSets,
      weightedSets,
      activitySetLogs,
      sessionsTotal,
      sessionsCompleted,
      active,
    ] = await Promise.all([
      db.weightLog.findMany({
        where: { profileId: profile.id, date: { gte: since90 } },
        orderBy: { date: "asc" },
      }),
      db.waterLog.findMany({
        where: { profileId: profile.id, date: { gte: since7 } },
        orderBy: { date: "asc" },
      }),
      db.habitLog.findMany({
        where: { profileId: profile.id, date: { gte: since7 } },
        orderBy: { date: "asc" },
      }),
      db.setLog.findMany({
        where: {
          weightKg: { not: null },
          session: { profileId: profile.id, status: "completada", finishedAt: { gte: firstMonday } },
        },
        select: { weightKg: true, reps: true, session: { select: { finishedAt: true } } },
      }),
      db.setLog.findMany({
        where: { weightKg: { not: null }, session: { profileId: profile.id } },
        orderBy: { weightKg: "desc" },
        select: { exerciseId: true, weightKg: true, reps: true, createdAt: true },
      }),
      db.setLog.findMany({
        where: { session: { profileId: profile.id }, createdAt: { gte: since400 } },
        select: { createdAt: true },
      }),
      db.workoutSession.count({ where: { profileId: profile.id } }),
      db.workoutSession.count({ where: { profileId: profile.id, status: "completada" } }),
      db.workoutSession.findFirst({
        where: { profileId: profile.id, status: "activa" },
        orderBy: { startedAt: "desc" },
        include: { _count: { select: { sets: true } }, routine: { select: { name: true } } },
      }),
    ]);

    // ── Agua: hoy + rejilla de 7 días (días sin registro → 0) ────────────
    const waterByDay = new Map(waterLogs.map((w) => [dateKey(w.date), w.ml]));
    const waterTodayMl = waterByDay.get(todayKey) ?? 0;
    const waterWeek = Array.from({ length: 7 }, (_, i) => {
      const key = dateKey(addDays(todayUtc, i - 6));
      return { date: key, ml: waterByDay.get(key) ?? 0 };
    });

    // ── Hábitos: hoy + rejilla de 7 días ──────────────────────────────────
    const habitsByDay = new Map<string, { habit: string; done: boolean }[]>();
    for (const h of habitLogs) {
      const key = dateKey(h.date);
      habitsByDay.set(key, [...(habitsByDay.get(key) ?? []), { habit: h.habit, done: h.done }]);
    }
    const habitsToday = habitsByDay.get(todayKey) ?? [];
    const habitsWeek = Array.from({ length: 7 }, (_, i) => {
      const key = dateKey(addDays(todayUtc, i - 6));
      return { date: key, habits: habitsByDay.get(key) ?? [] };
    });

    // ── Volumen por semana ISO (sesiones completadas) ─────────────────────
    const volumeByWeek = Array.from({ length: weeks }, (_, i) => {
      const monday = addDays(firstMonday, 7 * i);
      return { monday, key: isoWeekKey(monday), volumeKg: 0 };
    });
    for (const s of volumeSets) {
      if (s.weightKg == null || !s.session.finishedAt) continue;
      const t = s.session.finishedAt.getTime();
      const bucket = volumeByWeek.find(
        (w) => t >= w.monday.getTime() && t < w.monday.getTime() + 7 * 86_400_000,
      );
      if (bucket) bucket.volumeKg += s.weightKg * s.reps;
    }
    volumeByWeek.forEach((w) => {
      w.volumeKg = Math.round(w.volumeKg * 10) / 10;
    });

    // ── PRs: máximo peso por ejercicio (top 50) + volumen total ───────────
    const prByExercise = new Map<string, { weightKg: number; reps: number; createdAt: Date }>();
    let totalVolumeKg = 0;
    for (const s of weightedSets) {
      if (s.weightKg == null) continue;
      totalVolumeKg += s.weightKg * s.reps;
      const current = prByExercise.get(s.exerciseId);
      if (!current || s.weightKg > current.weightKg) {
        prByExercise.set(s.exerciseId, { weightKg: s.weightKg, reps: s.reps, createdAt: s.createdAt });
      }
    }
    const prs = [...prByExercise.entries()]
      .map(([exerciseId, pr]) => ({
        exerciseId,
        exerciseName: exerciseName(exerciseId),
        weightKg: pr.weightKg,
        reps: pr.reps,
        e1rm: epley1rm(pr.weightKg, pr.reps),
        date: dateKey(pr.createdAt),
      }))
      .sort((a, b) => b.weightKg - a.weightKg)
      .slice(0, 50);

    // ── Días entrenados (últimos 30) y racha de actividad ─────────────────
    const since30 = addDays(todayUtc, -29).getTime();
    const activityDays = new Set<string>();
    for (const s of activitySetLogs) {
      activityDays.add(dateKey(s.createdAt));
    }
    // Días con al menos una serie registrada (no nº de series).
    const daysTrainedLast30 = new Set(
      activitySetLogs
        .filter((s) => s.createdAt.getTime() >= since30)
        .map((s) => dateKey(s.createdAt)),
    ).size;

    // Peso corporal, agua ≥500 ml y hábitos hechos también cuentan como actividad.
    const weightDays400 = await db.weightLog.findMany({
      where: { profileId: profile.id, date: { gte: addDays(todayUtc, -400) } },
      select: { date: true },
    });
    const waterDays400 = await db.waterLog.findMany({
      where: { profileId: profile.id, ml: { gte: 500 }, date: { gte: addDays(todayUtc, -400) } },
      select: { date: true },
    });
    const habitDays400 = await db.habitLog.findMany({
      where: { profileId: profile.id, done: true, date: { gte: addDays(todayUtc, -400) } },
      select: { date: true },
    });
    for (const w of weightDays400) activityDays.add(dateKey(w.date));
    for (const w of waterDays400) activityDays.add(dateKey(w.date));
    for (const h of habitDays400) activityDays.add(dateKey(h.date));
    const streak = computeStreak(activityDays, now);

    // ── Heatmap de actividad (últimos 90 días, hoy incluido) ─────────────
    // Mismo criterio de actividad que la racha: serie registrada, peso, agua
    // ≥500 ml o hábito done. Derivado de las MISMAS queries ya realizadas
    // (cero consultas extra): filtro por clave "YYYY-MM-DD" UTC ≥ hace 90 días.
    const since90Key = dateKey(since90);
    const heatmapDays = [...activityDays].filter((k) => k >= since90Key).sort();

    return NextResponse.json({
      weights: weights.map((w) => ({ date: dateKey(w.date), kg: w.kg })),
      waterToday: { ml: waterTodayMl },
      waterWeek,
      habitsToday,
      habitsWeek,
      volumeByWeek: volumeByWeek.map((w) => ({ week: w.key, volumeKg: w.volumeKg })),
      prs,
      totals: {
        sessionsTotal,
        sessionsCompleted,
        totalVolumeKg: Math.round(totalVolumeKg * 10) / 10,
        prsCount: prByExercise.size,
        daysTrainedLast30,
      },
      streak,
      activityDays: heatmapDays,
      activeSession: active
        ? serializeSession(active, active._count.sets, active.routine?.name ?? null)
        : null,
    });
  } catch (error) {
    console.error("[api/zona/progress GET]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
