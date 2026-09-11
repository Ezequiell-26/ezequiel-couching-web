"use client";

import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/site/section-heading";
import { useRouter } from "@/lib/router";
import { testimonials } from "@/lib/content/site";

export function Testimonials() {
  const navigate = useRouter((s) => s.navigate);
  const hasReal = testimonials.some((t) => !t.quote.startsWith("[SUSTITUIR"));

  if (!hasReal) return null;

  return (
    <section aria-labelledby="testimonials-title" className="py-16 sm:py-20">
      <Container>
        <SectionHeading eyebrow="Testimonios" title="Lo que dicen quienes entrenan conmigo" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {testimonials.slice(0, 3).map((t) => (
            <figure key={t.author} className="rounded-xl border border-border bg-card p-5">
              <blockquote className="text-sm leading-relaxed">“{t.quote}”</blockquote>
              <figcaption className="mt-3 text-sm">
                <span className="font-medium">{t.author}</span>
                <span className="block text-xs text-muted-foreground">{t.detail}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <button
          type="button"
          onClick={() => navigate("resultados")}
          className="mt-6 text-sm font-medium text-primary transition-colors hover:text-foreground"
        >
          Ver todos los resultados →
        </button>
      </Container>
    </section>
  );
}
