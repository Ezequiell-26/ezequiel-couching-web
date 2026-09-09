"use client";

import { ArrowRight } from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";
import { useRouter } from "@/lib/router";
import { methodPhases } from "@/lib/content/site";

export function MethodSection() {
  const navigate = useRouter((s) => s.navigate);

  return (
    <section aria-labelledby="method-title" className="border-y border-border/60 bg-card/30 py-16 sm:py-20">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            eyebrow="Método"
            title="Cuatro fases, cero improvisación"
            description="Cada cliente trabaja sobre el mismo proceso, ajustado a su realidad."
          />
          <button
            type="button"
            onClick={() => navigate("metodo")}
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-foreground"
          >
            Ver el método completo
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </button>
        </div>

        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {methodPhases.map((p, i) => (
            <Reveal key={p.n} delay={0.05 * i}>
              <li className="h-full rounded-xl border border-border bg-card p-5">
                <p className="font-mono text-sm text-primary">{p.n}</p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}
