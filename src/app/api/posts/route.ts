import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const posts = await db.post.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, slug: true, title: true, excerpt: true, category: true, createdAt: true },
    });
    return NextResponse.json(posts);
  } catch (error) {
    console.error("[api/posts]", error);
    return NextResponse.json(
      { error: "No pudimos cargar el blog. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
