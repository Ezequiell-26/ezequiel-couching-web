import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(120),
  body: z.string().min(10, "Cuéntanos algo más (mín. 10 caracteres)").max(2000),
});

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "contact"), 4, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: `Demasiados mensajes. Reintenta en ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
        { status: 400 },
      );
    }

    const message = await db.message.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        body: parsed.data.body,
      },
    });

    return NextResponse.json({ ok: true, id: message.id });
  } catch (error) {
    console.error("[api/contact]", error);
    return NextResponse.json(
      { ok: false, error: "No pudimos enviar tu mensaje. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
