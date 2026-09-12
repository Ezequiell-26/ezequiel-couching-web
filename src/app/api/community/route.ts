import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyClientSession } from "@/lib/zona-auth";

/**
 * GET /api/community - Obtiene posts de la comunidad
 * POST /api/community - Crea nuevo post
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const tag = searchParams.get("tag");

    const where: any = {};
    if (tag) {
      where.tags = { contains: tag };
    }

    const posts = await db.communityPost.findMany({
      where,
      include: {
        profile: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("Error fetching community posts:", error);
    return NextResponse.json({ error: "Error al cargar posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyClientSession(req);
    if (!session?.profileId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { content, images, tags } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "El contenido es requerido" }, { status: 400 });
    }

    const post = await db.communityPost.create({
      data: {
        profileId: session.profileId,
        content,
        images: images || null,
        tags: tags || null,
      },
      include: {
        profile: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error creating community post:", error);
    return NextResponse.json({ error: "Error al crear post" }, { status: 500 });
  }
}
