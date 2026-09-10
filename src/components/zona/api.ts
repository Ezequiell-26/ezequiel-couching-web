/**
 * Cliente de las APIs /api/zona/* para la vista Mi Zona (Task 24-d).
 * Contratos espejo de los serializers del backend (Task 24-c): si un endpoint
 * responde {error} se lanza Error con ese mensaje; 401 lanza ZonaUnauthorized
 * para que la vista vuelva al AuthGate.
 */

// ── DTOs (formas exactas de /api/zona/*) ────────────────────────────────────

export type ZonaProfile = { id: number; name: string };

/**
 * Metas personales (Task 26-a): GET /api/zona/profile las devuelve y
 * PATCH /api/zona/profile las actualiza (null = sin meta). Ambas opcionales
 * e independientes; rangos del backend: peso 30-300 kg, agua 500-5000 ml.
 */
export type ZonaProfileGoals = { weightGoalKg: number | null; waterGoalMl: number | null };
export type ZonaProfileWithGoals = ZonaProfile & ZonaProfileGoals;

/**
 * Item para POST /api/zona/routines (crear) y PATCH /api/zona/routines/[id]
 * (editar, reemplaza todos los items): el backend valida exerciseId contra la
 * biblioteca, day ≤ daysPerWeek, sets 1-10, reps texto 1-12, restSec 0-600.
 */
export type RoutineItemPayload = {
  day: number;
  exerciseId: string;
  sets: number;
  reps: string;
  restSec: number;
  notes?: string;
};

export type RoutineItemDTO = {
  id: number;
  day: number;
  orderIdx: number;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: string;
  restSec: number;
  notes: string | null;
};

export type RoutineDTO = {
  id: number;
  name: string;
  goal: string;
  level: string;
  daysPerWeek: number;
  equipment: string;
  source: "manual" | "ia";
  notes: string | null;
  active: boolean;
  createdAt: string;
  items: RoutineItemDTO[];
};

export type SessionDTO = {
  id: number;
  routineId: number | null;
  routineName: string | null;
  title: string;
  day: number | null;
  status: "activa" | "completada";
  volumeKg: number;
  startedAt: string;
  finishedAt: string | null;
  setsCount: number;
};

export type SetDTO = {
  id: number;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  weightKg: number | null;
  reps: number;
  rpe: number | null;
  createdAt: string;
  /**
   * Opcional: hoy GET /api/zona/sessions/[id] no lo serializa (isPR solo viene
   * en la respuesta del POST de series). Queda cableado para que, si el backend
   * empieza a incluirlo, la UI lo muestre sin cambios extra.
   */
  isPR?: boolean;
};

export type SessionDetailDTO = SessionDTO & { sets: SetDTO[] };

export type NewPRDTO = {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  e1rm: number;
};

export type ProgressDTO = {
  weights: { date: string; kg: number }[];
  waterToday: { ml: number };
  waterWeek: { date: string; ml: number }[];
  habitsToday: { habit: string; done: boolean }[];
  habitsWeek: { date: string; habits: { habit: string; done: boolean }[] }[];
  volumeByWeek: { week: string; volumeKg: number }[];
  prs: { exerciseId: string; exerciseName: string; weightKg: number; reps: number; e1rm: number; date: string }[];
  totals: {
    sessionsTotal: number;
    sessionsCompleted: number;
    totalVolumeKg: number;
    prsCount: number;
    daysTrainedLast30: number;
  };
  streak: { days: number; lastActiveDate: string | null };
  /** Fechas YYYY-MM-DD (UTC) con cualquier actividad, últimos 90 días (Task 26-a). */
  activityDays: string[];
  activeSession: SessionDTO | null;
};

export type AchievementDTO = {
  id: string;
  title: string;
  desc: string;
  unlocked: boolean;
  progress?: { current: number; target: number };
};

// ── Plan semanal / export / última performance (Task 25-e) ──────────────────

/**
 * Slot del plan semanal (GET/PUT /api/zona/schedule): el API devuelve SIEMPRE
 * un array fijo de 7 posiciones, weekday 0=Lunes .. 6=Domingo, con nulls en
 * los días sin asignación.
 */
export type ScheduleSlotDTO = {
  weekday: number;
  routineId: number | null;
  routineTitle: string | null;
  day: number | null;
};

/** Punto de performance real: la serie más reciente de una sesión completada. */
export type PerformancePointDTO = {
  weightKg: number | null;
  reps: number;
  /** finishedAt ISO de la sesión completada; null si no tiene fecha. */
  date: string | null;
};

/** GET /api/zona/last-performance?exerciseId=X → {last, previous} nullables. */
export type LastPerformanceDTO = {
  exerciseId: string;
  last: PerformancePointDTO | null;
  previous: PerformancePointDTO | null;
};

// ── Errores ──────────────────────────────────────────────────────────────────

/** Cualquier 401: la sesión de cookie no existe o expiró. */
export class ZonaUnauthorized extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZonaUnauthorized";
  }
}

/**
 * fetch JSON con manejo uniforme: 401 → ZonaUnauthorized (mensaje del API),
 * otros errores → Error({error} del API o mensaje genérico honesto).
 */
export async function zonaApi<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new Error("No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.");
  }

  const data: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : "Ocurrió un error inesperado. Intentá de nuevo.";
    if (res.status === 401) throw new ZonaUnauthorized(msg);
    throw new Error(msg);
  }

  return data as T;
}

// ── Etiquetas (goals/equipo del backend) ────────────────────────────────────

export const GOAL_LABELS: Record<string, string> = {
  general: "General",
  hipertrofia: "Hipertrofia",
  fuerza: "Fuerza",
  "perder-grasa": "Perder grasa",
  resistencia: "Resistencia",
};

export const LEVEL_LABELS: Record<string, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

export const EQUIPMENT_LABELS: Record<string, string> = {
  gimnasio: "Gimnasio",
  mancuernas: "Mancuernas",
  casa: "Casa",
  "peso-corporal": "Peso corporal",
};

/** Los 6 hábitos del API (enum fijo) con etiqueta legible. */
export const HABITS: { id: "sueno" | "proteina" | "agua" | "pasos" | "estiramiento" | "sin-azucar"; label: string }[] = [
  { id: "sueno", label: "Dormir 7-8 h" },
  { id: "proteina", label: "Proteína en cada comida" },
  { id: "agua", label: "Agua (≥ 2 L)" },
  { id: "pasos", label: "Caminar / moverse" },
  { id: "estiramiento", label: "Estiramiento" },
  { id: "sin-azucar", label: "Sin azúcar añadida" },
];

// ── Formatos es-AR ───────────────────────────────────────────────────────────

const intFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const kgFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

/** 12450 → "12.450" (volumen, contadores). */
export function fmtInt(n: number): string {
  return intFmt.format(Math.round(n));
}

/** 62.5 → "62,5" (pesos con decimal opcional). */
export function fmtKg(n: number): string {
  return kgFmt.format(n);
}

/** "2026-03-12" → "12 mar" (etiquetas cortas de ejes). */
export function shortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(d);
}

/** "2026-W37" → "S37" (etiqueta de semana ISO). */
export function shortWeek(weekKey: string): string {
  const w = weekKey.split("W")[1] ?? weekKey;
  return `S${w}`;
}
