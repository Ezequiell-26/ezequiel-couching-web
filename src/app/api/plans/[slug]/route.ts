import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const plan = await db.plan.findFirst({ where: { slug, active: true } });
    if (!plan) {
      return NextResponse.json({ error: "Plan no encontrado." }, { status: 404 });
    }
    return NextResponse.json(plan);
  } catch (error) {
    console.error("[api/plans/slug]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
