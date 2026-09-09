"use client";

import { ArrowLeft, Check } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";
import { EmptyState } from "@/components/site/states";
import { CTAButton } from "@/components/site/cta-button";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/lib/router";
import { services, methodPhases, homeFaqs } from "@/lib/content/site";

/** FAQ genérica del servicio, construida solo con contenido existente. */
const SERVICE_FAQS = [homeFaqs[0], homeFaqs[1], homeFaqs[2]];

/**
 * Detalle de servicio de coaching (#/coaching/[slug]).
 * Si el slug no existe → estado vacío honesto con vuelta al listado.
 */
export function ServicioDetailView({ slug }: { slug: string }) {
  const navigate = useRouter((s) => s.navigate);
  const service = services.find((s) => s.slug === slug);

  if (!service) {
    return (
      <section aria-labelledby="servicio-notfound" className="py-16 sm:py-24">
        <Container className="max-w-2xl">
          <h1 id="servicio-notfound" className="sr-only">Servicio no encontrado</h1>
          <EmptyState
            title="No encontramos este servicio"
            hint={`No hay ningún servicio de coaching con el identificador "${slug}". Puede que el enlace esté anticuado.`}
            action={
              <Button variant="outline" onClick={() => navigate("coaching")}>
                <ArrowLeft aria-hidden />
                Volver a coaching
              </Button>
            }
          />
        </Container>
      </section>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={service.level}
        title={service.name}
        description={service.summary}
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Coaching", href: "#/coaching" }, { label: service.name }]}
      >
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge variant="default">Precio: {service.price}</Badge>
          <Badge variant="outline">{service.level}</Badge>
        </div>
      </PageHeader>

      <section aria-labelledby="servicio-incluye" className="py-12 sm:py-16">
        <Container className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-10">
            <Reveal>
              <div>
                <SectionHeading title="Qué incluye" description="Todo lo que recibe tu mensualidad, sin letra pequeña." />
                <ul className="mt-5 space-y-2.5">
                  {service.includes.map((inc) => (
                    <li
                      key={inc}
                      className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground/90"
                    >
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                      {inc}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <div>
                <SectionHeading title="Para quién es" description="Si te reconoces aquí, este nivel tiene sentido." />
                <ul className="mt-5 space-y-2.5">
                  {service.for.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground/90"
                    >
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <div>
                <SectionHeading title="El proceso" description="Cómo trabajaremos, fase a fase." />
                <ol className="mt-5 space-y-3">
                  {methodPhases.map((p) => (
                    <li key={p.n} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                      <span aria-hidden className="font-mono text-sm text-primary">{p.n}</span>
                      <div>
                        <p className="text-sm font-semibold">{p.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Reveal delay={0.1}>
              <div className="rounded-xl border border-primary/40 bg-brand-halo p-5 sm:p-6">
                <h2 className="text-lg font-bold tracking-tight">Empezar con este servicio</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Rellena el cuestionario inicial: con tus datos preparo la propuesta y te confirmo si este nivel es el adecuado.
                </p>
                <div className="mt-5 flex flex-col gap-2.5">
                  <CTAButton
                    view="cuestionario"
                    event="cta_click"
                    eventProps={{ label: `servicio_cta:${service.slug}` }}
                    source="servicio"
                    className="w-full"
                  >
                    Rellenar cuestionario
                  </CTAButton>
                  <CTAButton
                    variant="outline"
                    view="contacto"
                    source="servicio"
                    withArrow={false}
                    className="w-full"
                  >
                    Dudas antes de empezar
                  </CTAButton>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Sin permanencia: los servicios funcionan mes a mes.
                </p>
              </div>
            </Reveal>
          </aside>
        </Container>
      </section>

      <section aria-labelledby="servicio-faq" className="border-t border-border/60 bg-card/30 py-12 sm:py-16">
        <Container className="max-w-3xl">
          <SectionHeading title="Preguntas frecuentes del servicio" />
          <Accordion className="mt-6" items={SERVICE_FAQS} />
        </Container>
      </section>

      {/* Siguiente paso */}
      <section aria-labelledby="servicio-siguiente" className="py-12 sm:py-16">
        <Container>
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h2 id="servicio-siguiente" className="text-xl font-bold tracking-tight">Siguiente paso</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Si este nivel no encaja del todo, compara con el resto o mira los planes de entrenamiento listos para descargar.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => navigate("coaching")}>
                <ArrowLeft aria-hidden />
                Comparar servicios
              </Button>
              <CTAButton variant="ghost" view="planes" source="servicio">
                Ver planes
              </CTAButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
