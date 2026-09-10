import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getExerciseById } from "@/lib/content/exercises";
import { requireZonaProfile, zonaUnauthorized } from "@/lib/zona-auth";
import { computeVolumeKg, serializeSet } from "@/lib/zona-utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  exerciseId: z.string().trim().min(1).max(100),
  setNumber: z.number().int().min(1).max(30),
  weightKg: z.number().min(0).max(500).optional(),
  reps: z.number().int().min(1).max(100),
  rpe: z.number().int().min(1).max(10).optional(),
});

/** POST /api/zona/sessions/[id]/sets — registra una serie (solo sesión activa). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const { id } = await params;
    const numId = Number(id);
    if (!Number.isInteger(numId) || numId < 1) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
        { status: 400 },
      );
    }
    const d = parsed.data;

    if (!getExerciseById(d.exerciseId)) {
      return NextResponse.json({ error: "Ejercicio no encontrado en la biblioteca." }, { status: 400 });
    }

    // Owner check por construcción.
    const session = await db.workoutSession.findFirst({
      where: { id: numId, profileId: profile.id },
      select: { id: true, status: true },
    });
    if (!session) {
      return NextResponse.json({ error: "Sesión no encontrada." }, { status: 404 });
    }
    if (session.status !== "activa") {
      return NextResponse.json({ error: "La sesión ya está completada." }, { status: 409 });
    }

    // PR en vivo: máximo peso previo del ejercicio en sesiones COMPLETADAS del perfil.
    const prevBest = await db.setLog.findFirst({
      where: {
        exerciseId: d.exerciseId,
        weightKg: { not: null },
        session: { profileId: profile.id, status: "completada" },
      },
      orderBy: { weightKg: "desc" },
      select: { weightKg: true },
    });
    const previousMax = prevBest?.weightKg ?? null;
    const isPR = d.weightKg != null && (previousMax === null || d.weightKg > previousMax);

    const result = await db.$transaction(async (tx) => {
      const set = await tx.setLog.create({
        data: {
          sessionId: session.id,
          exerciseId: d.exerciseId,
          setNumber: d.setNumber,
          weightKg: d.weightKg ?? null,
          reps: d.reps,
          rpe: d.rpe ?? null,
        },
      });
      // Recomputo de volumen en la misma transacción.
      const sets = await tx.setLog.findMany({
        where: { sessionId: session.id },
        select: { weightKg: true, reps: true },
      });
      const volumeKg = computeVolumeKg(sets);
      await tx.workoutSession.update({ where: { id: session.id }, data: { volumeKg } });
      return { set, volumeKg };
    });

    return NextResponse.json(
      {
        set: serializeSet(result.set),
        volumeKg: result.volumeKg,
        ...(isPR ? { isPR: true, previousMax } : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[api/zona/sessions/id/sets POST]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
