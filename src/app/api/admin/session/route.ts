import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ADMIN_COOKIE,
  adminPasswordConfigured,
  createSessionToken,
  isAdminRequest,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/admin-auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    authed: await isAdminRequest(),
    configured: adminPasswordConfigured(),
  });
}

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "admin-session"), 5, 5 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: `Demasiados intentos. Reintenta en ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const parsed = z.object({ password: z.string().min(1).max(200) }).safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Falta la contraseña." }, { status: 400 });
    }

    if (!adminPasswordConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Acceso deshabilitado: define ADMIN_PASSWORD (mín. 8 caracteres) en el archivo .env del servidor.",
        },
        { status: 503 },
      );
    }

    if (!verifyPassword(parsed.data.password)) {
      return NextResponse.json({ ok: false, error: "Contraseña incorrecta." }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, createSessionToken(), sessionCookieOptions());
    return res;
  } catch (error) {
    console.error("[api/admin/session]", error);
    return NextResponse.json({ ok: false, error: "Error interno." }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return res;
}

export async function PUT() {
  // Endpoint de control: verifica sesión y devuelve conteos básicos.
  if (!(await isAdminRequest())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const [leads, messages, intakes, orders] = await Promise.all([
    db.lead.count(),
    db.message.count({ where: { read: false } }),
    db.intake.count({ where: { status: "nuevo" } }),
    db.order.count({ where: { status: "pendiente" } }),
  ]);
  return NextResponse.json({ ok: true, counts: { leads, unreadMessages: messages, newIntakes: intakes, pendingOrders: orders } });
}
