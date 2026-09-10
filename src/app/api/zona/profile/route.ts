import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import {
  ZONA_COOKIE,
  createClientSession,
  getZonaProfile,
  hashPin,
  publicProfile,
  zonaCookieOptions,
  zonaUnauthorized,
} from "@/lib/zona-auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z
    .string({ message: "El nombre es obligatorio." })
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(40, "El nombre no puede superar 40 caracteres."),
  pin: z
    .string({ message: "El PIN es obligatorio." })
    .regex(/^\d{4,6}$/, "El PIN debe tener entre 4 y 6 dígitos."),
});

/** GET /api/zona/profile — perfil de la sesión actual (sin datos sensibles). */
export async function GET() {
  try {
    const profile = await getZonaProfile();
    if (!profile) return zonaUnauthorized();
    return NextResponse.json(publicProfile(profile));
  } catch (error) {
    console.error("[api/zona/profile GET]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

/** POST /api/zona/profile — registro de cliente (nombre único + PIN 4-6 dígitos). */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "zona-register"), 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Demasiados intentos. Reintenta en ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
        { status: 400 },
      );
    }
    const { name, pin } = parsed.data;

    // Unicidad case-insensitive (SQLite no soporta mode:"insensitive").
    const existing = await db.$queryRaw<{ id: number }[]>`
      SELECT id FROM ClientProfile WHERE lower(name) = lower(${name}) LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Ese nombre ya está en uso. Si es tu cuenta, iniciá sesión." },
        { status: 409 },
      );
    }

    const profile = await db.clientProfile.create({
      data: { name, pinHash: hashPin(pin) },
    });

    const token = await createClientSession(profile.id);
    const res = NextResponse.json(publicProfile(profile), { status: 201 });
    res.cookies.set(ZONA_COOKIE, token, zonaCookieOptions());
    return res;
  } catch (error) {
    console.error("[api/zona/profile]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
