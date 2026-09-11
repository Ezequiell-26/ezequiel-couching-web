import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getExerciseById } from "@/lib/content/exercises";
import { requireZonaProfile, zonaUnauthorized } from "@/lib/zona-auth";
import { serializeRoutine } from "@/lib/zona-utils";

export const dynamic = "force-dynamic";

// Espejo de la validación de creación (src/app/api/zona/routines/route.ts):
// mismas reglas para editar. Duplicado a propósito para mantener cada route
// autocontenido (Next no permite exports extra en route.ts).
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

const patchSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(60).optional(),
  goal: z.enum(GOALS).optional(),
  level: z.enum(LEVELS).optional(),
  daysPerWeek: z.number().int().min(1).max(6).optional(),
  equipment: z.enum(EQUIPMENT).optional(),
  items: z
    .array(itemSchema)
    .min(1, "La rutina necesita al menos un ejercicio.")
    .max(120, "La rutina no puede superar 120 ejercicios.")
    .optional(),
});

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/** GET /api/zona/routines/[id] — detalle de rutina (solo del perfil; si no, 404). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const { id } = await params;
    const numId = parseId(id);
    if (numId === null) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    // Owner check por construcción: profileId viene de la sesión, nunca del body.
    const routine = await db.routine.findFirst({
      where: { id: numId, profileId: profile.id },
      include: { items: true },
    });
    if (!routine) {
      return NextResponse.json({ error: "Rutina no encontrada." }, { status: 404 });
    }

    return NextResponse.json(serializeRoutine(routine));
  } catch (error) {
    console.error("[api/zona/routines/id GET]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

/** DELETE /api/zona/routines/[id] — borrado suave (active:false). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const { id } = await params;
    const numId = parseId(id);
    if (numId === null) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const routine = await db.routine.findFirst({
      where: { id: numId, profileId: profile.id },
      select: { id: true },
    });
    if (!routine) {
      return NextResponse.json({ error: "Rutina no encontrada." }, { status: 404 });
    }

    await db.routine.update({ where: { id: routine.id }, data: { active: false } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/zona/routines/id DELETE]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

/** PATCH /api/zona/routines/[id] — editar rutina propia ACTIVA (campos escalares + items). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const { id } = await params;
    const numId = parseId(id);
    if (numId === null) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
        { status: 400 },
      );
    }
    const d = parsed.data;

    // Debe venir al menos un campo a editar.
    if (
      d.name === undefined &&
      d.goal === undefined &&
      d.level === undefined &&
      d.daysPerWeek === undefined &&
      d.equipment === undefined &&
      d.items === undefined
    ) {
      return NextResponse.json({ error: "Enviá al menos un campo para editar." }, { status: 400 });
    }

    // Owner check por construcción (profileId de la sesión). Las archivadas
    // (active:false) no se editan: misma 404 para no revelar su existencia.
    const routine = await db.routine.findFirst({
      where: { id: numId, profileId: profile.id, active: true },
      select: { id: true, daysPerWeek: true },
    });
    if (!routine) {
      return NextResponse.json({ error: "Rutina no encontrada." }, { status: 404 });
    }

    // daysPerWeek efectivo: si cambia en este PATCH, las validaciones de items
    // corren contra el NUEVO valor (aunque lleguen en el mismo body).
    const effectiveDays = d.daysPerWeek ?? routine.daysPerWeek;

    if (d.items) {
      // Todos los exerciseId deben existir en la biblioteca (mismo criterio que create).
      const invalidIds = [
        ...new Set(d.items.filter((i) => !getExerciseById(i.exerciseId)).map((i) => i.exerciseId)),
      ];
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: `Ejercicios no encontrados en la biblioteca: ${invalidIds.join(", ")}.` },
          { status: 400 },
        );
      }

      // day ≤ daysPerWeek (efectivo).
      if (d.items.some((i) => i.day > effectiveDays)) {
        return NextResponse.json(
          { error: "Hay ejercicios asignados a un día mayor que daysPerWeek." },
          { status: 400 },
        );
      }
    } else if (d.daysPerWeek !== undefined && d.daysPerWeek < routine.daysPerWeek) {
      // Sin reemplazo de items: no dejar items existentes fuera del rango nuevo.
      const overflow = await db.routineItem.count({
        where: { routineId: routine.id, day: { gt: d.daysPerWeek } },
      });
      if (overflow > 0) {
        return NextResponse.json(
          {
            error:
              "Hay ejercicios existentes asignados a un día mayor que el nuevo daysPerWeek. Editá también los ejercicios.",
          },
          { status: 400 },
        );
      }
    }

    // orderIdx = índice del ejercicio dentro de su día (mismo patrón que create).
    const counters = new Map<number, number>();
    const itemData = d.items?.map((i) => {
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

    const updated = await db.$transaction(async (tx) => {
      if (itemData) {
        // Reemplazo completo de items.
        await tx.routineItem.deleteMany({ where: { routineId: routine.id } });
        await tx.routineItem.createMany({
          data: itemData.map((i) => ({ ...i, routineId: routine.id })),
        });
      }
      return tx.routine.update({
        where: { id: routine.id },
        data: {
          ...(d.name !== undefined ? { name: d.name } : {}),
          ...(d.goal !== undefined ? { goal: d.goal } : {}),
          ...(d.level !== undefined ? { level: d.level } : {}),
          ...(d.daysPerWeek !== undefined ? { daysPerWeek: d.daysPerWeek } : {}),
          ...(d.equipment !== undefined ? { equipment: d.equipment } : {}),
        },
        include: { items: true },
      });
    });

    return NextResponse.json(serializeRoutine(updated));
  } catch (error) {
    console.error("[api/zona/routines/id PATCH]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
