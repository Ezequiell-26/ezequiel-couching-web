"use client";

import * as React from "react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { ErrorState } from "@/components/site/states";
import { track } from "@/lib/analytics";
import { formatDate, formatPrice } from "@/lib/utils";

/**
 * Estado de mi pedido — consulta SOLO con número + email coincidentes
 * (POST /api/orders/lookup). Sin cuentas: quien no tenga ambos datos,
 * no ve nada.
 */

type LookupOrder = {
  number: string;
  kind: string;
  itemName: string;
  amountCents: number;
  status: string;
  createdAt: string;
};

const STATUS_MAP: Record<string, { label: string; variant: "secondary" | "default" | "destructive" }> = {
  pendiente: { label: "Pendiente de pago", variant: "secondary" },
  pagado: { label: "Pagado", variant: "default" },
  entregado: { label: "Entregado", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, variant: "secondary" as const };
  return (
    <Badge
      variant={s.variant === "destructive" ? "default" : s.variant}
      className={s.variant === "destructive" ? "border-transparent bg-destructive text-destructive-foreground" : undefined}
    >
      {s.label}
    </Badge>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function PedidoView() {
  const [number, setNumber] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [order, setOrder] = React.useState<LookupOrder | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const num = number.trim();
    const em = email.trim();
    if (num.length < 4 || !EMAIL_RE.test(em)) {
      setError("Introduce el número de pedido (p. ej. EC-XXXXXX) y el email con el que compraste.");
      return;
    }

    setLoading(true);
    setError(null);
    setOrder(null);
    track("order_lookup");

    try {
      const r = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: num, email: em }),
      });
      const json = (await r.json().catch(() => null)) as
        | { ok: true; order: LookupOrder }
        | { ok: false; error?: string }
        | null;

      if (r.ok && json && "ok" in json && json.ok && "order" in json) {
        setOrder(json.order);
      } else {
        setError((json && "error" in json && json.error) || "No encontramos un pedido con esos datos.");
      }
    } catch {
      setError("No pudimos contactar con el servidor. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Pedidos"
        title="Estado de mi pedido"
        description="Consulta tu compra con el número de pedido y el email que usaste en el checkout. Sin cuentas: solo esos dos datos coincidentes dan acceso."
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Pedido" }]}
      />

      <Container className="max-w-2xl space-y-6 py-8 sm:py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buscar pedido</CardTitle>
            <CardDescription>El número te lo facilitamos al crear el pedido (empieza por «EC-»).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="po-number">Número de pedido</Label>
                  <Input
                    id="po-number"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="EC-XXXXXX"
                    className="h-11 font-mono"
                    autoComplete="off"
                    required
                    maxLength={40}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="po-email">Email de la compra</Label>
                  <Input
                    id="po-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="h-11"
                    required
                    maxLength={120}
                  />
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={loading}>
                {loading ? "Buscando…" : "Consultar pedido"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {loading ? <p aria-live="polite" className="text-center text-sm text-muted-foreground">Buscando tu pedido…</p> : null}

        {error && !loading ? <ErrorState message={error} /> : null}

        {order ? (
          <Card aria-live="polite">
            <CardHeader>
              <CardDescription>Pedido</CardDescription>
              <CardTitle className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">{order.number}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 text-sm">
                <span className="text-muted-foreground">Artículo</span>
                <span className="text-right font-medium">{order.itemName}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 text-sm">
                <span className="text-muted-foreground">Importe</span>
                <span className="text-right font-medium">{formatPrice(order.amountCents)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 text-sm">
                <span className="text-muted-foreground">Tipo</span>
                <span className="text-right font-medium">{order.kind === "plan" ? "Plan de entrenamiento" : "Producto digital"}</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 text-sm">
                <span className="text-muted-foreground">Estado</span>
                <StatusBadge status={order.status} />
              </div>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-muted-foreground">Fecha</span>
                <span className="text-right font-medium">{formatDate(order.createdAt)}</span>
              </div>
              {order.status === "pendiente" ? (
                <p className="rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  Tu pedido está pendiente de pago: revisa el email con las instrucciones de transferencia. Se activa en cuanto se
                  confirme el pago.
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </Container>
    </>
  );
}
