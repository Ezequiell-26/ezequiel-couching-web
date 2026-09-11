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
  description: z.string().min(1, "La descripción es obligatoria.").max(2000),
  category: z.enum(["guia", "programa", "plantilla"]),
  priceCents: z
    .number()
    .int("El precio debe ser un entero en céntimos.")
    .min(0)
    .max(10_000_00),
  fileName: z.string().max(200).optional().nullable(),
});

function slugConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

/** GET /api/admin/products — catálogo COMPLETO (incluye inactivos). */
export async function GET() {
  const authed = await isAdminRequest();
  if (!authed) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  try {
    const products = await db.product.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ ok: true, products });
  } catch (error) {
    console.error("[api/admin/products]", error);
    return NextResponse.json({ ok: false, error: "Error interno." }, { status: 500 });
  }
}

/** POST /api/admin/products — crea un producto. */
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

    const product = await db.product.create({
      data: {
        slug: parsed.data.slug,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        priceCents: parsed.data.priceCents,
        fileName: parsed.data.fileName ?? null,
        active: true,
      },
    });

    return NextResponse.json({ ok: true, product }, { status: 201 });
  } catch (error) {
    if (slugConflict(error)) {
      return NextResponse.json({ ok: false, error: "Ese slug ya existe" }, { status: 409 });
    }
    console.error("[api/admin/products]", error);
    return NextResponse.json({ ok: false, error: "Error interno." }, { status: 500 });
  }
}
