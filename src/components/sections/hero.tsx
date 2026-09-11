"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, Clock, Droplets, Flame, Gauge, Hand, Scale } from "lucide-react";
import { CTAButton } from "@/components/site/cta-button";
import { Container } from "@/components/site/container";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";

/** Métricas del spec strip: todas verificables en la web (biblioteca 200,
 *  7 pestañas de calculadoras, 4 fórmulas publicadas, sin permanencia). */
const SPECS = [
  { value: "200", label: "Ejercicios documentados" },
  { value: "7", label: "Calculadoras con fórmulas reales" },
  { value: "4", label: "Fórmulas publicadas" },
  { value: "0", label: "Permanencia" },
] as const;

const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"] as const;
const WEEK_HEIGHTS = [38, 62, 46, 80, 30, 12, 8] as const;

/** Anillo de progreso del mockup (decorativo, datos de ejemplo). */
function Ring({ pct, size = 92 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Anillo: ${pct}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="8" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${(c * pct) / 100} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="46%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        fontSize={size * 0.23}
        fontWeight="700"
      >
        {pct}%
      </text>
      <text x="50%" y="65%" textAnchor="middle" fill="#94a7a5" fontSize={size * 0.1}>
        4/7 días
      </text>
    </svg>
  );
}

/** Panel del producto (Mi Zona) con datos de ejemplo etiquetados. */
function ZonePreview() {
  return (
    <div className="relative">
      <div className="rounded-xl border border-border bg-card/95 shadow-[0_40px_80px_-48px_rgb(0_0_0/0.9)]">
        {/* Cabecera del producto */}
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Mi Zona
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
          </p>
          <span className="grid size-7 place-items-center rounded-md border border-border bg-background font-mono text-[10px] font-bold text-muted-foreground">
            FS
          </span>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2">
            <Hand aria-hidden className="size-4 text-primary" />
            <p className="text-sm font-bold">Hola</p>
            <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <Flame aria-hidden className="size-3" /> 12 días
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Bloque Fuerza · semana 2 de 4</p>

          {/* Prioridad del día */}
          <div className="mt-3 rounded-lg border border-border/70 bg-accent/50 p-3.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              Entrenamiento de hoy
            </p>
            <p className="mt-1 text-sm font-bold">Fuerza · Tren superior</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock aria-hidden className="size-3" /> 45 min
              </span>
              <span className="inline-flex items-center gap-1">
                <Gauge aria-hidden className="size-3" /> Moderado
              </span>
            </div>
            <span className="glow-volt mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground">
              Entrenar ahora <ArrowRight aria-hidden className="size-3" />
            </span>
          </div>

          {/* Semana */}
          <div className="mt-3 flex items-center gap-4 rounded-lg border border-border/70 bg-background/40 p-3.5">
            <div className="shrink-0 text-primary">
              <Ring pct={57} size={84} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">Tu semana</p>
              <div className="mt-2 flex h-14 items-stretch gap-1.5" aria-hidden>
                {WEEK_DAYS.map((d, i) => (
                  <div key={d} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <div
                      className={i < 4 ? "w-full rounded-sm bg-primary/80" : "w-full rounded-sm bg-foreground/10"}
                      style={{ height: `${WEEK_HEIGHTS[i]}%` }}
                    />
                    <span className="text-[8px] text-muted-foreground">{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Métricas que la app registra de verdad */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { icon: Scale, v: "72,4", u: "kg", l: "Peso" },
              { icon: Droplets, v: "2,1", u: "L", l: "Agua" },
              { icon: Flame, v: "4/7", u: "", l: "Sesiones" },
            ].map((t) => (
              <div key={t.l} className="rounded-lg border border-border/70 bg-background/40 p-2.5">
                <t.icon aria-hidden className="size-3.5 text-primary" />
                <p className="mt-1.5 text-sm font-bold tabular-nums">
                  {t.v} {t.u ? <span className="text-[10px] font-medium text-muted-foreground">{t.u}</span> : null}
                </p>
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{t.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-2.5 text-center text-[10px] text-muted-foreground">
        Vista ilustrativa de Mi Zona · datos de ejemplo
      </p>
    </div>
  );
}

export function Hero() {
  const reduce = useReducedMotionSafe();

  return (
    <section className="relative isolate overflow-hidden border-b border-border/60" aria-labelledby="hero-title">
      {/* Atmósfera: foto de gimnasio fundida con la superficie base */}
      <Image
        src="/images/hero-gym.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        aria-hidden
        className="-z-20 object-cover"
      />
      <div aria-hidden className="-z-10 absolute inset-0 bg-gradient-to-b from-background/55 via-background/85 to-background" />
      <div aria-hidden className="-z-10 absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-background/85" />

      <Container className="pb-12 pt-24 sm:pt-32">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.02fr] lg:gap-14">
          {/* Mensaje de marca + acción */}
          <div>
            <motion.p
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground"
            >
              <span aria-hidden className="inline-block size-1.5 rounded-[2px] bg-primary" />
              Entrenamiento online · Mi Zona
            </motion.p>

            <motion.h1
              id="hero-title"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.06 }}
              className="mt-4 max-w-lg text-balance text-4xl font-bold leading-[1.06] sm:text-5xl"
            >
              Entrená con intención.
              <br />
              Progresá con <span className="text-primary">datos</span>.
            </motion.h1>

            <motion.p
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.12 }}
              className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base"
            >
              FITSYNC convierte tu entrenamiento en un sistema: un plan hecho para
              vos, el registro de cada serie y las métricas que muestran si esto
              realmente está funcionando.
            </motion.p>

            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.18 }}
              className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center"
            >
              <CTAButton
                view="cuestionario"
                size="lg"
                event="cta_click"
                eventProps={{ label: "hero-cuestionario" }}
                source="hero"
                className="w-full sm:w-auto"
              >
                Armá tu plan
              </CTAButton>
              <CTAButton
                view="zona"
                variant="link"
                event="cta_click"
                eventProps={{ label: "hero-mi-zona" }}
                source="hero"
                className="justify-center px-2"
              >
                Explorar Mi Zona
              </CTAButton>
            </motion.div>

            {/* Spec strip: densidad de información real, sin iconos decorativos */}
            <motion.dl
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.26 }}
              className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-6 sm:grid-cols-4"
            >
              {SPECS.map((s) => (
                <div key={s.label}>
                  <dd className="text-xl font-bold tabular-nums sm:text-2xl">{s.value}</dd>
                  <dt className="mt-1 text-[11px] leading-snug text-muted-foreground">{s.label}</dt>
                </div>
              ))}
            </motion.dl>
          </div>

          {/* Producto */}
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="mx-auto w-full max-w-[400px] lg:max-w-[440px]"
          >
            <ZonePreview />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
