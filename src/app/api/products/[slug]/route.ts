import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const product = await db.product.findFirst({
      where: { slug, active: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    console.error("[api/products/slug]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
