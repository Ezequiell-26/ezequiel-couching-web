import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireZonaProfile, zonaUnauthorized } from "@/lib/zona-auth";
import { dateKey, utcMidnight } from "@/lib/zona-utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  ml: z.number().int().min(50).max(2000),
});

/** POST /api/zona/water — suma mililitros al total de hoy (upsert incremental). */
export async function POST(req: Request) {
  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
        { status: 400 },
      );
    }
    const { ml } = parsed.data;
    const date = utcMidnight(dateKey(new Date()));

    const log = await db.waterLog.upsert({
      where: { profileId_date: { profileId: profile.id, date } },
      update: { ml: { increment: ml } },
      create: { profileId: profile.id, date, ml },
    });

    return NextResponse.json({ ml: log.ml });
  } catch (error) {
    console.error("[api/zona/water POST]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
