import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireZonaProfile, zonaUnauthorized } from "@/lib/zona-auth";
import { serializeRoutine } from "@/lib/zona-utils";

export const dynamic = "force-dynamic";

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
