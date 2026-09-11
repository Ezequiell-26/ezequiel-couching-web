"use client";

import { ArrowRight } from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/site/section-heading";
import { useRouter } from "@/lib/router";
import { testimonials } from "@/lib/content/site";

export function Results() {
  const navigate = useRouter((s) => s.navigate);
  const hasReal = testimonials.some((t) => !t.quote.startsWith("[SUSTITUIR"));

  return (
    <section aria-labelledby="results-title" className="border-y border-border/60 bg-card/30 py-16 sm:py-20">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Resultados"
            title="Progreso con contexto honesto"
            description="Sin cifras infladas: lo que ves aquí es trabajo sostenido en el tiempo."
          />
          <button
            type="button"
            onClick={() => navigate("resultados")}
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-foreground"
          >
            Ver resultados
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </button>
        </div>

        {hasReal ? (
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {testimonials.slice(0, 3).map((t) => (
              <figure key={t.author} className="rounded-xl border border-border bg-card p-5">
                <blockquote className="text-sm leading-relaxed text-muted-foreground">“{t.quote}”</blockquote>
                <figcaption className="mt-3 text-sm font-medium">{t.author}</figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Los testimonios se publican solo con consentimiento escrito de cada cliente.
            Próximamente aquí verás casos reales.
          </p>
        )}
      </Container>
    </section>
  );
}
