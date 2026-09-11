"use client";

import * as React from "react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { EmptyState, ErrorState, LoadingState, SuccessNote } from "@/components/site/states";
import { useAsyncData } from "@/hooks/use-async-data";
import { useRouter } from "@/lib/router";
import { track } from "@/lib/analytics";
import { formatPrice } from "@/lib/utils";

/**
 * Checkout — busca el artículo (producto → plan) y crea un pedido PENDIENTE
 * vía POST /api/checkout. Pago manual por transferencia: nunca se simula un
 * pago real; el pedido nace "pendiente" y se confirma tras la transferencia.
 */

type Kind = "producto" | "plan";

type Item = {
  title: string;
  priceCents: number | null;
  kind: Kind;
};

type CheckoutResult = {
  order: {
    number: string;
    itemName: string;
    amountCents: number;
    status: string;
  };
  paymentNote: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CheckoutView({ slug }: { slug: string }) {
  const navigate = useRouter((s) => s.navigate);

  // Resuelve el artículo: primero producto; si 404, plan; si también 404, null
  // (artículo no disponible). La lógica de doble intento vive dentro del fetcher.
  const { status, data, reload } = useAsyncData<Item | null>(async () => {
    const rp = await fetch(`/api/products/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (rp.ok) {
      const p = (await rp.json()) as { title: string; priceCents: number };
      return { title: p.title, priceCents: p.priceCents, kind: "producto" };
    }
    if (rp.status === 404) {
      const rpl = await fetch(`/api/plans/${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (rpl.ok) {
        const pl = (await rpl.json()) as { title: string; priceCents: number | null };
        return { title: pl.title, priceCents: pl.priceCents, kind: "plan" };
      }
      if (rpl.status === 404) return null;
    }
    throw new Error("http");
  }, [slug]);
  const item = data;

  const [customerName, setCustomerName] = React.useState("");
  const [customerEmail, setCustomerEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<CheckoutResult | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!item || submitting) return;

    const name = customerName.trim();
    const email = customerEmail.trim();
    if (name.length < 2 || !EMAIL_RE.test(email)) {
      setFormError("Revisa tu nombre y tu email antes de continuar.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    track("checkout_submit", { kind: item.kind });

    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, kind: item.kind, customerName: name, customerEmail: email }),
      });
      const json = (await r.json().catch(() => null)) as
        | ({ ok: true } & CheckoutResult)
        | { ok: false; error?: string }
        | null;

      if (r.ok && json && "ok" in json && json.ok) {
        setResult({ order: json.order, paymentNote: json.paymentNote });
      } else {
        setFormError((json && "error" in json && json.error) || "No pudimos crear el pedido. Inténtalo de nuevo.");
      }
    } catch {
      setFormError("No pudimos contactar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return <LoadingState label="Preparando tu compra…" className="min-h-[50vh]" />;
  }

  if (status === "error") {
    return (
      <Container className="py-16">
        <ErrorState onRetry={reload} />
      </Container>
    );
  }

  if (!item) {
    return (
      <Container className="py-16">
        <EmptyState
          title="Artículo no disponible"
          hint="No encontramos este artículo en el catálogo ni en los planes. Puede que se haya retirado."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => navigate("tienda", {}, { source: "checkout-404" })}>
                Ir a la tienda
              </Button>
              <Button variant="ghost" onClick={() => navigate("planes", {}, { source: "checkout-404" })}>
                Ver planes
              </Button>
            </div>
          }
        />
      </Container>
    );
  }

  /* Confirmación ----------------------------------------------------------- */
  if (result) {
    return (
      <>
        <PageHeader
          eyebrow="Pedido creado"
          title="Pedido pendiente de pago"
          description="Guarda el número de pedido: lo necesitas para consultar el estado o identificar tu transferencia."
          breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Pedido", href: "#/pedido" }, { label: result.order.number }]}
        />
        <Container className="max-w-2xl py-8 sm:py-10">
          <SuccessNote message="Pedido creado correctamente. Te hemos guardado una copia en el servidor y recibirás un email con las instrucciones." />
          <Card className="mt-4">
            <CardHeader>
              <CardDescription>Número de pedido</CardDescription>
              <CardTitle className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">{result.order.number}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 text-sm">
                <span className="text-muted-foreground">Artículo</span>
                <span className="text-right font-medium">{result.order.itemName}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 text-sm">
                <span className="text-muted-foreground">Importe</span>
                <span className="text-right font-medium">{formatPrice(result.order.amountCents)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Estado</span>
                <Badge variant="secondary">Pendiente de pago</Badge>
              </div>
              <p className="rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                {result.paymentNote}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="#/pedido"
                  className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm font-semibold transition-colors hover:bg-accent"
                >
                  Consultar estado del pedido
                </a>
                <Button variant="ghost" onClick={() => navigate("home", {}, { source: "checkout-ok" })}>
                  Volver al inicio
                </Button>
              </div>
            </CardContent>
          </Card>
        </Container>
      </>
    );
  }

  /* Formulario -------------------------------------------------------------- */
  const soldOut = (item.priceCents ?? 0) <= 0;

  return (
    <>
      <PageHeader
        eyebrow={item.kind === "producto" ? "Producto digital" : "Plan de entrenamiento"}
        title={item.title}
        description="Pago por transferencia bancaria: rellena tus datos y crearemos tu pedido. Recibirás las instrucciones de pago por email."
        breadcrumb={[
          { label: "Inicio", href: "#/" },
          { label: item.kind === "producto" ? "Tienda" : "Planes", href: item.kind === "producto" ? "#/tienda" : "#/planes" },
          { label: item.title },
        ]}
      />

      <Container className="grid gap-6 py-8 sm:py-10 lg:grid-cols-[1fr_340px]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle className="text-base">Tus datos</CardTitle>
            <CardDescription>Los usamos únicamente para gestionar y entregarte el pedido.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="co-name">Nombre completo</Label>
                <Input
                  id="co-name"
                  name="name"
                  autoComplete="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="p. ej. María García"
                  className="h-11"
                  required
                  minLength={2}
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="co-email">Email</Label>
                <Input
                  id="co-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="h-11"
                  required
                  maxLength={120}
                />
              </div>

              {formError ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              ) : null}

              <Button type="submit" size="lg" className="w-full" disabled={submitting || soldOut}>
                {submitting ? "Creando pedido…" : soldOut ? "No disponible" : "Crear pedido"}
              </Button>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Al crear el pedido generamos una reserva pendiente. No se realiza ningún cobro automático: el pago se hace por
                transferencia siguiendo las instrucciones del email.
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardDescription>Resumen</CardDescription>
              <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Tipo</span>
                <Badge variant="muted">{item.kind === "producto" ? "Producto digital" : "Plan de entrenamiento"}</Badge>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-3">
                <span className="text-sm text-muted-foreground">Importe</span>
                <span className="text-xl font-bold">
                  {item.priceCents !== null && item.priceCents > 0 ? formatPrice(item.priceCents) : "A consultar"}
                </span>
              </div>
              {soldOut ? (
                <p className="text-xs leading-relaxed text-destructive">
                  Este artículo no está a la venta actualmente.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </Container>
    </>
  );
}
