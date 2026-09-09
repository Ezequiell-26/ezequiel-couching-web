"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/site/container";
import { CTAButton } from "@/components/site/cta-button";
import { site } from "@/lib/content/site";

export function FinalCta() {
  return (
    <section aria-labelledby="final-cta-title" className="relative overflow-hidden">
      {/* Marca de agua del monograma */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-20 left-1/2 -translate-x-1/2 select-none font-mono text-[26rem] font-bold leading-none text-foreground opacity-5"
      >
        EC
      </span>
      <Container className="relative py-20 text-center sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-primary">
            {site.shortName} · {site.name}
          </p>
          <h2 id="final-cta-title" className="mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Tu próximo entrenamiento empieza con un plan
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-sm text-muted-foreground sm:text-base">
            Cuéntame tu punto de partida y recibe tu propuesta. Sin compromiso: primero hablamos
            de tus objetivos.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CTAButton view="cuestionario" size="lg" event="cta_click" eventProps={{ label: "final-cuestionario" }} source="final-cta" className="w-full sm:w-auto">
              Empezar ahora
            </CTAButton>
            <CTAButton view="guia-gratis" size="lg" variant="outline" event="cta_click" eventProps={{ label: "final-guia" }} source="final-cta" withArrow={false} className="w-full sm:w-auto">
              Descargar guía gratis
            </CTAButton>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
