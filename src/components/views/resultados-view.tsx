"use client";

import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";
import { EmptyState } from "@/components/site/states";
import { CTAButton } from "@/components/site/cta-button";
import { testimonials } from "@/lib/content/site";

const HAS_PLACEHOLDERS = testimonials.some(
  (t) => t.quote.includes("[SUSTITUIR") || t.author.includes("["),
);

const WHEN_READY = [
  "Contexto del cliente: objetivo y punto de partida (sin datos sensibles).",
  "Tiempo de trabajo conjunto y qué servicio se utilizó.",
  "Qué se hizo: estructura del plan, ajustes y seguimiento.",
  "Resultado descrito con contexto, sin cifras infladas ni promesas.",
];

/**
 * Resultados (#/resultados) — sección honesta: mientras no existan testimonios
 * con consentimiento escrito, no se publica nada inventado.
 */
export function ResultadosView() {
  return (
    <>
      <PageHeader
        eyebrow="Resultados"
        title="Resultados con contexto, no capturas sueltas"
        description="Aquí se publicarán casos reales de clientes. Mientras no haya consentimiento escrito, esta sección se queda vacía: prefiero deber un testimonio que inventar uno."
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Resultados" }]}
      />

      {HAS_PLACEHOLDERS ? (
        <section aria-labelledby="resultados-nota" className="py-12 sm:py-16">
          <Container className="max-w-3xl">
            <div
              role="note"
              className="rounded-xl border border-primary/40 bg-primary/10 px-5 py-4 text-sm leading-relaxed sm:px-6"
            >
              <p className="font-semibold">Los testimonios se publican solo con consentimiento escrito.</p>
              <p className="mt-1.5 text-muted-foreground">
                Ningún testimonio de esta web se publica sin permiso explícito y verificable de quien lo firma.
              </p>
            </div>

            <Reveal>
              <div className="mt-8">
                <SectionHeading
                  title="Qué incluirá esta sección"
                  description="Cuando haya casos publicables, cada testimonio vendrá con este contexto:"
                />
                <ul className="mt-5 space-y-2.5">
                  {WHEN_READY.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground/90"
                    >
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <div className="mt-8">
                <EmptyState
                  title="Aún no hay casos publicados"
                  hint="El trabajo es reciente o los clientes aún no han dado permiso. En cuanto haya casos con consentimiento, aparecerán aquí."
                />
              </div>
            </Reveal>
          </Container>
        </section>
      ) : (
        <section aria-label="Testimonios" className="py-12 sm:py-16">
          <Container>
            <div className="grid gap-4 md:grid-cols-2">
              {testimonials.map((t, i) => (
                <Reveal key={t.author} delay={0.05 * i}>
                  <figure className="h-full rounded-xl border border-border bg-card p-5 sm:p-6">
                    <blockquote className="text-sm leading-relaxed text-foreground/90 sm:text-base">
                      “{t.quote}”
                    </blockquote>
                    <figcaption className="mt-4 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{t.author}</span> · {t.detail}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      <section aria-labelledby="resultados-disclaimer" className="pb-12 sm:pb-16">
        <Container className="max-w-3xl">
          <div
            role="note"
            className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground sm:text-sm"
          >
            <span id="resultados-disclaimer" className="font-semibold text-foreground/80">Aviso honesto:</span>{" "}
            los resultados individuales varían según adherencia, punto de partida, descanso, alimentación y
            condiciones personales. Nada en esta web debe leerse como promesa de resultados.
          </div>
        </Container>
      </section>

      {/* Siguiente paso */}
      <section aria-labelledby="resultados-siguiente" className="pb-16 sm:pb-20">
        <Container>
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h2 id="resultados-siguiente" className="text-xl font-bold tracking-tight">Siguiente paso</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Si prefieres juzgar por método en lugar de por testimonios, esta es la propuesta: evaluación, plan y revisión con datos.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <CTAButton view="cuestionario" event="cta_click" eventProps={{ label: "cta_resultados" }} source="resultados">
                Empezar con el cuestionario
              </CTAButton>
              <CTAButton variant="outline" view="metodo" source="resultados" withArrow={false}>
                Ver el método
              </CTAButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
