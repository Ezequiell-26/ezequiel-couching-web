import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { requireZonaProfile, zonaUnauthorized } from "@/lib/zona-auth";

export const dynamic = "force-dynamic";

const slotSchema = z.object({
  weekday: z
    .number({ message: "El día de la semana es obligatorio." })
    .int()
    .min(0, "El día de la semana va de 0 (lunes) a 6 (domingo).")
    .max(6, "El día de la semana va de 0 (lunes) a 6 (domingo)."),
  routineId: z.number().int().min(1).nullable(),
  day: z
    .number()
    .int()
    .min(1, "El día de la rutina debe ser 1 o mayor.")
    .max(6, "El día de la rutina no puede superar 6.")
    .nullable()
    .optional(),
});

const putSchema = z.object({
  slots: z.array(slotSchema).max(7, "No puede haber más de 7 slots semanales."),
});

type SlotInput = z.infer<typeof slotSchema>;

/** Serializa los 7 días (0=Lunes .. 6=Domingo) con la rutina resuelta. */
function serializeWeek(
  slots: { weekday: number; routineId: number | null; day: number | null; routine: { name: string } | null }[],
) {
  const byWeekday = new Map(slots.map((s) => [s.weekday, s]));
  return Array.from({ length: 7 }, (_, weekday) => {
    const slot = byWeekday.get(weekday);
    return {
      weekday,
      routineId: slot?.routineId ?? null,
      routineTitle: slot?.routine?.name ?? null,
      day: slot?.day ?? null,
    };
  });
}

/** GET /api/zona/schedule — plan semanal del perfil (siempre 7 días). */
export async function GET() {
  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const slots = await db.weekSlot.findMany({
      where: { profileId: profile.id },
      include: { routine: { select: { name: true } } },
      orderBy: { weekday: "asc" },
    });

    return NextResponse.json(serializeWeek(slots));
  } catch (error) {
    console.error("[api/zona/schedule GET]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

/**
 * PUT /api/zona/schedule — reemplazo completo del plan semanal.
 * Body: { slots: [{ weekday, routineId, day }] }. Cada rutina debe ser del
 * perfil y estar activa; el día de la rutina no puede superar daysPerWeek.
 */
export async function PUT(req: Request) {
  const rl = rateLimit(clientKey(req, "zona-schedule"), 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Demasiados intentos. Reintenta en ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const parsed = putSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
        { status: 400 },
      );
    }
    const slots = parsed.data.slots;

    // Un solo slot por día de la semana (única compuesta en BD).
    const weekdays = slots.map((s) => s.weekday);
    if (new Set(weekdays).size !== weekdays.length) {
      return NextResponse.json(
        { error: "Hay días de la semana duplicados." },
        { status: 400 },
      );
    }

    // El día de la rutina solo tiene sentido con una rutina asignada.
    if (slots.some((s) => s.routineId === null && s.day != null)) {
      return NextResponse.json(
        { error: "El día solo puede indicarse junto a una rutina." },
        { status: 400 },
      );
    }

    // Todas las rutinas referenciadas deben ser del perfil (owner por sesión).
    const routineIds = [...new Set(slots.map((s) => s.routineId).filter((id): id is number => id != null))];
    const routines = routineIds.length
      ? await db.routine.findMany({
          where: { id: { in: routineIds }, profileId: profile.id },
          select: { id: true, name: true, active: true, daysPerWeek: true },
        })
      : [];
    const routineById = new Map(routines.map((r) => [r.id, r]));
    if (routineIds.some((id) => !routineById.has(id))) {
      return NextResponse.json({ error: "Rutina no encontrada." }, { status: 404 });
    }

    // Activas y con día dentro del rango de la rutina.
    for (const s of slots) {
      if (s.routineId == null) continue;
      const routine = routineById.get(s.routineId);
      if (!routine?.active) {
        return NextResponse.json({ error: "La rutina no está activa." }, { status: 400 });
      }
      if (s.day != null && s.day > routine.daysPerWeek) {
        return NextResponse.json(
          { error: `La rutina "${routine.name}" tiene ${routine.daysPerWeek} días por semana.` },
          { status: 400 },
        );
      }
    }

    const data = slots.map((s: SlotInput) => ({
      profileId: profile.id,
      weekday: s.weekday,
      routineId: s.routineId,
      day: s.routineId != null ? (s.day ?? null) : null,
    }));

    await db.$transaction(async (tx) => {
      await tx.weekSlot.deleteMany({ where: { profileId: profile.id } });
      if (data.length > 0) {
        await tx.weekSlot.createMany({ data });
      }
    });

    const saved = await db.weekSlot.findMany({
      where: { profileId: profile.id },
      include: { routine: { select: { name: true } } },
      orderBy: { weekday: "asc" },
    });

    return NextResponse.json(serializeWeek(saved), { status: 200 });
  } catch (error) {
    console.error("[api/zona/schedule PUT]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
