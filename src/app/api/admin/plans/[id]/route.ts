import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { isAdminRequest } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const updateSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug no válido (minúsculas, números y guiones).")
      .optional(),
    title: z.string().min(1).max(120).optional(),
    level: z.enum(["iniciacion", "intermedio", "avanzado"]).optional(),
    weeks: z.number().int().min(1).max(52).optional(),
    summary: z.string().min(1).max(2000).optional(),
    priceCents: z.number().int().min(0).max(10_000_00).nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nada que actualizar." });

function slugConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

/** PUT /api/admin/plans/[id] — edita un plan (parcial). */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authed = await isAdminRequest();
  if (!authed) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 1) {
    return NextResponse.json({ ok: false, error: "ID inválido." }, { status: 400 });
  }

  try {
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
        { status: 400 },
      );
    }

    const existing = await db.plan.findUnique({ where: { id: numId } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Plan no encontrado." }, { status: 404 });
    }

    const plan = await db.plan.update({ where: { id: numId }, data: parsed.data });
    return NextResponse.json({ ok: true, plan });
  } catch (error) {
    if (slugConflict(error)) {
      return NextResponse.json({ ok: false, error: "Ese slug ya existe" }, { status: 409 });
    }
    console.error("[api/admin/plans/id]", error);
    return NextResponse.json({ ok: false, error: "Error interno." }, { status: 500 });
  }
}

/** DELETE /api/admin/plans/[id] — borrado suave (active:false). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authed = await isAdminRequest();
  if (!authed) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 1) {
    return NextResponse.json({ ok: false, error: "ID inválido." }, { status: 400 });
  }

  try {
    const existing = await db.plan.findUnique({ where: { id: numId } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Plan no encontrado." }, { status: 404 });
    }

    await db.plan.update({ where: { id: numId }, data: { active: false } });
    return NextResponse.json({ ok: true, soft: true });
  } catch (error) {
    console.error("[api/admin/plans/id]", error);
    return NextResponse.json({ ok: false, error: "Error interno." }, { status: 500 });
  }
}
