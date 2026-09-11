"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Container } from "@/components/site/container";
import { CTAButton } from "@/components/site/cta-button";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";

export function FinalCta() {
  const reduce = useReducedMotionSafe();

  return (
    <section aria-labelledby="final-cta-title" className="relative isolate overflow-hidden border-t border-border/60">
      {/* Misma atmósfera del hero, más fundida hacia la superficie */}
      <Image
        src="/images/hero-gym.jpg"
        alt=""
        fill
        sizes="100vw"
        aria-hidden
        className="-z-20 object-cover object-bottom opacity-70"
      />
      <div aria-hidden className="-z-10 absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background/95" />

      <Container className="relative py-20 text-center sm:py-24">
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
            FITSYNC · Mi Zona
          </p>
          <h2
            id="final-cta-title"
            className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Menos improvisación. <span className="text-primary">Más progreso.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-balance text-sm text-muted-foreground sm:text-base">
            Empezá con una evaluación honesta de tu punto de partida:
            experiencia, material, tiempo y objetivo. Desde ahí, cada semana
            tiene dirección.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CTAButton view="cuestionario" size="lg" event="cta_click" eventProps={{ label: "final-cuestionario" }} source="final-cta" className="w-full sm:w-auto">
              Empezá ahora
            </CTAButton>
            <CTAButton view="planes" size="lg" variant="outline" event="cta_click" eventProps={{ label: "final-planes" }} source="final-cta" withArrow={false} className="w-full sm:w-auto">
              Ver planes
            </CTAButton>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
