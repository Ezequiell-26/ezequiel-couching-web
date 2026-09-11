"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { CTAButton } from "@/components/site/cta-button";
import { Container } from "@/components/site/container";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { site } from "@/lib/content/site";
import { cn } from "@/lib/utils";

/** Datos reales y verificables en la app: biblioteca (200), fórmulas de las
 *  calculadoras (Mifflin-St Jeor, Epley, Deurenberg, US Navy) y política real
 *  de servicio (sin permanencia). Nada inventado. */
const STATS = [
  { value: "200+", label: "Ejercicios documentados" },
  { value: "4", label: "Fórmulas validadas" },
  { value: "0", label: "Permanencia" },
] as const;

export function Hero() {
  const reduce = useReducedMotionSafe();

  return (
    <section
      className="relative overflow-hidden border-b border-border/60"
      aria-labelledby="hero-title"
    >
      <Container className="pb-14 pt-28 sm:pb-20 sm:pt-36">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          {/* Columna editorial: kicker → titular display → subcopy → CTAs → métricas */}
          <div>
            <motion.p
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground"
            >
              <span aria-hidden className="inline-block size-2 bg-primary" />
              Entrenador personal online
            </motion.p>

            <motion.h1
              id="hero-title"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="mt-5 text-balance text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl"
            >
              Entrena con <span className="text-primary">método</span>, no con
              suerte
            </motion.h1>

            <motion.p
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="mt-5 max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-lg"
            >
              {site.tagline}. Planes adaptados a tu punto de partida, seguimiento
              semanal y herramientas gratuitas para que puedas medir tu progreso.
            </motion.p>

            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
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

            {/* Métricas reales con divisores hairline y cifras tabulares */}
            <motion.dl
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.32 }}
              className="mt-10 grid grid-cols-3 border-y border-border"
            >
              {STATS.map((s, i) => (
                <div
                  key={s.label}
                  className={cn(
                    "flex flex-col py-4 pr-3 sm:pr-6",
                    i > 0 && "border-l border-border pl-3 sm:pl-6",
                  )}
                >
                  <dd className="order-1 text-2xl font-bold tabular-nums sm:text-3xl">
                    {s.value}
                  </dd>
                  <dt className="order-2 mt-1.5 font-mono text-[10px] uppercase leading-snug tracking-[0.16em] text-muted-foreground sm:text-[11px]">
                    {s.label}
                  </dt>
                </div>
              ))}
            </motion.dl>
          </div>

          {/* Imagen editorial con marco offset en volt */}
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            <div
              aria-hidden
              className="absolute inset-0 translate-x-3 translate-y-3 rounded-xl border border-primary/40"
            />
            <div className="relative overflow-hidden rounded-xl border border-border bg-card">
              <Image
                src="/images/ejercicios/full-body-v2.jpg"
                alt="Silueta atlética en duotono volt entrenando con kettlebell"
                width={1200}
                height={900}
                priority
                sizes="(min-width: 1024px) 45vw, (min-width: 640px) 60vw, 100vw"
                className="h-auto w-full object-cover"
              />
              <div className="absolute inset-x-3 bottom-3 rounded-lg border border-border bg-background/90 px-4 py-3 backdrop-blur-sm">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Biblioteca de ejercicios
                </p>
                <p className="mt-0.5 text-sm font-semibold">
                  Técnica clara, ejercicio a ejercicio
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
