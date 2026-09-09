import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  status: z.enum(["nuevo", "contactado", "cliente", "descartado"]),
});

/** PATCH /api/admin/intakes/[id] — cambia el estado de seguimiento del cuestionario. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authed = await isAdminRequest();
  if (!authed) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 1) {
    return NextResponse.json({ ok: false, error: "ID inválido." }, { status: 400 });
  }

  try {
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Estado no válido." },
        { status: 400 },
      );
    }

    const existing = await db.intake.findUnique({ where: { id: numId } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Cuestionario no encontrado." }, { status: 404 });
    }

    const intake = await db.intake.update({
      where: { id: numId },
      data: { status: parsed.data.status },
    });
    return NextResponse.json({ ok: true, intake });
  } catch (error) {
    console.error("[api/admin/intakes/id]", error);
    return NextResponse.json({ ok: false, error: "Error interno." }, { status: 500 });
  }
}
