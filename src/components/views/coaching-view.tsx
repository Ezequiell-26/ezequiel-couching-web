"use client";

import { ArrowRight, Check, ClipboardList, LineChart, Calculator, MessagesSquare } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";
import { PlaceholderNote } from "@/components/site/placeholder-note";
import { CTAButton } from "@/components/site/cta-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/lib/router";
import { track } from "@/lib/analytics";
import { services, methodPhases, valueProps } from "@/lib/content/site";

const VALUE_ICONS: Record<string, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  clipboard: ClipboardList,
  "line-chart": LineChart,
  calculator: Calculator,
  "messages-square": MessagesSquare,
};

const PROBLEMS = [
  "Entrenas sin plan claro y cada sesión acaba siendo una improvisación.",
  "Empiezas con ganas y a las tres semanas la rutina se rompe.",
  "No sabes si progresas: sin registro ni revisión, todo depende de sensaciones.",
];

/**
 * Coaching — landing del servicio con los 3 niveles completos, cómo funciona
 * (fases resumidas), problemas/valor y CTA al cuestionario inicial.
 */
export function CoachingView() {
  const navigate = useRouter((s) => s.navigate);

  return (
    <>
      <PageHeader
        eyebrow="Coaching online"
        title="Entrenamiento con método, seguimiento real y cero letra pequeña"
        description="Tres niveles de acompañamiento para salir de la improvisación: plan personalizado, revisión periódica y comunicación directa con tu entrenador."
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Coaching" }]}
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <CTAButton
            view="cuestionario"
            event="cta_click"
            eventProps={{ label: "empezar_evaluacion" }}
            source="coaching"
          >
            Empezar con el cuestionario
          </CTAButton>
          <Button variant="outline" onClick={() => navigate("planes")}>
            Ver planes de entrenamiento
          </Button>
        </div>
      </PageHeader>

      {/* Problemas → valor */}
      <section aria-labelledby="coaching-problemas" className="py-14 sm:py-16">
        <Container>
          <div className="grid gap-8 lg:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-xl border border-border bg-card p-6">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">El problema</p>
                <h2 id="coaching-problemas" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  Suena a esto?
                </h2>
                <ul className="mt-5 space-y-3">
                  {PROBLEMS.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="h-full rounded-xl border border-border bg-card p-6">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">La propuesta</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Cómo lo resolvemos</h2>
                <ul className="mt-5 space-y-4">
                  {valueProps.map((v) => {
                    const Icon = VALUE_ICONS[v.icon] ?? Check;
                    return (
                      <li key={v.title} className="flex items-start gap-3">
                        <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
                        <div>
                          <p className="text-sm font-semibold sm:text-base">{v.title}</p>
                          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* Servicios completos */}
      <section aria-labelledby="coaching-servicios" className="border-y border-border/60 bg-card/30 py-14 sm:py-16">
        <Container>
          <SectionHeading
            eyebrow="Servicios"
            title="Elige tu nivel de acompañamiento"
            description="Los tres incluyen plan personalizado y seguimiento. Cada nivel añade cercanía y profundidad."
          />
          <div className="mt-4">
            <PlaceholderNote>
              Tarifas pendientes de confirmar: los precios se muestran como placeholder hasta fijarlos.
            </PlaceholderNote>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {services.map((s, i) => (
              <Reveal key={s.slug} delay={0.06 * i}>
                <article className="flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">{s.level}</p>
                    <Badge variant="secondary">Precio: {s.price}</Badge>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight">{s.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.summary}</p>

                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-foreground/70">Qué incluye</p>
                  <ul className="mt-2 space-y-1.5">
                    {s.includes.map((inc) => (
                      <li key={inc} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                        {inc}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-foreground/70">Para quién es</p>
                  <ul className="mt-2 space-y-1.5">
                    {s.for.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="mt-6 w-full sm:w-auto"
                    onClick={() => {
                      track("cta_click", { label: `servicio:${s.slug}`, source: "coaching" });
                      navigate("servicio", { slug: s.slug });
                    }}
                  >
                    Ver detalle
                    <ArrowRight aria-hidden />
                  </Button>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Cómo funciona (fases resumidas) */}
      <section aria-labelledby="coaching-metodo" className="py-14 sm:py-16">
        <Container>
          <SectionHeading
            eyebrow="Cómo funciona"
            title="Un proceso de cuatro fases"
            description="Igual para todos los niveles: lo que cambia es la intensidad del seguimiento."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {methodPhases.map((p, i) => (
              <Reveal key={p.n} delay={0.05 * i}>
                <div className="h-full rounded-xl border border-border bg-card p-5">
                  <p className="font-mono text-sm text-primary">{p.n}</p>
                  <h3 className="mt-2 font-semibold">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => navigate("metodo")}
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-foreground"
            >
              Ver el método completo
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>
          </div>
        </Container>
      </section>

      {/* CTA final */}
      <section aria-labelledby="coaching-cta" className="pb-16 sm:pb-20">
        <Container>
          <Reveal>
            <div className="rounded-xl border border-primary/40 bg-brand-halo p-6 text-center sm:p-10">
              <h2 id="coaching-cta" className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
                El primer paso no es pagar: es responder cuatro preguntas
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
                Con el cuestionario inicial tengo lo necesario para prepararte una propuesta honesta: qué servicio te encaja y por dónde empezar.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <CTAButton
                  size="lg"
                  view="cuestionario"
                  event="cta_click"
                  eventProps={{ label: "cta_final_coaching" }}
                  source="coaching"
                >
                  Rellenar el cuestionario
                </CTAButton>
                <CTAButton
                  size="lg"
                  variant="outline"
                  view="contacto"
                  source="coaching"
                  withArrow={false}
                >
                  Escribir antes de decidir
                </CTAButton>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
