"use client";

import { Check } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/site/states";
import { useAsyncData } from "@/hooks/use-async-data";
import { PlaceholderNote } from "@/components/site/placeholder-note";
import { useRouter } from "@/lib/router";
import { formatPrice } from "@/lib/utils";

/**
 * Ficha de producto — GET /api/products/{slug}. Si el producto no existe o
 * está despublicado: estado vacío honesto y vuelta a la tienda.
 */

type ProductDetail = {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: string;
  priceCents: number;
  fileName: string | null;
};

const INCLUDED = [
  "Descarga digital del material, entregado por email.",
  "Acceso en cuanto se confirme el pago por transferencia.",
  "Soporte por email para dudas sobre el contenido.",
];

export function ProductoView({ slug }: { slug: string }) {
  const navigate = useRouter((s) => s.navigate);
  // 404 → null: producto inexistente o despublicado.
  const { status, data, reload } = useAsyncData<ProductDetail | null>(async () => {
    const r = await fetch(`/api/products/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("http");
    return (await r.json()) as ProductDetail;
  }, [slug]);
  const product = data;

  if (status === "loading") {
    return <LoadingState label="Cargando producto…" className="min-h-[50vh]" />;
  }

  if (status === "error") {
    return (
      <Container className="py-16">
        <ErrorState onRetry={reload} />
      </Container>
    );
  }

  if (!product) {
    return (
      <Container className="py-16">
        <EmptyState
          title="Producto no disponible"
          hint="Este producto ya no está publicado o nunca existió. Puedes ver el resto del catálogo."
          action={
            <Button onClick={() => navigate("tienda", {}, { source: "producto-404" })}>Volver a la tienda</Button>
          }
        />
      </Container>
    );
  }

  const soldOut = !(product.priceCents > 0);

  return (
    <>
      <PageHeader
        eyebrow="Producto digital"
        title={product.title}
        description={product.description}
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Tienda", href: "#/tienda" }, { label: product.title }]}
      >
        <div className="mt-4">
          <Badge variant="muted">{product.category.charAt(0).toUpperCase() + product.category.slice(1)}</Badge>
        </div>
      </PageHeader>

      <Container className="grid gap-6 py-8 sm:py-10 lg:grid-cols-[1fr_340px]">
        {/* Qué incluye */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Qué incluye</CardTitle>
              <CardDescription>Entrega 100% digital, sin envíos físicos.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-relaxed">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Check aria-hidden className="size-3.5 text-primary" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                Este es un producto 100% digital: no se envía nada físicamente. Recibirás el enlace de descarga por email una vez
                confirmada la transferencia.
              </p>
            </CardContent>
          </Card>

          {!product.fileName ? (
            <PlaceholderNote>
              Archivo pendiente de subir por el administrador: el material te llegará por email en cuanto esté disponible.
            </PlaceholderNote>
          ) : null}
        </div>

        {/* Compra */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardDescription>Precio</CardDescription>
              <CardTitle className="text-3xl font-bold tracking-tight">{formatPrice(product.priceCents)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                size="lg"
                className="w-full"
                disabled={soldOut}
                onClick={() => navigate("checkout", { slug: product.slug }, { source: "producto" })}
              >
                {soldOut ? "No disponible" : "Comprar ahora"}
              </Button>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Pago manual por transferencia: se crea un pedido pendiente y recibirás las instrucciones por email. Ningún cargo
                automático.
              </p>
            </CardContent>
          </Card>
        </div>
      </Container>
    </>
  );
}
