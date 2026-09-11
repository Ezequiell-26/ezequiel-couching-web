import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireZonaProfile, zonaUnauthorized } from "@/lib/zona-auth";
import { serializeSession } from "@/lib/zona-utils";

export const dynamic = "force-dynamic";

const startSchema = z
  .object({
    routineId: z.number().int().min(1).optional(),
    title: z.string().trim().min(2).max(80).optional(),
    day: z.number().int().min(1).max(6).optional(),
  })
  .refine((d) => !d.day || d.routineId, { message: "El día solo puede indicarse junto a una rutina." });

/** GET /api/zona/sessions?status=activa|todas&limit=1..20 — lista con nº de series. */
export async function GET(req: Request) {
  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const url = new URL(req.url);
    const status = url.searchParams.get("status") === "activa" ? "activa" : "todas";
    const limitRaw = Number(url.searchParams.get("limit") ?? 10);
    const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : 10;

    const sessions = await db.workoutSession.findMany({
      where: { profileId: profile.id, ...(status === "activa" ? { status: "activa" } : {}) },
      orderBy: { startedAt: "desc" },
      take: limit,
      include: {
        _count: { select: { sets: true } },
        routine: { select: { name: true } },
      },
    });

    return NextResponse.json(
      sessions.map((s) => serializeSession(s, s._count.sets, s.routine?.name ?? null)),
    );
  } catch (error) {
    console.error("[api/zona/sessions GET]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

/**
 * POST /api/zona/sessions — inicia (o reanuda) una sesión.
 * Solo puede existir UNA sesión activa por perfil.
 */
export async function POST(req: Request) {
  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const parsed = startSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
        { status: 400 },
      );
    }
    const { routineId, title, day } = parsed.data;

    // Reanudar: una sola sesión activa.
    const active = await db.workoutSession.findFirst({
      where: { profileId: profile.id, status: "activa" },
      orderBy: { startedAt: "desc" },
      include: { _count: { select: { sets: true } }, routine: { select: { name: true } } },
    });
    if (active) {
      return NextResponse.json(
        { session: serializeSession(active, active._count.sets, active.routine?.name ?? null), resumed: true },
        { status: 200 },
      );
    }

    let finalTitle = title ?? "Entrenamiento";
    if (routineId !== undefined) {
      // Owner check: la rutina debe ser del perfil.
      const routine = await db.routine.findFirst({
        where: { id: routineId, profileId: profile.id },
        select: { name: true },
      });
      if (!routine) {
        return NextResponse.json({ error: "Rutina no encontrada." }, { status: 404 });
      }
      if (!title) {
        finalTitle = day ? `${routine.name} · Día ${day}` : routine.name;
      }
    }

    const session = await db.workoutSession.create({
      data: {
        profileId: profile.id,
        routineId: routineId ?? null,
        title: finalTitle,
        day: day ?? null,
        status: "activa",
      },
      include: { _count: { select: { sets: true } }, routine: { select: { name: true } } },
    });

    return NextResponse.json(
      { session: serializeSession(session, session._count.sets, session.routine?.name ?? null) },
      { status: 201 },
    );
  } catch (error) {
    console.error("[api/zona/sessions POST]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
