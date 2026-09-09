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
  excerpt: z.string().min(1, "El extracto es obligatorio.").max(300),
  body: z.string().min(1, "El cuerpo es obligatorio.").max(20000),
  category: z.string().min(1, "La categoría es obligatoria.").max(40),
  published: z.boolean(),
});

function slugConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

/** GET /api/admin/posts — listado COMPLETO (incluye no publicados). */
export async function GET() {
  const authed = await isAdminRequest();
  if (!authed) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  try {
    const posts = await db.post.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ ok: true, posts });
  } catch (error) {
    console.error("[api/admin/posts]", error);
    return NextResponse.json({ ok: false, error: "Error interno." }, { status: 500 });
  }
}

/** POST /api/admin/posts — crea un artículo. */
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

    const post = await db.post.create({ data: parsed.data });
    return NextResponse.json({ ok: true, post }, { status: 201 });
  } catch (error) {
    if (slugConflict(error)) {
      return NextResponse.json({ ok: false, error: "Ese slug ya existe" }, { status: 409 });
    }
    console.error("[api/admin/posts]", error);
    return NextResponse.json({ ok: false, error: "Error interno." }, { status: 500 });
  }
}
