import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_COOKIE,
  adminPasswordConfigured,
  createSessionToken,
  isAdminRequest,
  sessionCookieOptions,
  verifyPassword,
  requireAdmin,
} from "@/lib/admin-auth";
import { rateLimit, clientKey, createRateLimitResponse } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { getSecurityHeaders } from "@/lib/security";

export const dynamic = "force-dynamic";

// Schema de validación con Zod
const passwordSchema = z.object({
  password: z.string().min(1).max(200),
});

export async function GET() {
  const headers = new Headers(getSecurityHeaders());

  return NextResponse.json(
    {
      authed: await isAdminRequest(),
      configured: adminPasswordConfigured(),
    },
    { headers }
  );
}

export async function POST(req: Request) {
  const headers = new Headers(getSecurityHeaders());

  // Rate limiting estricto para login (5 intentos cada 5 minutos)
  const rl = rateLimit(clientKey(req, "auth"), "auth");
  if (!rl.ok) {
    headers.set("Retry-After", String(rl.retryAfterSec));
    headers.set("X-RateLimit-Limit", String(rl.limit));
    headers.set("X-RateLimit-Remaining", String(rl.remaining));
    return createRateLimitResponse(rl.retryAfterSec);
  }

  try {
    // Validar input con Zod
    const parsed = passwordSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400, headers });
    }

    // Verificar configuración
    if (!adminPasswordConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Acceso deshabilitado: define ADMIN_PASSWORD (mín. 12 caracteres) en el archivo .env del servidor.",
        },
        { status: 503, headers }
      );
    }

    // Verificar contraseña con timing-safe comparison
    if (!verifyPassword(parsed.data.password)) {
      // Log intento fallido (sin exponer datos sensibles)
      console.warn(
        `[admin-auth] Intento fallido desde IP: ${req.headers.get("x-forwarded-for") ?? "unknown"}`
      );
      return NextResponse.json(
        { ok: false, error: "Contraseña incorrecta." },
        { status: 401, headers }
      );
    }

    // Crear sesión exitosa
    const res = NextResponse.json({ ok: true }, { headers });
    res.cookies.set(ADMIN_COOKIE, createSessionToken(), sessionCookieOptions());

    // Añadir headers de rate limit
    headers.set("X-RateLimit-Limit", String(rl.limit));
    headers.set("X-RateLimit-Remaining", String(rl.remaining));

    return res;
  } catch (error) {
    console.error(
      "[api/admin/session] Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json({ ok: false, error: "Error interno." }, { status: 500, headers });
  }
}

export async function DELETE() {
  const headers = new Headers(getSecurityHeaders());
  const res = NextResponse.json({ ok: true }, { headers });
  res.cookies.set(ADMIN_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}

export async function PUT() {
  // Endpoint de control: verifica sesión y devuelve conteos básicos.
  const adminCheck = await requireAdmin();
  if (!adminCheck.valid) {
    return NextResponse.json(
      { ok: false, error: adminCheck.error ?? "Unauthorized" },
      { status: 401, headers: getSecurityHeaders() }
    );
  }

  try {
    const [leads, messages, intakes, orders] = await Promise.all([
      db.lead.count(),
      db.message.count({ where: { read: false } }),
      db.intake.count({ where: { status: "nuevo" } }),
      db.order.count({ where: { status: "pendiente" } }),
    ]);

    return NextResponse.json(
      {
        ok: true,
        counts: { leads, unreadMessages: messages, newIntakes: intakes, pendingOrders: orders },
      },
      { headers: getSecurityHeaders() }
    );
  } catch (error) {
    console.error(
      "[api/admin/session/PUT] Error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { ok: false, error: "Error al obtener datos." },
      { status: 500, headers: getSecurityHeaders() }
    );
  }
}
