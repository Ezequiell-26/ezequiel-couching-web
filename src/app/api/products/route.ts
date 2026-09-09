import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await db.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        category: true,
        priceCents: true,
      },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error("[api/products]", error);
    return NextResponse.json(
      { error: "No pudimos cargar el catálogo. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
