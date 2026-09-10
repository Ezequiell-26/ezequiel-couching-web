import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireZonaProfile, zonaUnauthorized } from "@/lib/zona-auth";
import { dateKey, utcMidnight } from "@/lib/zona-utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  habit: z.enum(["sueno", "proteina", "agua", "pasos", "estiramiento", "sin-azucar"]),
  done: z.boolean(),
});

/** POST /api/zona/habits — marca/desmarca un hábito de hoy (upsert). */
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
    const { habit, done } = parsed.data;
    const date = utcMidnight(dateKey(new Date()));

    const log = await db.habitLog.upsert({
      where: { profileId_date_habit: { profileId: profile.id, date, habit } },
      update: { done },
      create: { profileId: profile.id, date, habit, done },
    });

    return NextResponse.json({ habit: log.habit, done: log.done });
  } catch (error) {
    console.error("[api/zona/habits POST]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
