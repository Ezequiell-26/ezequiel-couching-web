import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { requireZonaProfile, zonaUnauthorized } from "@/lib/zona-auth";
import { serializeRoutine } from "@/lib/zona-utils";

export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/**
 * POST /api/zona/routines/[id]/duplicate — duplica una rutina propia (wger-style).
 * Crea una copia INDEPENDIENTE: name = "<name> (copia)" (recortado a 60),
 * mismos goal/level/daysPerWeek/equipment/notes/source, active: true, e items
 * copiados con los mismos days/orderIdx. La copia nunca referencia al original.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Rate-limit suave, mismo criterio que PUT /api/zona/schedule (20/min por IP).
  const rl = rateLimit(clientKey(req, "zona-duplicate"), 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Demasiados intentos. Reintenta en ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const { id } = await params;
    const numId = parseId(id);
    if (numId === null) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    // Owner check por construcción (profileId de la sesión, nunca del body):
    // 404 sin revelar existencia de rutinas ajenas.
    const original = await db.routine.findFirst({
      where: { id: numId, profileId: profile.id },
      include: { items: true },
    });
    if (!original) {
      return NextResponse.json({ error: "Rutina no encontrada." }, { status: 404 });
    }

    const copy = await db.routine.create({
      data: {
        profileId: profile.id,
        name: `${original.name} (copia)`.slice(0, 60),
        goal: original.goal,
        level: original.level,
        daysPerWeek: original.daysPerWeek,
        equipment: original.equipment,
        source: original.source,
        notes: original.notes,
        active: true,
        items: {
          create: [...original.items]
            .sort((a, b) => a.day - b.day || a.orderIdx - b.orderIdx)
            .map((it) => ({
              day: it.day,
              orderIdx: it.orderIdx,
              exerciseId: it.exerciseId,
              sets: it.sets,
              reps: it.reps,
              restSec: it.restSec,
              notes: it.notes,
            })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json(serializeRoutine(copy), { status: 201 });
  } catch (error) {
    console.error("[api/zona/routines/id/duplicate POST]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
