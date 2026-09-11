"use client";

import { ArrowRight, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { Reveal } from "@/components/site/reveal";
import { CTAButton } from "@/components/site/cta-button";
import { ErrorState, EmptyState, Skeleton } from "@/components/site/states";
import { useAsyncData } from "@/hooks/use-async-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/lib/router";
import { track } from "@/lib/analytics";
import { formatPrice } from "@/lib/utils";

type PlanRow = {
  id: number;
  slug: string;
  title: string;
  level: string;
  weeks: number;
  summary: string;
  priceCents: number | null;
};

/**
 * Planes (#/planes) — índice de planes de entrenamiento publicados (API real).
 * Estados explícitos: carga, error con reintento y vacío honesto.
 */
export function PlanesView() {
  const navigate = useRouter((s) => s.navigate);
  const { status, data, reload } = useAsyncData<PlanRow[]>(async () => {
    const res = await fetch("/api/plans");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as PlanRow[];
    return Array.isArray(json) ? json : [];
  }, []);
  const plans = data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Planes"
        title="Planes de entrenamiento listos para empezar"
        description="Programas estructurados por semanas, con progresión definida. Compra directa y entrega digital: sin suscripción ni permanencia."
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Planes" }]}
      />

      <section aria-labelledby="planes-lista" className="py-12 sm:py-16">
        <Container>
          <h2 id="planes-lista" className="sr-only">Listado de planes</h2>

          {status === "loading" ? (
            <div role="status" aria-live="polite">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-5 sm:p-6">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="mt-3 h-6 w-3/4" />
                    <Skeleton className="mt-3 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-5/6" />
                    <Skeleton className="mt-5 h-9 w-full" />
                  </div>
                ))}
              </div>
              <p className="sr-only">Cargando planes…</p>
            </div>
          ) : null}

          {status === "error" ? (
            <ErrorState
              message="No pudimos cargar los planes. Comprueba tu conexión e inténtalo de nuevo."
              onRetry={reload}
            />
          ) : null}

          {status === "ready" && plans.length === 0 ? (
            <EmptyState
              title="Todavía no hay planes publicados"
              hint="Estamos preparando los primeros programas. Mientras tanto, el coaching online sí está disponible."
              action={
                <Button variant="outline" onClick={() => navigate("coaching")}>
                  Ver servicios de coaching
                  <ArrowRight aria-hidden />
                </Button>
              }
            />
          ) : null}

          {status === "ready" && plans.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((p, i) => (
                <Reveal key={p.slug} delay={0.05 * i}>
                  <article className="flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{p.level}</Badge>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays aria-hidden className="size-3.5" />
                        {p.weeks} semanas
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-semibold tracking-tight">{p.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{p.summary}</p>
                    <p className="mt-4 text-lg font-bold text-primary">
                      {p.priceCents != null ? formatPrice(p.priceCents) : "Precio por confirmar"}
                    </p>
                    <Button
                      className="mt-4 w-full sm:w-auto"
                      onClick={() => {
                        track("cta_click", { label: `plan:${p.slug}`, source: "planes" });
                        navigate("plan", { slug: p.slug });
                      }}
                    >
                      Ver el plan
                      <ArrowRight aria-hidden />
                    </Button>
                  </article>
                </Reveal>
              ))}
            </div>
          ) : null}
        </Container>
      </section>

      {/* Siguiente paso */}
      <section aria-labelledby="planes-siguiente" className="pb-16 sm:pb-20">
        <Container>
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h2 id="planes-siguiente" className="text-xl font-bold tracking-tight">Siguiente paso</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              ¿Prefieres algo ajustado a ti en lugar de un plan de plantilla? Cuéntame tu situación y valoramos el coaching.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <CTAButton view="cuestionario" event="cta_click" eventProps={{ label: "cta_planes" }} source="planes">
                Rellenar el cuestionario
              </CTAButton>
              <CTAButton variant="outline" view="coaching" source="planes" withArrow={false}>
                Ver coaching online
              </CTAButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
