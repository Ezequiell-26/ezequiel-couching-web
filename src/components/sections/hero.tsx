"use client";

import { motion } from "framer-motion";
import { CTAButton } from "@/components/site/cta-button";
import { Container } from "@/components/site/container";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { site } from "@/lib/content/site";

export function Hero() {
  const reduce = useReducedMotionSafe();

  return (
    <section className="bg-brand-halo relative overflow-hidden" aria-labelledby="hero-title">
      <Container className="pb-16 pt-32 sm:pb-20 sm:pt-40">
        <div className="mx-auto max-w-3xl text-center">
          <motion.p
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground"
          >
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
            Entrenamiento online
          </motion.p>

          <motion.h1
            id="hero-title"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
          >
            Entrena con <span className="text-primary">método</span>, no con suerte
          </motion.h1>

          <motion.p
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16 }}
            className="mx-auto mt-5 max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-lg"
          >
            {site.tagline}. Planes adaptados a tu punto de partida, seguimiento semanal y
            herramientas gratuitas para que puedas medir tu progreso.
          </motion.p>

          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.24 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <CTAButton
              view="cuestionario"
              size="lg"
              event="cta_click"
              eventProps={{ label: "hero-cuestionario" }}
              source="hero"
              className="w-full sm:w-auto"
            >
              Empezar ahora
            </CTAButton>
            <CTAButton
              view="planes"
              size="lg"
              variant="outline"
              event="cta_click"
              eventProps={{ label: "hero-planes" }}
              source="hero"
              withArrow={false}
              className="w-full sm:w-auto"
            >
              Ver planes
            </CTAButton>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
