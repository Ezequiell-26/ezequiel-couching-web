import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    read: z.boolean().optional(),
    reply: z.string().max(4000).nullable().optional(),
  })
  .refine((data) => data.read !== undefined || data.reply !== undefined, {
    message: "Nada que actualizar.",
  });

/** PATCH /api/admin/messages/[id] — marcar leído y/o guardar nota de respuesta interna. */
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
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
        { status: 400 },
      );
    }

    const existing = await db.message.findUnique({ where: { id: numId } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Mensaje no encontrado." }, { status: 404 });
    }

    const data: { read?: boolean; reply?: string | null } = {};
    if (parsed.data.read !== undefined) data.read = parsed.data.read;
    if (parsed.data.reply !== undefined) data.reply = parsed.data.reply;

    const message = await db.message.update({ where: { id: numId }, data });
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    console.error("[api/admin/messages/id]", error);
    return NextResponse.json({ ok: false, error: "Error interno." }, { status: 500 });
  }
}
