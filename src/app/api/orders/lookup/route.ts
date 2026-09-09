import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  number: z.string().min(4).max(40),
  email: z.string().email().max(120),
});

/** Consulta de pedido SOLO con número + email coincidentes (privacidad). */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "order-lookup"), 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: `Demasiadas consultas. Reintenta en ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Introduce el número de pedido y el email de la compra." },
        { status: 400 },
      );
    }

    const order = await db.order.findFirst({
      where: {
        number: parsed.data.number.trim().toUpperCase(),
        customerEmail: parsed.data.email.toLowerCase(),
      },
      select: {
        number: true,
        kind: true,
        itemName: true,
        amountCents: true,
        status: true,
        createdAt: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "No encontramos un pedido con esos datos." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, order });
  } catch (error) {
    console.error("[api/orders/lookup]", error);
    return NextResponse.json(
      { ok: false, error: "Error interno. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
