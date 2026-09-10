/**
 * Utilidades internas de la Zona de entrenamiento (Task 24-c, backend only).
 * Serializadores (nunca exponen pinHash/sessionToken/sessionExpiry) y helpers
 * de fechas UTC, volumen, PRs (Epley) y semanas ISO.
 */

import { exerciseName } from "@/lib/content/exercises";
import type { Routine, RoutineItem, SetLog, WorkoutSession } from "@prisma/client";

// ── Serialización ────────────────────────────────────────────────────────────

export type RoutineWithItems = Routine & { items: RoutineItem[] };

export function serializeRoutine(r: RoutineWithItems) {
  return {
    id: r.id,
    name: r.name,
    goal: r.goal,
    level: r.level,
    daysPerWeek: r.daysPerWeek,
    equipment: r.equipment,
    source: r.source,
    notes: r.notes,
    active: r.active,
    createdAt: r.createdAt.toISOString(),
    items: [...r.items]
      .sort((a, b) => a.day - b.day || a.orderIdx - b.orderIdx)
      .map((it) => ({
        id: it.id,
        day: it.day,
        orderIdx: it.orderIdx,
        exerciseId: it.exerciseId,
        exerciseName: exerciseName(it.exerciseId),
        sets: it.sets,
        reps: it.reps,
        restSec: it.restSec,
        notes: it.notes,
      })),
  };
}

export function serializeSession(
  s: WorkoutSession,
  setsCount = 0,
  routineName: string | null = null,
) {
  return {
    id: s.id,
    routineId: s.routineId,
    routineName,
    title: s.title,
    day: s.day,
    status: s.status,
    volumeKg: s.volumeKg,
    startedAt: s.startedAt.toISOString(),
    finishedAt: s.finishedAt?.toISOString() ?? null,
    setsCount,
  };
}

export function serializeSet(s: SetLog) {
  return {
    id: s.id,
    exerciseId: s.exerciseId,
    exerciseName: exerciseName(s.exerciseId),
    setNumber: s.setNumber,
    weightKg: s.weightKg ?? null,
    reps: s.reps,
    rpe: s.rpe ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

// ── Volumen y PRs ────────────────────────────────────────────────────────────

/** Volumen total = suma de peso × reps solo de series con peso registrado. */
export function computeVolumeKg(sets: { weightKg: number | null; reps: number }[]): number {
  return sets.reduce((acc, s) => (s.weightKg != null ? acc + s.weightKg * s.reps : acc), 0);
}

/** Epley: 1RM estimado = peso × (1 + reps/30), redondeado a 1 decimal. */
export function epley1rm(weightKg: number, reps: number): number {
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

// ── Fechas (todo normalizado a UTC) ─────────────────────────────────────────

/** Clave "YYYY-MM-DD" (UTC) de una fecha/instante. */
export function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" → Date en medianoche UTC. */
export function utcMidnight(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1));
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

/** Medianoche UTC del lunes de la semana (ISO) que contiene a d. */
export function startOfUtcWeek(d: Date): Date {
  const offset = (d.getUTCDay() + 6) % 7; // lunes = 0
  return addDays(utcMidnight(dateKey(d)), -offset);
}

/** Etiqueta de semana ISO "YYYY-Www" para la semana que contiene a d. */
export function isoWeekKey(d: Date): string {
  const date = utcMidnight(dateKey(d));
  date.setUTCDate(date.getUTCDate() + 3 - ((date.getUTCDay() + 6) % 7)); // jueves ISO
  const isoYear = date.getUTCFullYear();
  const jan4 = utcMidnight(`${isoYear}-01-04`);
  const week1Thu = addDays(jan4, -((jan4.getUTCDay() + 6) % 7) + 3);
  const week = 1 + Math.round((date.getTime() - week1Thu.getTime()) / (7 * 86_400_000));
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

// ── Rachas ───────────────────────────────────────────────────────────────────

/**
 * Racha de días consecutivos hasta hoy (o ayer) a partir de un conjunto de
 * claves "YYYY-MM-DD" con actividad. Devuelve también la última actividad.
 */
export function computeStreak(
  activeDays: Set<string>,
  now: Date = new Date(),
): { days: number; lastActiveDate: string | null } {
  if (activeDays.size === 0) return { days: 0, lastActiveDate: null };

  let lastActiveDate: string | null = null;
  for (const key of activeDays) {
    if (!lastActiveDate || key > lastActiveDate) lastActiveDate = key;
  }

  const todayKey = dateKey(now);
  const yesterdayKey = dateKey(addDays(now, -1));
  let cursor: Date;
  if (activeDays.has(todayKey)) cursor = utcMidnight(todayKey);
  else if (activeDays.has(yesterdayKey)) cursor = utcMidnight(yesterdayKey);
  else return { days: 0, lastActiveDate };

  let days = 0;
  while (activeDays.has(dateKey(cursor))) {
    days += 1;
    cursor = addDays(cursor, -1);
  }
  return { days, lastActiveDate };
}
