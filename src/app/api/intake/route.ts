import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { intakeSchema } from "@/lib/content/quiz";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { bmrMifflin, tdee } from "@/lib/nutrition";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "intake"), 3, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: `Demasiados envíos. Reintenta en ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const parsed = intakeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
        { status: 400 },
      );
    }
    const d = parsed.data;

    const intake = await db.intake.create({
      data: {
        name: d.name,
        email: d.email.toLowerCase(),
        age: d.age,
        sex: d.sex,
        heightCm: d.heightCm,
        weightKg: d.weightKg,
        goal: d.goal,
        experience: d.experience,
        daysPerWeek: d.daysPerWeek,
        equipment: d.equipment,
        injuries: d.injuries || null,
        message: d.message || null,
      },
    });

    // Resumen calculado con fórmulas reales para el entrenador.
    const summaryBmr = bmrMifflin(d.sex, d.weightKg, d.heightCm, d.age);
    const summaryTdee = tdee(summaryBmr, "moderado");

    await sendEmail({
      to: d.email,
      subject: "Recibimos tu cuestionario — KinetixFitt",
      body: `Gracias ${d.name}. Tu cuestionario quedó registrado (ref. #${intake.id}). Te contactaremos con tu propuesta.`,
    });

    return NextResponse.json({
      ok: true,
      id: intake.id,
      estimate: { bmr: summaryBmr, tdee: summaryTdee },
    });
  } catch (error) {
    console.error("[api/intake]", error);
    return NextResponse.json(
      { ok: false, error: "No pudimos enviar tu cuestionario. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
