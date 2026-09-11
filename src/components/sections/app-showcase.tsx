import {
  ArrowRight,
  ChevronRight,
  Droplets,
  Dumbbell,
  Flame,
  Home,
  LineChart,
  MoreHorizontal,
  Scale,
  Timer,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Container } from "@/components/site/container";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { cn } from "@/lib/utils";

/**
 * Composición de producto "family shot" de Mi Zona: panel desktop (dashboard)
 * con dos teléfonos delante, solapados en la esquina inferior derecha.
 * Datos de ejemplo solo dentro de las pantallas; todas las funciones mostradas
 * existen (rutina del día, series/cargas, descanso, PRs, e1RM, peso, agua, racha).
 */

const NAV_ICONS = [Home, Dumbbell, UtensilsCrossed, LineChart] as const;
const PHONE_SHADOW = "shadow-[0_24px_60px_-40px_oklch(0_0_0/0.8)]";
const EXERCISES: ReadonlyArray<readonly [string, string, string]> = [
  ["Press banca", "4×8", "60 kg"], ["Remo con barra", "4×10", "55 kg"], ["Press militar", "3×8", "32,5 kg"],
];
const RECORDS: ReadonlyArray<readonly [string, string]> = [
  ["Sentadilla", "110 kg"], ["Peso muerto", "140 kg"], ["Press militar", "47,5 kg"],
];
const DAYS = ["L", "M", "X", "J", "V", "S", "D"] as const;

function Eyebrow({ className, children }: { className?: string; children: string }) {
  return (
    <p className={cn("font-mono uppercase tracking-[0.16em] text-muted-foreground", className ?? "text-[9px]")}>
      {children}
    </p>
  );
}

