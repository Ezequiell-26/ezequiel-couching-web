"use client";

import { ArrowRight, Check } from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";
import { useRouter } from "@/lib/router";
import { services } from "@/lib/content/site";

export function Services() {
  const navigate = useRouter((s) => s.navigate);

  return (
    <section aria-labelledby="services-title" className="py-16 sm:py-20">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Servicios"
            title="Elige tu nivel de acompañamiento"
            description="Tres formas de trabajar juntos, todas con plan personalizado y seguimiento."
          />
          <button
            type="button"
            onClick={() => navigate("coaching")}
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-foreground"
          >
            Comparar servicios
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.slug} delay={0.06 * i}>
              <article className="flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">{s.level}</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight">{s.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{s.summary}</p>
                <ul className="mt-4 space-y-1.5">
                  {s.includes.slice(0, 3).map((inc) => (
                    <li key={inc} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      {inc}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => navigate("servicio", { slug: s.slug })}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-foreground"
                >
                  Ver detalle
                  <ArrowRight className="size-4" aria-hidden />
                </button>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
