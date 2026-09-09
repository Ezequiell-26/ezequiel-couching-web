"use client";

import { Check } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";
import { CTAButton } from "@/components/site/cta-button";
import { methodPhases } from "@/lib/content/site";

/** Principios de trabajo: declaraciones de método, no promesas de resultado. */
const PRINCIPLES = [
  {
    title: "Consistencia > intensidad",
    body: "Un plan que puedas repetir durante meses vale más que una semana heroica. La progresión vive en la constancia, no en el heroísmo.",
  },
  {
    title: "Técnica > carga",
    body: "Primero dominar el movimiento, después sumar kilos. La técnica es el techo de tu progreso y la base para entrenar sin lesiones.",
  },
  {
    title: "Progreso medible",
    body: "Series, cargas y sensaciones quedan registradas. Con datos se ajusta; sin datos, solo se adivina.",
  },
];

/**
 * Método (#/metodo) — fases completas en timeline vertical + principios.
 */
export function MetodoView() {
  return (
    <>
      <PageHeader
        eyebrow="Método"
        title="Cuatro fases, cero improvisación"
        description="El mismo proceso para cada cliente: evaluar, planificar, ejecutar y revisar. Simple de explicar, exigente de hacer bien."
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Método" }]}
      />

      <section aria-labelledby="metodo-fases" className="py-12 sm:py-16">
        <Container className="max-w-3xl">
          <SectionHeading title="Las fases" description="Qué pasa en cada etapa del trabajo conjunto." />
          <ol className="relative mt-8 space-y-6 border-l border-border pl-6 sm:pl-8">
            {methodPhases.map((p, i) => (
              <li key={p.n} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-[2.6rem] flex size-8 items-center justify-center rounded-full border border-primary/50 bg-background font-mono text-xs text-primary sm:-left-[3.1rem]"
                >
                  {p.n}
                </span>
                <Reveal delay={0.05 * i}>
                  <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
                    <h3 className="text-lg font-semibold tracking-tight">{p.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{p.body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section aria-labelledby="metodo-principios" className="border-y border-border/60 bg-card/30 py-12 sm:py-16">
        <Container>
          <SectionHeading
            eyebrow="Principios"
            title="Las tres reglas que ordenan todo lo demás"
            description="Si en algún momento dudamos de una decisión, volvemos a estas tres."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PRINCIPLES.map((pr, i) => (
              <Reveal key={pr.title} delay={0.06 * i}>
                <div className="h-full rounded-xl border border-border bg-card p-5 sm:p-6">
                  <Check aria-hidden className="size-5 text-primary" />
                  <h3 className="mt-3 text-lg font-semibold tracking-tight">{pr.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pr.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section aria-labelledby="metodo-cta" className="py-12 sm:py-16">
        <Container>
          <Reveal>
            <div className="rounded-xl border border-primary/40 bg-brand-halo p-6 text-center sm:p-10">
              <h2 id="metodo-cta" className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
                La fase 01 empieza con tus datos
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
                Sin datos no hay plan serio. El cuestionario inicial es el punto de partida de todo el proceso.
              </p>
              <div className="mt-6">
                <CTAButton
                  size="lg"
                  view="cuestionario"
                  event="cta_click"
                  eventProps={{ label: "cta_metodo" }}
                  source="metodo"
                >
                  Rellenar el cuestionario
                </CTAButton>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Siguiente paso */}
      <section aria-labelledby="metodo-siguiente" className="pb-16 sm:pb-20">
        <Container>
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h2 id="metodo-siguiente" className="text-xl font-bold tracking-tight">Siguiente paso</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Mira el método aplicado a los servicios de coaching o compara niveles antes de decidir.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <CTAButton view="coaching" source="metodo">
                Ver servicios de coaching
              </CTAButton>
              <CTAButton variant="outline" view="planes" source="metodo" withArrow={false}>
                Ver planes de entrenamiento
              </CTAButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
