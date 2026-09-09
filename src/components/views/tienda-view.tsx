"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, Skeleton } from "@/components/site/states";
import { useAsyncData } from "@/hooks/use-async-data";
import { useRouter } from "@/lib/router";
import { track } from "@/lib/analytics";
import { cn, formatPrice } from "@/lib/utils";

/**
 * Tienda — catálogo de productos digitales desde GET /api/products.
 * Chips de categoría derivadas de los datos reales (nada inventado) y
 * navegación a la ficha de producto vía router SPA.
 */

export type ShopProduct = {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: string;
  priceCents: number;
};

function catLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function TiendaView({ category }: { category?: string }) {
  const navigate = useRouter((s) => s.navigate);
  const { status, data, reload } = useAsyncData<ShopProduct[]>(async () => {
    const r = await fetch("/api/products", { cache: "no-store" });
    if (!r.ok) throw new Error("http");
    const json = (await r.json()) as ShopProduct[];
    return Array.isArray(json) ? json : [];
  }, []);
  const products = data;
  const [active, setActive] = React.useState<string>(category ?? "todo");

  // Si se navega a #/tienda/[categoría] estando ya en la tienda, sincroniza el filtro
  // (ajuste durante el render, sin effect).
  const [prevCategory, setPrevCategory] = React.useState(category);
  if (prevCategory !== category) {
    setPrevCategory(category);
    setActive(category ?? "todo");
  }

  const categories = React.useMemo(
    () => Array.from(new Set((products ?? []).map((p) => p.category))).sort((a, b) => a.localeCompare(b)),
    [products],
  );

  const filtered = products
    ? active === "todo"
      ? products
      : products.filter((p) => p.category === active)
    : [];

  function pick(cat: string) {
    setActive(cat);
    track("shop_filter", { category: cat });
  }

  return (
    <>
      <PageHeader
        eyebrow="Tienda"
        title="Productos digitales"
        description="Programas y guías descargables. Pago por transferencia y entrega por email tras confirmar el pago."
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Tienda" }]}
      />

      <Container className="py-8 sm:py-10">
        {/* Chips de categoría (derivadas de los datos) */}
        <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Filtrar por categoría">
          <button
            type="button"
            onClick={() => pick("todo")}
            aria-pressed={active === "todo"}
            className={cn(
              "h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
              active === "todo" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent",
            )}
          >
            Todo
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => pick(c)}
              aria-pressed={active === c}
              className={cn(
                "h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
                active === c ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent",
              )}
            >
              {catLabel(c)}
            </button>
          ))}
        </div>

        {/* Carga */}
        {status === "loading" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="mt-4 h-6 w-3/4" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-5/6" />
                <Skeleton className="mt-5 h-7 w-28" />
              </div>
            ))}
            <span className="sr-only">Cargando productos…</span>
          </div>
        ) : null}

        {/* Error */}
        {status === "error" ? <ErrorState onRetry={reload} /> : null}

        {/* Vacío honesto: catálogo sin datos */}
        {status === "ready" && products !== null && products.length === 0 ? (
          <EmptyState
            title="El catálogo se está preparando"
            hint="Todavía no hay productos publicados. Vuelve a intentarlo en unos minutos."
          />
        ) : null}

        {/* Vacío por filtro sin resultados */}
        {status === "ready" && products !== null && products.length > 0 && filtered.length === 0 ? (
          <EmptyState
            title="No hay productos en esta categoría"
            hint="Prueba con otra categoría o vuelve a ver todo el catálogo."
            action={
              <button
                type="button"
                onClick={() => pick("todo")}
                className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
              >
                Ver todo
              </button>
            }
          />
        ) : null}

        {/* Grid de productos */}
        {products !== null && filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Card key={p.slug} className="group flex flex-col transition-colors hover:border-primary/50">
                <button
                  type="button"
                  onClick={() => navigate("producto", { slug: p.slug }, { source: "tienda" })}
                  className="flex h-full flex-col items-start p-5 text-left"
                  aria-label={`Ver detalle de ${p.title}`}
                >
                  <Badge variant="muted">{catLabel(p.category)}</Badge>
                  <span className="mt-3 text-lg font-semibold leading-snug">{p.title}</span>
                  <span className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">{p.description}</span>
                  <span className="mt-4 flex w-full items-center justify-between">
                    <span className="text-xl font-bold">{formatPrice(p.priceCents)}</span>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Ver detalle
                      <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </button>
              </Card>
            ))}
          </div>
        ) : null}
      </Container>
    </>
  );
}
