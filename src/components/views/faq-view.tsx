"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/site/section-heading";
import { CTAButton } from "@/components/site/cta-button";
import { Accordion } from "@/components/ui/accordion";
import { faqJsonLd } from "@/lib/seo";
import { faqs, faqCategories } from "@/lib/content/faqs";

const ALL = "Todas";

/**
 * FAQ (#/faq) — preguntas agrupadas por categoría con filtro de chips.
 * Incluye JSON-LD (FAQPage) calculado en cliente con useMemo sobre TODO el
 * listado (estable aunque se filtre la vista).
 */
export function FaqView() {
  const [filter, setFilter] = useState<string>(ALL);

  const jsonLd = useMemo(() => JSON.stringify(faqJsonLd(faqs)), []);
  const groups = useMemo(() => {
    const cats = filter === ALL ? faqCategories : [filter];
    return cats
      .map((cat) => ({ category: cat, items: faqs.filter((f) => f.category === cat) }))
      .filter((g) => g.items.length > 0);
  }, [filter]);

  const visibleCount = groups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <>
      {/* Datos estructurados para buscadores */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <PageHeader
        eyebrow="FAQ"
        title="Preguntas frecuentes"
        description="Respuestas directas a las dudas habituales sobre coaching, planes, herramientas y pedidos. Si falta la tuya, escríbeme."
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "FAQ" }]}
      />

      <section aria-labelledby="faq-lista" className="py-12 sm:py-16">
        <Container className="max-w-3xl">
          <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filtrar preguntas por categoría">
            {[ALL, ...faqCategories].map((c) => {
              const active = filter === c;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(c)}
                  className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>

          <h2 id="faq-lista" className="sr-only">
            Listado de preguntas ({visibleCount})
          </h2>

          <div className="space-y-10">
            {groups.map((g) => (
              <div key={g.category}>
                <SectionHeading eyebrow={g.category === ALL ? undefined : g.category} title={g.category} />
                <Accordion className="mt-4" items={g.items} />
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Siguiente paso */}
      <section aria-labelledby="faq-siguiente" className="border-t border-border/60 bg-card/30 py-12 sm:py-16">
        <Container>
          <div className="rounded-xl border border-primary/40 bg-brand-halo p-6 text-center sm:p-10">
            <h2 id="faq-siguiente" className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              ¿Sigues con dudas?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
              Escríbeme y te respondo en persona. Y si ya lo tienes claro, el cuestionario inicial es el punto de partida.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <CTAButton
                size="lg"
                variant="outline"
                view="contacto"
                source="faq"
                withArrow={false}
              >
                Contactar
              </CTAButton>
              <CTAButton
                size="lg"
                view="cuestionario"
                event="cta_click"
                eventProps={{ label: "cta_faq" }}
                source="faq"
              >
                Rellenar el cuestionario
              </CTAButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
