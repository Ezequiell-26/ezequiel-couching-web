"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import {
  Apple,
  ArrowRight,
  Clock,
  Droplets,
  Flame,
  Gauge,
  Hand,
  LineChart,
  Monitor,
  Scale,
  Smartphone,
  UtensilsCrossed,
  Dumbbell,
  MessagesSquare,
} from "lucide-react";
import { CTAButton } from "@/components/site/cta-button";
import { Container } from "@/components/site/container";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";

const PLATFORMS = [
  { icon: Apple, label: "iOS" },
  { icon: Smartphone, label: "Android" },
  { icon: Monitor, label: "Escritorio" },
] as const;

const FEATURES = [
  { icon: Dumbbell, title: "Entrenamientos personalizados" },
  { icon: UtensilsCrossed, title: "Contador de calorías" },
  { icon: LineChart, title: "Seguimiento avanzado" },
  { icon: MessagesSquare, title: "Tu coach, de verdad" },
] as const;

/** Anillo de progreso SVG (decorativo, dentro de la vista ilustrativa). */
function Ring({ pct, size = 92 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Anillo: ${pct}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="8" />
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
        y="47%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        fontSize={size * 0.24}
        fontWeight="700"
      >
        {pct}%
      </text>
      <text x="50%" y="66%" textAnchor="middle" fill="oklch(0.72 0.015 180)" fontSize={size * 0.1}>
        4/7 días
      </text>
    </svg>
  );
}

const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"] as const;
const WEEK_HEIGHTS = [38, 62, 46, 80, 30, 12, 8] as const; // illustrativo

/** Vista ilustrativa del dashboard de Mi Zona (datos de ejemplo). */
function ZonePreview() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-6 rounded-[2rem] bg-[radial-gradient(60%_60%_at_50%_40%,oklch(0.84_0.17_162/0.16),transparent_70%)] blur-2xl"
      />
      <div className="relative rounded-2xl border border-border/80 bg-card/85 p-4 shadow-[0_40px_80px_-40px_oklch(0_0_0/0.9)] backdrop-blur-xl sm:p-5">
        {/* Cabecera */}
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Mi Zona<span className="text-primary">.</span>
          </p>
          <span className="grid size-8 place-items-center rounded-full border border-border bg-background font-mono text-[10px] font-bold">
            EC
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Hand aria-hidden className="size-4 text-primary" />
          <p className="text-base font-bold leading-none">Hola</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Hoy es un gran día para ser mejor que ayer.</p>

        {/* Entrenamiento de hoy */}
        <div className="mt-4 rounded-xl border border-border/70 bg-accent/50 p-3.5">
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
        <div className="mt-4 flex items-center gap-4 rounded-xl border border-border/70 bg-background/40 p-3.5">
          <div className="text-primary">
            <Ring pct={57} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">Tu semana</p>
            <div className="mt-2 flex h-16 items-end gap-1.5" aria-hidden>
              {WEEK_DAYS.map((d, i) => (
                <div key={d} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={
                      i < 4
                        ? "w-full rounded-sm bg-primary/80"
                        : "w-full rounded-sm bg-foreground/10"
                    }
                    style={{ height: `${WEEK_HEIGHTS[i]}%` }}
                  />
                  <span className="text-[8px] text-muted-foreground">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Métricas reales de Mi Zona */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { icon: Scale, v: "72,4", u: "kg", l: "Peso" },
            { icon: Droplets, v: "2,1", u: "L", l: "Agua" },
            { icon: Flame, v: "12", u: "días", l: "Racha" },
          ].map((t) => (
            <div key={t.l} className="rounded-xl border border-border/70 bg-background/40 p-2.5">
              <t.icon aria-hidden className="size-3.5 text-primary" />
              <p className="mt-1.5 text-sm font-bold tabular-nums">
                {t.v} <span className="text-[10px] font-medium text-muted-foreground">{t.u}</span>
              </p>
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{t.l}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-[10px] text-muted-foreground">
        Vista ilustrativa de Mi Zona · datos de ejemplo
      </p>
    </div>
  );
}

export function Hero() {
  const reduce = useReducedMotionSafe();

  return (
    <section className="relative isolate overflow-hidden border-b border-border/60" aria-labelledby="hero-title">
      {/* Fondo fotográfico de gimnasio fundido con la base */}
      <Image
        src="/images/hero-gym.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        aria-hidden
        className="-z-20 object-cover"
      />
      <div aria-hidden className="-z-10 absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background" />
      <div aria-hidden className="-z-10 absolute inset-0 bg-gradient-to-r from-background/90 via-background/55 to-background/80" />

      <Container className="pb-10 pt-28 sm:pt-36">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          {/* Columna de valor */}
          <div>
            <motion.p
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground"
            >
              <span aria-hidden className="inline-block size-2 rounded-[2px] bg-primary" />
              Ezequiel Coaching · app propia
            </motion.p>

            <motion.h1
              id="hero-title"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="mt-5 text-balance text-4xl font-bold leading-[1.04] sm:text-5xl md:text-6xl"
            >
              Tu cuerpo.
              <br />
              Tu progreso.
              <br />
              <span className="text-primary">Una sola app.</span>
            </motion.h1>

            <motion.p
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="mt-5 max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base"
            >
              Entrená con planes personalizados, registrá cada sesión y seguí tu
              progreso real desde Mi Zona, la app de Ezequiel Coaching.
            </motion.p>

            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
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
                view="zona"
                size="lg"
                variant="outline"
                event="cta_click"
                eventProps={{ label: "hero-mi-zona" }}
                source="hero"
                withArrow={false}
                className="w-full sm:w-auto"
              >
                Abrir Mi Zona
              </CTAButton>
            </motion.div>

            {/* Plataformas (PWA instalable) */}
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.32 }}
              className="mt-7 flex flex-wrap items-center gap-2"
            >
              {PLATFORMS.map((p) => (
                <span
                  key={p.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-foreground/90 backdrop-blur"
                >
                  <p.icon aria-hidden className="size-3.5 text-primary" />
                  {p.label}
                </span>
              ))}
              <span className="ml-1 text-[11px] text-muted-foreground">PWA instalable · gratis</span>
            </motion.div>
          </div>

          {/* Vista ilustrativa del dashboard */}
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto w-full max-w-[420px] lg:max-w-none"
          >
            <ZonePreview />
          </motion.div>
        </div>

        {/* Franja de features */}
        <motion.ul
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.4 }}
          className="mt-12 grid grid-cols-2 gap-x-4 gap-y-6 border-t border-border/60 pt-8 sm:grid-cols-4"
        >
          {FEATURES.map((f) => (
            <li key={f.title} className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <f.icon aria-hidden className="size-5" />
              </span>
              <span className="text-sm font-semibold leading-tight">{f.title}</span>
            </li>
          ))}
        </motion.ul>
      </Container>
    </section>
  );
}
