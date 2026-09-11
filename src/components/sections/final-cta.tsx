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
      {/* Fondo fotográfico (misma escena del hero, más fundida) */}
      <Image
        src="/images/hero-gym.jpg"
        alt=""
        fill
        sizes="100vw"
        aria-hidden
        className="-z-20 object-cover object-bottom opacity-70"
      />
      <div aria-hidden className="-z-10 absolute inset-0 bg-gradient-to-b from-background via-background/75 to-background/95" />

      <Container className="relative py-20 text-center sm:py-28">
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Ezequiel Coaching
          </p>
          <h2
            id="final-cta-title"
            className="mx-auto mt-3 max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
          >
            Tu mejor versión, <span className="text-primary">cada día.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-sm text-muted-foreground sm:text-base">
            Entrená. Nutrí. Progresá. Todo en una sola app: contame tu punto de
            partida y recibí tu propuesta. Sin compromiso.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CTAButton view="cuestionario" size="lg" event="cta_click" eventProps={{ label: "final-cuestionario" }} source="final-cta" className="w-full sm:w-auto">
              Empezar ahora
            </CTAButton>
            <CTAButton view="guia-gratis" size="lg" variant="outline" event="cta_click" eventProps={{ label: "final-guia" }} source="final-cta" withArrow={false} className="w-full sm:w-auto">
              Descargar guía gratis
            </CTAButton>
          </div>
          <p className="text-script mt-8 -rotate-2 text-2xl text-primary sm:text-3xl" aria-hidden>
            No es solo entrenar, es un estilo de vida.
          </p>
        </motion.div>
      </Container>
    </section>
  );
}
