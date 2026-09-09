import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { isAdminRequest } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  slug: z
    .string()
    .min(1, "El slug es obligatorio.")
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug no válido (minúsculas, números y guiones)."),
  title: z.string().min(1, "El título es obligatorio.").max(120),
  level: z.enum(["iniciacion", "intermedio", "avanzado"]),
  weeks: z.number().int("Las semanas deben ser un entero.").min(1).max(52),
  summary: z.string().min(1, "El resumen es obligatorio.").max(2000),
  priceCents: z.number().int().min(0).max(10_000_00).optional().nullable(),
});

function slugConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

/** GET /api/admin/plans — listado COMPLETO (incluye inactivos). */
export async function GET() {
  const authed = await isAdminRequest();
  if (!authed) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  try {
    const plans = await db.plan.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ ok: true, plans });
  } catch (error) {
    console.error("[api/admin/plans]", error);
    return NextResponse.json({ ok: false, error: "Error interno." }, { status: 500 });
  }
}

/** POST /api/admin/plans — crea un plan. */
export async function POST(req: Request) {
  const authed = await isAdminRequest();
  if (!authed) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
        { status: 400 },
      );
    }

    const plan = await db.plan.create({
      data: {
        slug: parsed.data.slug,
        title: parsed.data.title,
        level: parsed.data.level,
        weeks: parsed.data.weeks,
        summary: parsed.data.summary,
        priceCents: parsed.data.priceCents ?? null,
        active: true,
      },
    });

    return NextResponse.json({ ok: true, plan }, { status: 201 });
  } catch (error) {
    if (slugConflict(error)) {
      return NextResponse.json({ ok: false, error: "Ese slug ya existe" }, { status: 409 });
    }
    console.error("[api/admin/plans]", error);
    return NextResponse.json({ ok: false, error: "Error interno." }, { status: 500 });
  }
}
