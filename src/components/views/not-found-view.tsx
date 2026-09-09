"use client";

import { ArrowRight } from "lucide-react";
import { Container } from "@/components/site/container";
import { useRouter, type ViewId } from "@/lib/router";

const MAIN_LINKS: { label: string; view: ViewId }[] = [
  { label: "Inicio", view: "home" },
  { label: "Coaching", view: "coaching" },
  { label: "Planes", view: "planes" },
  { label: "Tienda", view: "tienda" },
  { label: "Calculadoras", view: "calculadoras" },
  { label: "Blog", view: "blog" },
  { label: "FAQ", view: "faq" },
  { label: "Contacto", view: "contacto" },
];

/**
 * 404 (#/404 y rutas desconocidas) — mensaje claro + salidas principales.
 * Sin bloque de siguiente paso (es una página de error).
 */
export function NotFoundView() {
  const navigate = useRouter((s) => s.navigate);

  return (
    <section aria-labelledby="notfound-title" className="py-16 sm:py-24">
      <Container className="max-w-3xl text-center">
        <p aria-hidden className="font-mono text-7xl font-bold tracking-tight text-primary sm:text-8xl">
          404
        </p>
        <h1 id="notfound-title" className="mt-4 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
          Esta página no existe o cambió de dirección
        </h1>
        <p className="mx-auto mt-3 max-w-md text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
          El enlace puede estar anticuado. Aquí tienes las salidas principales para seguir navegando.
        </p>

        <nav aria-label="Páginas principales" className="mt-8">
          <ul className="grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
            {MAIN_LINKS.map((l) => (
              <li key={l.view}>
                <button
                  type="button"
                  onClick={() => navigate(l.view)}
                  className="group flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  {l.label}
                  <ArrowRight
                    aria-hidden
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  />
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </section>
  );
}
