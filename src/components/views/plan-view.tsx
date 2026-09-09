"use client";

import { ArrowLeft, Check, Download } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { Reveal } from "@/components/site/reveal";
import { CTAButton } from "@/components/site/cta-button";
import { LoadingState, ErrorState, EmptyState } from "@/components/site/states";
import { useAsyncData } from "@/hooks/use-async-data";
import { PlaceholderNote } from "@/components/site/placeholder-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/lib/router";
import { formatPrice } from "@/lib/utils";

type PlanDetail = {
  id: number;
  slug: string;
  title: string;
  level: string;
  weeks: number;
  summary: string;
  priceCents: number | null;
};

/** Qué recibe quien compra un plan: descripción honesta de producto digital. */
const WHAT_YOU_GET = [
  "Documento del programa en PDF: estructura por semanas, sesiones y progresión definida.",
  "Acceso y descarga por email tras confirmar el pago (entrega digital, sin envío físico).",
  "Actualizaciones del documento si se revisa el contenido.",
  "Uso personal e intransferible: no se permite redistribuir el material.",
];

/**
 * Detalle de plan (#/planes/[slug]) — datos reales de la API.
 * 404 honesto + compra directa a checkout.
 */
export function PlanView({ slug }: { slug: string }) {
  const navigate = useRouter((s) => s.navigate);
  // 404 → null: el plan no está publicado (estado "missing" del diseño original).
  const { status, data, reload } = useAsyncData<PlanDetail | null>(async () => {
    const res = await fetch(`/api/plans/${encodeURIComponent(slug)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as PlanDetail;
  }, [slug]);
  const plan = data;

  if (status === "loading") {
    return (
      <div className="py-16 sm:py-24">
        <Container>
          <LoadingState label="Cargando plan…" />
        </Container>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="py-16 sm:py-24">
        <Container className="max-w-2xl">
          <ErrorState onRetry={reload} />
        </Container>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="py-16 sm:py-24">
        <Container className="max-w-2xl">
          <h1 className="sr-only">Plan no encontrado</h1>
          <EmptyState
            title="No encontramos este plan"
            hint={`No hay ningún plan publicado con el identificador "${slug}". Puede que el enlace esté anticuado o que el plan ya no esté disponible.`}
            action={
              <Button variant="outline" onClick={() => navigate("planes")}>
                <ArrowLeft aria-hidden />
                Volver a planes
              </Button>
            }
          />
        </Container>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Plan de entrenamiento"
        title={plan.title}
        description={plan.summary}
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Planes", href: "#/planes" }, { label: plan.title }]}
      >
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge variant="default">
            {plan.priceCents != null ? formatPrice(plan.priceCents) : "Precio por confirmar"}
          </Badge>
          <Badge variant="secondary">{plan.level}</Badge>
          <Badge variant="outline">{plan.weeks} semanas</Badge>
        </div>
      </PageHeader>

      <section aria-labelledby="plan-detalle" className="py-12 sm:py-16">
        <Container className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-8">
            <Reveal>
              <div>
                <h2 id="plan-detalle" className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Qué incluye
                </h2>
                <ul className="mt-5 space-y-2.5">
                  {WHAT_YOU_GET.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground/90"
                    >
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
                <h2 className="text-lg font-bold tracking-tight">Honestidad sobre el formato</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Este es un plan de plantilla: estructurado y progresivo, pero no incluye seguimiento ni ajustes
                  personalizados. Si quieres un plan hecho a tu medida con revisión, el coaching online es la vía.
                </p>
              </div>
            </Reveal>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Reveal delay={0.1}>
              <div className="rounded-xl border border-primary/40 bg-brand-halo p-5 sm:p-6">
                <p className="text-sm text-muted-foreground">Precio</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-primary">
                  {plan.priceCents != null ? formatPrice(plan.priceCents) : "Por confirmar"}
                </p>
                <div className="mt-5 flex flex-col gap-2.5">
                  <CTAButton
                    view="checkout"
                    params={{ slug: plan.slug }}
                    event="cta_click"
                    eventProps={{ label: `comprar_plan:${plan.slug}` }}
                    source="plan"
                    className="w-full"
                    disabled={plan.priceCents == null}
                  >
                    Comprar el plan
                  </CTAButton>
                  <CTAButton variant="outline" view="planes" source="plan" withArrow={false} className="w-full">
                    Comparar planes
                  </CTAButton>
                </div>
                <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                  <Download aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                  Entrega digital: recibirás el acceso por email tras confirmar el pago. No se envía nada físico.
                </p>
              </div>
            </Reveal>
          </aside>
        </Container>
      </section>

      {/* Siguiente paso */}
      <section aria-labelledby="plan-siguiente" className="border-t border-border/60 bg-card/30 py-12 sm:py-16">
        <Container>
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h2 id="plan-siguiente" className="text-xl font-bold tracking-tight">Siguiente paso</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              ¿Dudas entre un plan de plantilla y el coaching? El cuestionario inicial es gratis y sin compromiso:
              con tus datos te oriento hacia lo que mejor encaja.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <CTAButton view="cuestionario" event="cta_click" eventProps={{ label: "cta_plan" }} source="plan">
                Rellenar el cuestionario
              </CTAButton>
              <CTAButton variant="outline" view="coaching" source="plan" withArrow={false}>
                Ver coaching online
              </CTAButton>
            </div>
            <PlaceholderNote className="mt-5">
              Si el precio aparece como placeholder, la tarifa aún no está fijada en el panel de administración.
            </PlaceholderNote>
          </div>
        </Container>
      </section>
    </>
  );
}
