"use client";

import { Check, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";
import { CTAButton } from "@/components/site/cta-button";
import { PlaceholderNote } from "@/components/site/placeholder-note";
import { GuideLeadForm } from "@/components/site/guide-lead-form";

/** Qué encontrarás en la guía: descripción honesta del recurso, sin cifras inventadas. */
const BENEFITS = [
  "Fundamentos de entrenamiento explicados sin humo ni fórmulas mágicas.",
  "Cómo estructurar tus primeras semanas: volumen, intensidad y descanso.",
  "Pautas de nutrición orientativas para calcular tu punto de partida.",
  "Errores típicos que frenan el progreso y cómo detectarlos tú mismo.",
];

/**
 * Guía gratuita (#/guia-gratis) — lead magnet con formulario real (POST /api/leads).
 */
export function GuiaGratisView() {
  return (
    <>
      <PageHeader
        eyebrow="Descarga gratuita"
        title="Guía de inicio: entrena con sentido desde el primer día"
        description="Un recurso directo al grano para empezar (o reiniciarte) con método. Déjanos tu email y te la enviamos."
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Guía gratuita" }]}
      />

      <section aria-labelledby="guia-contenido" className="py-12 sm:py-16">
        <Container className="grid gap-8 lg:grid-cols-2">
          <Reveal>
            <div>
              <SectionHeading
                title="Qué contiene la guía"
                description="Lo básico bien explicado: lo que aplica cualquiera que empiece, sin depender de material específico."
              />
              <ul className="mt-6 space-y-2.5">
                {BENEFITS.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground/90"
                  >
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                    {b}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                La guía es una orientación general. Para algo ajustado a tu caso, el cuestionario inicial es el
                camino correcto.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="rounded-xl border border-primary/40 bg-brand-halo p-5 sm:p-6">
              <h2 id="guia-contenido" className="text-xl font-bold tracking-tight">Pide la guía</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Escríbenos tu email y te enviamos la guía. Sin spam: solo el recurso y, si quieres, avisos de
                contenido nuevo.
              </p>
              <div className="mt-5">
                <GuideLeadForm compact={false} />
              </div>
              <div className="mt-5 flex items-start gap-2 rounded-lg border border-border bg-card/60 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  RGPD: tus datos se tratan solo para enviarte la guía, según la Política de privacidad. Puedes
                  ejercer tus derechos de acceso, rectificación y supresión escribiendo al email de contacto, y
                  darte de baja en cualquier momento.
                </span>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Siguiente paso */}
      <section aria-labelledby="guia-siguiente" className="pb-16 sm:pb-20">
        <Container>
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h2 id="guia-siguiente" className="text-xl font-bold tracking-tight">Siguiente paso</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              ¿Quieres ir más allá de la guía? El cuestionario inicial toma tu caso concreto y a partir de ahí
              preparamos la propuesta.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <CTAButton view="cuestionario" event="cta_click" eventProps={{ label: "cta_guia" }} source="guia-gratis">
                Rellenar el cuestionario
              </CTAButton>
              <CTAButton variant="outline" view="coaching" source="guia-gratis" withArrow={false}>
                Ver servicios de coaching
              </CTAButton>
            </div>
            <PlaceholderNote className="mt-5">
              Si el email del titular sigue como placeholder, los envíos se registran en el panel y se notifican
              con honestidad al usuario.
            </PlaceholderNote>
          </div>
        </Container>
      </section>
    </>
  );
}
