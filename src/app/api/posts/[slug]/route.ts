import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const post = await db.post.findFirst({ where: { slug, published: true } });
    if (!post) {
      return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
    }
    return NextResponse.json(post);
  } catch (error) {
    console.error("[api/posts/slug]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