function MiniBar({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className={cn("h-1 rounded-full bg-foreground/10", className)}>
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

function WeekRing({ value, total }: { value: number; total: number }) {
  const size = 80;
  const r = 35;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0 text-primary">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="7" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="7"
          strokeLinecap="round" strokeDasharray={`${c * (value / total)} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <div>
          <p className="text-[13px] font-bold tabular-nums text-foreground">{value}/{total}</p>
          <p className="mt-1 text-[8px] text-muted-foreground">días</p>
        </div>
      </div>
    </div>
  );
}

function E1rmChart() {
  return (
    <svg viewBox="0 0 180 56" className="mt-2 h-12 w-full text-primary" aria-hidden>
      <defs>
        <linearGradient id="as-e1rm" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.84 0.17 162 / 0.25)" />
          <stop offset="100%" stopColor="oklch(0.84 0.17 162 / 0)" />
        </linearGradient>
      </defs>
      <line x1="4" y1="18" x2="176" y2="18" stroke="oklch(1 0 0 / 0.06)" strokeWidth="1" />
      <line x1="4" y1="36" x2="176" y2="36" stroke="oklch(1 0 0 / 0.06)" strokeWidth="1" />
      <path d="M4 42 L30 37 L56 39 L82 30 L108 26 L134 28 L152 19 L176 13 L176 54 L4 54 Z" fill="url(#as-e1rm)" />
      <path
        d="M4 42 L30 37 L56 39 L82 30 L108 26 L134 28 L152 19 L176 13"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="176" cy="13" r="2.5" fill="currentColor" />
    </svg>
  );
}

function MetricTile({
  icon: Icon, label, value, unit, sub, pct,
}: {
  icon: LucideIcon; label: string; value: string; unit: string; sub: string; pct?: number;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-background/50 p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <Eyebrow className="min-w-0 truncate text-[9px]">{label}</Eyebrow>
      </div>
      <p className="mt-2 text-base font-bold leading-none tabular-nums sm:text-lg">
        {value} <span className="text-[10px] font-semibold text-muted-foreground">{unit}</span>
      </p>
      {typeof pct === "number" ? <MiniBar pct={pct} className="mt-2" /> : null}
      <p className="mt-1.5 truncate text-[9px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function TodayCard() {
  return (
    <div className="h-full rounded-xl border border-border/60 bg-accent/40 p-4">
      <Eyebrow>Entrenamiento de hoy</Eyebrow>
      <p className="mt-1.5 text-base font-bold tracking-tight sm:text-lg">Fuerza · Tren superior</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">Semana 2 · Sesión 2 de 4 · 5 ejercicios</p>
      <div className="mt-2 divide-y divide-border/60">
        {EXERCISES.map(([name, sets, load]) => (
          <div key={name} className="flex items-center justify-between gap-3 py-1.5 first:pt-0">
            <span className="min-w-0 truncate text-[11px] font-medium">{name}</span>
            <span className="whitespace-nowrap text-[10px] tabular-nums text-muted-foreground">{sets} · {load}</span>
          </div>
        ))}
        <p className="py-1.5 text-[10px] text-muted-foreground">+ 2 ejercicios más</p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-[11px] font-bold text-primary-foreground">
          Entrenar ahora
          <ArrowRight className="size-3.5" aria-hidden />
        </span>
        <span className="hidden whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground sm:block">
          ≈ 50 min
        </span>
      </div>
    </div>
  );
}

function WeekCard() {
  return (
    <div className="h-full rounded-xl border border-border/60 bg-accent/40 p-4">
      <Eyebrow>Semana 2</Eyebrow>
      <div className="mt-3 flex items-center gap-4">
        <WeekRing value={4} total={7} />
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight">4 de 7 días</p>
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">Entrenos completados esta semana</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between" aria-hidden>
        {DAYS.map((d, i) => (
          <span
            key={d}
            className={i < 4 ? "text-[10px] font-bold text-primary" : "text-[10px] font-medium text-muted-foreground"}
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

function PanelDesktop() {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card lg:max-w-[820px]">
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-2" aria-hidden>
        <span className="flex shrink-0 gap-1.5">
          <span className="size-1.5 rounded-full bg-foreground/20" />
          <span className="size-1.5 rounded-full bg-foreground/20" />
          <span className="size-1.5 rounded-full bg-foreground/20" />
        </span>
        <span className="min-w-0 flex-1 truncate text-center font-mono text-[9px] text-muted-foreground">
          kinetixfitt.app/mi-zona
        </span>
        <span className="shrink-0 font-mono text-[9px] font-bold text-muted-foreground">FS</span>
      </div>
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Eyebrow>Mi Zona</Eyebrow>
            <p className="mt-1.5 text-xl font-bold tracking-tight sm:text-2xl">Buenas</p>
            <p className="mt-1 text-xs text-muted-foreground">Martes · Bloque Fuerza · Semana 2</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <TodayCard />
          </div>
          <div className="lg:col-span-4 lg:row-span-2">
            <WeekCard />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:col-span-8">
            <MetricTile icon={Scale} label="Peso" value="78,4" unit="kg" sub="−0,6 kg esta semana" />
            <MetricTile icon={Droplets} label="Agua" value="1,8" unit="L" sub="de 2,5 L" pct={72} />
            <MetricTile icon={Flame} label="Racha" value="12" unit="días" sub="mejor racha: 21 días" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="relative flex items-center justify-between px-3 pt-2" aria-hidden>
      <span className="text-[8px] font-semibold tabular-nums">9:41</span>
      <span className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-foreground/15" />
      <span className="font-mono text-[8px] font-bold text-muted-foreground">FS</span>
    </div>
  );
}

function PhoneNav({ active }: { active: number }) {
  return (
    <div className="flex items-center justify-between border-t border-border/60 px-3 py-2" aria-hidden>
      {NAV_ICONS.map((Icon, i) => (
        <Icon key={i} className={i === active ? "size-3.5 text-primary" : "size-3.5 text-muted-foreground/60"} />
      ))}
      <MoreHorizontal className="size-3.5 text-muted-foreground/60" />
    </div>
  );
}

function PhoneFrame({
  activeNav, widthClass, children,
}: {
  activeNav: number; widthClass: string; children: ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-1.5", PHONE_SHADOW, widthClass)}>
      <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
        <StatusBar />
        <div className="space-y-2 px-2.5 pb-3 pt-2.5">{children}</div>
        <PhoneNav active={activeNav} />
      </div>
    </div>
  );
}

function SessionPhoneBody() {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Eyebrow className="text-[8px]">Entrenar</Eyebrow>
        <span className="whitespace-nowrap font-mono text-[8px] uppercase tracking-[0.16em] text-primary">En curso</span>
      </div>
      <p className="text-[12px] font-bold tracking-tight">Fuerza · Tren superior</p>
      <div className="rounded-lg border border-border/60 bg-accent/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <Eyebrow className="min-w-0 truncate text-[8px]">Ejercicio actual</Eyebrow>
          <span className="whitespace-nowrap text-[8px] font-semibold tabular-nums text-muted-foreground">Serie 2/4</span>
        </div>
        <p className="mt-1.5 whitespace-nowrap text-[15px] font-bold leading-none tabular-nums text-primary">60 kg × 8</p>
        <div className="mt-2.5 flex items-center gap-1.5" aria-hidden>
          <span className="size-1.5 rounded-full bg-primary" />
          <span className="size-1.5 rounded-full border border-primary" />
          <span className="size-1.5 rounded-full bg-foreground/15" />
          <span className="size-1.5 rounded-full bg-foreground/15" />
        </div>
      </div>
      <div className="rounded-lg border border-border/60 bg-accent/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <Timer className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <Eyebrow className="min-w-0 truncate text-[8px]">Descanso</Eyebrow>
          </span>
          <span className="whitespace-nowrap text-[13px] font-bold leading-none tabular-nums">1:29</span>
        </div>
        <MiniBar pct={62} className="mt-2.5" />
        <p className="mt-1.5 truncate text-[8px] text-muted-foreground">Serie 3 · 60 kg × 8</p>
      </div>
      <p className="flex items-center gap-1 text-[9px] text-muted-foreground">
        <ChevronRight className="size-3 shrink-0" aria-hidden />
        <span className="min-w-0 truncate">Siguiente: press inclinado</span>
      </p>
    </>
  );
}

function ProgressPhoneBody() {
  return (
    <>
      <Eyebrow className="text-[8px]">Progreso</Eyebrow>
      <div className="rounded-lg border border-border/60 bg-accent/40 p-3">
        <Eyebrow className="text-[8px]">e1RM · Banca</Eyebrow>
        <p className="mt-1.5 whitespace-nowrap text-[15px] font-bold leading-none tabular-nums text-primary">82,3 kg</p>
        <p className="mt-1 truncate text-[8px] text-muted-foreground">+11 % en 8 semanas · Epley</p>
        <E1rmChart />
      </div>
      <Eyebrow className="text-[8px]">Récords</Eyebrow>
      <div className="divide-y divide-border/60">
        {RECORDS.map(([name, value]) => (
          <div key={name} className="flex items-center justify-between gap-2 py-1.5 first:pt-0">
            <span className="min-w-0 truncate text-[10px] font-medium">{name}</span>
            <span className="whitespace-nowrap text-[10px] font-semibold tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export function AppShowcase() {
  return (
    <section aria-label="Mi Zona, por dentro" className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="La app"
          title="Mi Zona, por dentro"
          description="Mi Zona es tu área privada: tu rutina del día, el registro de cada sesión con PRs y e1RM (Epley), el control de peso, agua y hábitos, y el temporizador de descanso entre series. Vistas ilustrativas con datos de ejemplo."
        />
        <div className="relative mt-10 lg:mb-20 lg:mt-14">
          <Reveal>
            <PanelDesktop />
          </Reveal>
          <Reveal delay={0.12} className="relative z-10 mt-8 lg:absolute lg:bottom-0 lg:right-0 lg:mt-0">
            <div className="mx-auto grid max-w-[420px] grid-cols-2 items-end gap-3 sm:gap-4 lg:mx-0 lg:flex lg:w-max lg:max-w-none lg:translate-y-10 lg:gap-4">
              <PhoneFrame activeNav={1} widthClass="w-full lg:w-[168px] xl:w-[184px]">
                <SessionPhoneBody />
              </PhoneFrame>
              <div className="lg:translate-y-8">
                <PhoneFrame activeNav={3} widthClass="w-full lg:w-[168px] xl:w-[184px]">
                  <ProgressPhoneBody />
                </PhoneFrame>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
