import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email().max(120),
  name: z.string().max(80).optional(),
  source: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "leads"), 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: `Demasiadas solicitudes. Reintenta en ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Introduce un email válido." },
        { status: 400 },
      );
    }

    const lead = await db.lead.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        name: parsed.data.name ?? null,
        source: parsed.data.source ?? "guia-gratis",
      },
    });

    await sendEmail({
      to: parsed.data.email,
      subject: "Tu guía gratuita — Ezequiel Coaching",
      body: "Gracias por tu interés. Aquí tienes la guía gratuita.",
    });

    return NextResponse.json({
      ok: true,
      id: lead.id,
      note: "Entrega de la guía pendiente de configurar el email del titular (sin SMTP activo).",
    });
  } catch (error) {
    console.error("[api/leads]", error);
    return NextResponse.json(
      { ok: false, error: "No pudimos registrar tu solicitud. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
