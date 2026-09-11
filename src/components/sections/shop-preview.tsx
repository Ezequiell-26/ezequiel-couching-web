"use client";

import { useEffect, useState } from "react";
import { ArrowRight, PackageOpen } from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/site/section-heading";
import { useRouter } from "@/lib/router";
import { formatPrice } from "@/lib/utils";
import { Skeleton } from "@/components/site/states";

type Product = { id: number; slug: string; title: string; description: string; priceCents: number; category: string };

export function ShopPreview() {
  const navigate = useRouter((s) => s.navigate);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("http"))))
      .then((data: Product[]) => {
        if (alive) setProducts(data.slice(0, 3));
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section aria-labelledby="shop-title" className="py-16 sm:py-20">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Tienda"
            title="Recursos digitales listos para usar"
            description="Programas y guías descargables con el mismo método del coaching."
          />
          <button
            type="button"
            onClick={() => navigate("tienda")}
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-foreground"
          >
            Ver tienda
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-8 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            No pudimos cargar la tienda. Inténtalo de nuevo en unos segundos.
          </p>
        ) : products === null ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-44" /><Skeleton className="h-44" /><Skeleton className="h-44" />
          </div>
        ) : products.length === 0 ? (
          <div className="mt-8 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card/50 py-10 text-center">
            <PackageOpen aria-hidden className="size-6 text-muted-foreground" />
            <p className="font-medium">El catálogo se está preparando</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Todavía no hay productos publicados. Mientras tanto puedes ver los planes de entrenamiento.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate("producto", { slug: p.slug })}
                className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/40"
              >
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">{p.category}</p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-muted-foreground">{p.description}</p>
                <span className="mt-4 inline-flex items-center justify-between text-sm font-semibold text-primary">
                  {formatPrice(p.priceCents)}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </button>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
