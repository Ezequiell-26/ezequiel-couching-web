import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const plans = await db.plan.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(plans);
  } catch (error) {
    console.error("[api/plans]", error);
    return NextResponse.json(
      { error: "No pudimos cargar los planes. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
