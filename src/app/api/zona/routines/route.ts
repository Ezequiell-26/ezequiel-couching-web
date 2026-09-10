import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getExerciseById } from "@/lib/content/exercises";
import { requireZonaProfile, zonaUnauthorized } from "@/lib/zona-auth";
import { serializeRoutine } from "@/lib/zona-utils";

export const dynamic = "force-dynamic";

const GOALS = ["general", "hipertrofia", "fuerza", "perder-grasa", "resistencia"] as const;
const LEVELS = ["principiante", "intermedio", "avanzado"] as const;
const EQUIPMENT = ["gimnasio", "mancuernas", "casa", "peso-corporal"] as const;

const itemSchema = z.object({
  day: z.number().int().min(1).max(6),
  exerciseId: z.string().trim().min(1).max(100),
  sets: z.number().int().min(1).max(10),
  reps: z.string().trim().min(1).max(12),
  restSec: z.number().int().min(0).max(600),
  notes: z.string().trim().max(200).optional(),
});

const createSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(60),
  goal: z.enum(GOALS),
  level: z.enum(LEVELS),
  daysPerWeek: z.number().int().min(1).max(6),
  equipment: z.enum(EQUIPMENT),
  items: z.array(itemSchema).min(1, "La rutina necesita al menos un ejercicio.").max(120),
});

/** GET /api/zona/routines — rutinas activas del perfil, con items ordenados. */
export async function GET() {
  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const routines = await db.routine.findMany({
      where: { profileId: profile.id, active: true },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(routines.map(serializeRoutine));
  } catch (error) {
    console.error("[api/zona/routines GET]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

/** POST /api/zona/routines — creación manual de rutina con items validados. */
export async function POST(req: Request) {
  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
        { status: 400 },
      );
    }
    const d = parsed.data;

    // Todos los exerciseId deben existir en la biblioteca.
    const invalidIds = [...new Set(d.items.filter((i) => !getExerciseById(i.exerciseId)).map((i) => i.exerciseId))];
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Ejercicios no encontrados en la biblioteca: ${invalidIds.join(", ")}.` },
        { status: 400 },
      );
    }

    // Los días de los items no pueden superar daysPerWeek.
    const overflow = d.items.some((i) => i.day > d.daysPerWeek);
    if (overflow) {
      return NextResponse.json(
        { error: "Hay ejercicios asignados a un día mayor que daysPerWeek." },
        { status: 400 },
      );
    }

    // orderIdx = índice del ejercicio dentro de su día (listado ordenado por day, orderIdx).
    const counters = new Map<number, number>();
    const itemData = d.items.map((i) => {
      const idx = counters.get(i.day) ?? 0;
      counters.set(i.day, idx + 1);
      return {
        day: i.day,
        orderIdx: idx,
        exerciseId: i.exerciseId,
        sets: i.sets,
        reps: i.reps,
        restSec: i.restSec,
        notes: i.notes ?? null,
      };
    });

    const routine = await db.routine.create({
      data: {
        profileId: profile.id,
        name: d.name,
        goal: d.goal,
        level: d.level,
        daysPerWeek: d.daysPerWeek,
        equipment: d.equipment,
        source: "manual",
        items: { create: itemData },
      },
      include: { items: true },
    });

    return NextResponse.json(serializeRoutine(routine), { status: 201 });
  } catch (error) {
    console.error("[api/zona/routines POST]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
