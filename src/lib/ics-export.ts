/**
 * Exportación del plan semanal a calendario (.ics) — Task 36-c.
 *
 * Genera un VCALENDAR (RFC 5545) con un VEVENT semanal recurrente por cada día
 * del plan que tenga rutina asignada, y lo descarga como archivo. Se usa el
 * paquete `ics` (adamgibbons/ics, ISC) vía createEvents; si la generación
 * falla se devuelve false y la UI nunca se rompe.
 *
 * Decisiones documentadas:
 * - DTSTART es hora LOCAL FLOATING (sin sufijo Z): `startInputType`/`startOutputType`
 *   en "local" hacen que la lib emita `DTSTART:20260914T180000`. Así el evento
 *   cae a las 18:00 de la zona horaria del usuario que importa, sin manejar TZID.
 *   (Ojo: el default de la lib es `outputType: "utc"`, que agrega Z — hay que
 *   pedir "local" explícitamente.)
 * - RRULE:FREQ=WEEKLY;COUNT=52;BYDAY=<día> — 52 ocurrencias (un año) es
 *   razonable para un plan de entrenamiento y evita eventos infinitos.
 * - Duración de 1 hora (DURATION:PT1H): la hora real de fin no existe en la BD,
 *   el usuario elige la hora de inicio y la duración es una constante honesta.
 * - UID determinista (hash FNV-1a de routineName+weekday+kinetixfitt): re-exportar
 *   el plan actualiza los eventos en el calendario en vez de duplicarlos.
 * - Sin BOM: los archivos .ics deben ser UTF-8 plano.
 */

import { createEvents } from "ics";

/** Slot mínimo para exportar: weekday 0=Lunes..6=Domingo y el nombre de la rutina. */
export type WeekPlanSlot = { weekday: number; routineName: string | null };

/** Nombre del archivo descargado. */
export const ICS_FILENAME = "kinetixfitt-plan-semanal.ics";

/** BYDAY de RFC 5545 indexado por weekday del plan (0=Lunes..6=Domingo). */
const BYDAY = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

/** Horas de inicio ofrecidas en la UI (no existen en la BD: las elige el usuario). */
export const ICS_HOUR_OPTIONS = [17, 18, 19, 20] as const;
export const ICS_DEFAULT_HOUR = 18;

/** Duración fija del bloque de entrenamiento en el calendario. */
const DURATION_HOURS = 1;
/** Ocurrencias semanales del RRULE (un año). */
const RRULE_COUNT = 52;

/** Hash FNV-1a 32-bit en hex: estable y suficiente para UIDs deterministas. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Nombre de rutina → slug ASCII para el UID (defensivo, sin acentos ni símbolos). */
function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "rutina";
}

/** weekday del plan (0=Lunes..6=Domingo) de un Date, según getDay() (0=Domingo). */
function planWeekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/**
 * Próxima ocurrencia del weekday indicado a las `hour`:00 hora local:
 * hoy cuenta si es el día y la hora aún no pasó; si ya pasó, la de la semana
 * siguiente. Así el DTSTART nunca queda en el pasado.
 */
function nextOccurrence(weekday: number, hour: number, now: Date): Date {
  const todayAtHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0, 0);
  const daysAhead = (weekday - planWeekday(todayAtHour) + 7) % 7;
  const target = new Date(todayAtHour);
  target.setDate(target.getDate() + daysAhead);
  if (target.getTime() < now.getTime()) target.setDate(target.getDate() + 7);
  return target;
}

/**
 * Genera el contenido .ics del plan semanal (o null si no hay días con rutina
 * o la hora es inválida o la lib falla). `now` se inyecta para poder verificar
 * de forma determinista.
 */
export function buildWeekPlanIcs(slots: WeekPlanSlot[], hour: number, now: Date = new Date()): string | null {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;

  const events = slots
    .filter((slot) => typeof slot.routineName === "string" && slot.routineName.trim().length > 0)
    .map((slot) => {
      const routineName = slot.routineName!.trim();
      const start = nextOccurrence(slot.weekday, hour, now);
      return {
        start: [start.getFullYear(), start.getMonth() + 1, start.getDate(), hour, 0] as [number, number, number, number, number],
        startInputType: "local" as const,
        startOutputType: "local" as const,
        endOutputType: "local" as const,
        duration: { hours: DURATION_HOURS },
        title: `Entrenamiento — ${routineName}`,
        description: "Planificado con KinetixFitt · Mi Zona",
        categories: ["KinetixFitt"],
        uid: `${fnv1a(`${routineName}|${slot.weekday}|kinetixfitt`)}-${slugify(routineName)}@kinetixfitt`,
        recurrenceRule: `FREQ=WEEKLY;COUNT=${RRULE_COUNT};BYDAY=${BYDAY[slot.weekday] ?? "MO"}`,
      };
    });

  if (events.length === 0) return null;

  const { error, value } = createEvents(events, {
    productId: "-//KinetixFitt//Plan semanal//ES",
    calName: "KinetixFitt — Plan semanal",
  });
  if (error || !value) return null;
  return value;
}

/**
 * Genera y descarga el .ics del plan semanal. Devuelve true si el archivo se
 * descargó; nunca lanza (try/catch interno) para no romper la UI.
 */
export async function downloadWeekPlanIcs(slots: WeekPlanSlot[], hour: number): Promise<boolean> {
  try {
    const ics = buildWeekPlanIcs(slots, hour);
    if (!ics) return false;

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = ICS_FILENAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}
