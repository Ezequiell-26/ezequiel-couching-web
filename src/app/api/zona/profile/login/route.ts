import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import {
  ZONA_COOKIE,
  createClientSession,
  publicProfile,
  verifyPin,
  zonaCookieOptions,
} from "@/lib/zona-auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1).max(40),
  pin: z.string().regex(/^\d{1,6}$/, "PIN no válido."),
});

/** POST /api/zona/profile/login — inicia sesión (error genérico, sin revelar qué falló). */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "zona-login"), 10, 5 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Demasiados intentos. Reintenta en ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Nombre o PIN incorrecto." }, { status: 401 });
    }
    const { name, pin } = parsed.data;

    const rows = await db.$queryRaw<{ id: number }[]>`
      SELECT id FROM ClientProfile WHERE lower(name) = lower(${name}) LIMIT 1
    `;
    const profile = rows[0]
      ? await db.clientProfile.findUnique({ where: { id: rows[0].id } })
      : null;

    // Mismo mensaje si no existe el nombre o si el PIN no coincide.
    if (!profile || !verifyPin(pin, profile.pinHash)) {
      return NextResponse.json({ error: "Nombre o PIN incorrecto." }, { status: 401 });
    }

    // Rotación de token: invalida cualquier sesión anterior del perfil.
    const token = await createClientSession(profile.id);
    const res = NextResponse.json(publicProfile(profile));
    res.cookies.set(ZONA_COOKIE, token, zonaCookieOptions());
    return res;
  } catch (error) {
    console.error("[api/zona/profile/login]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
