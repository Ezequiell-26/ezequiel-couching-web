import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireZonaProfile, zonaUnauthorized } from "@/lib/zona-auth";
import { dateKey, utcMidnight } from "@/lib/zona-utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  kg: z.number().min(30).max(300),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida (formato YYYY-MM-DD).")
    .optional(),
});

/** POST /api/zona/weight — registra/actualiza el peso del día (medianoche UTC). */
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
    const { kg } = parsed.data;
    const date = utcMidnight(parsed.data.date ?? dateKey(new Date()));

    const weight = await db.weightLog.upsert({
      where: { profileId_date: { profileId: profile.id, date } },
      update: { kg },
      create: { profileId: profile.id, date, kg },
    });

    return NextResponse.json({
      weight: { id: weight.id, date: dateKey(weight.date), kg: weight.kg },
    });
  } catch (error) {
    console.error("[api/zona/weight POST]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
