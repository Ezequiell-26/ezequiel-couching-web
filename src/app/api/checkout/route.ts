import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  slug: z.string().min(1).max(120),
  kind: z.enum(["producto", "plan"]),
  customerName: z.string().min(2).max(80),
  customerEmail: z.string().email().max(120),
});

/**
 * Crea un pedido PENDIENTE (pago manual por transferencia).
 * PAGO REAL (Stripe/Mercado Pago): PENDIENTE de configurar credenciales.
 * No se simula pago: el pedido nace "pendiente" y el entrenador lo marca
 * "pagado" desde el panel tras comprobar la transferencia.
 */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "checkout"), 6, 60_000);
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
        { ok: false, error: "Revisa los datos del formulario." },
        { status: 400 },
      );
    }
    const d = parsed.data;

    const item =
      d.kind === "producto"
        ? await db.product.findFirst({ where: { slug: d.slug, active: true } })
        : await db.plan.findFirst({ where: { slug: d.slug, active: true } });

    if (!item) {
      return NextResponse.json(
        { ok: false, error: "El artículo ya no está disponible." },
        { status: 404 },
      );
    }

    const amountCents = d.kind === "producto"
      ? (item as { priceCents: number }).priceCents
      : (item as { priceCents: number | null }).priceCents ?? 0;

    if (amountCents <= 0) {
      return NextResponse.json(
        { ok: false, error: "Este artículo no está a la venta actualmente." },
        { status: 400 },
      );
    }

    const number = `EC-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`;

    const order = await db.order.create({
      data: {
        number,
        kind: d.kind,
        itemSlug: d.slug,
        itemName: item.title,
        amountCents,
        customerName: d.customerName,
        customerEmail: d.customerEmail.toLowerCase(),
        status: "pendiente",
        provider: "manual",
      },
    });

    return NextResponse.json({
      ok: true,
      order: {
        number: order.number,
        itemName: order.itemName,
        amountCents: order.amountCents,
        status: order.status,
      },
      paymentNote:
        "Pago por transferencia bancaria. Los datos de la cuenta se enviarán por email — [SUSTITUIR: IBAN del titular]. El pedido se activa al confirmar el pago.",
    });
  } catch (error) {
    console.error("[api/checkout]", error);
    return NextResponse.json(
      { ok: false, error: "No pudimos crear el pedido. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
