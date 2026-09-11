import {
  ArrowRight,
  BookOpen,
  Calculator,
  ChevronRight,
  Dumbbell,
  Flame,
  Home,
  LineChart,
  MoreHorizontal,
  Search,
  UtensilsCrossed,
} from "lucide-react";
import { Container } from "@/components/site/container";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";

/**
 * Fila de mockups de la app (estilo referencia FitSync): cinco pantallas de
 * Mi Zona con datos de ejemplo, claramente etiquetadas como ilustrativas.
 * Cada pantalla refleja funciones REALES de la app (entrenar, contador,
 * progreso/e1RM, biblioteca, herramientas).
 */

function MiniTabs({ tabs, active }: { tabs: string[]; active: number }) {
  return (
    <div className="flex gap-1 rounded-lg border border-border/60 bg-background/50 p-0.5">
      {tabs.map((t, i) => (
        <span
          key={t}
          className={
            i === active
              ? "flex-1 rounded-md bg-primary px-1.5 py-1 text-center text-[8px] font-bold text-primary-foreground"
              : "flex-1 rounded-md px-1.5 py-1 text-center text-[8px] font-medium text-muted-foreground"
          }
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function MiniBar({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-1 text-[8px] text-muted-foreground">
        <span className="truncate">{label}</span>
        <span className="whitespace-nowrap font-semibold text-foreground/80">{value}</span>
      </div>
      <div className="mt-0.5 h-1 rounded-full bg-foreground/10">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniRing({ center, sub }: { center: string; sub: string }) {
  const size = 64;
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const pct = 0.77;
  return (
    <div className="relative shrink-0 text-primary">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth="6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <div>
          <p className="text-[11px] font-bold text-foreground">{center}</p>
          <p className="mt-0.5 text-[7px] text-muted-foreground">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function MiniLine() {
  return (
    <svg viewBox="0 0 180 52" className="h-12 w-full" aria-hidden>
      <defs>
        <linearGradient id="pg-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.84 0.17 162 / 0.35)" />
          <stop offset="100%" stopColor="oklch(0.84 0.17 162 / 0)" />
        </linearGradient>
      </defs>
      <path
        d="M4 14 L34 22 L64 18 L94 30 L124 26 L154 38 L176 34 L176 52 L4 52 Z"
        fill="url(#pg-fill)"
      />
      <path
        d="M4 14 L34 22 L64 18 L94 30 L124 26 L154 38 L176 34"
        fill="none"
        stroke="oklch(0.84 0.17 162)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const NAV_ICONS = [Home, Dumbbell, UtensilsCrossed, LineChart] as const;

function Phone({
  title,
  activeNav,
  children,
}: {
  title: string;
  activeNav: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[232px] rounded-[1.9rem] border border-border bg-card p-2.5 shadow-[0_30px_60px_-30px_oklch(0_0_0/0.85)]">
      <div className="overflow-hidden rounded-[1.35rem] border border-border/60 bg-background/70">
        <div className="flex items-center justify-between px-3.5 pb-1 pt-2.5" aria-hidden>
          <span className="text-[9px] font-semibold tabular-nums">9:41</span>
          <span className="h-1.5 w-10 rounded-full bg-foreground/15" />
          <span className="font-mono text-[8px] font-bold text-muted-foreground">EC</span>
        </div>
        <p className="px-3.5 pb-2 pt-1 text-[13px] font-bold tracking-tight">{title}</p>
        <div className="space-y-2 px-3 pb-3">{children}</div>
        <div className="flex items-center justify-around border-t border-border/60 px-2 py-2" aria-hidden>
          {NAV_ICONS.map((Icon, i) => (
            <Icon
              key={i}
              className={i === activeNav ? "size-3.5 text-primary" : "size-3.5 text-muted-foreground/70"}
            />
          ))}
          <MoreHorizontal className="size-3.5 text-muted-foreground/70" />
        </div>
      </div>
    </div>
  );
}

const SHOWCASE = [
  {
    title: "Entrenamientos",
    caption: "Planes adaptados a tu nivel y objetivo.",
    nav: 1,
    body: (
      <>
        <MiniTabs tabs={["Plan", "Biblioteca", "Metas"]} active={0} />
        <div className="rounded-xl border border-border/60 bg-accent/40 p-2.5">
          <p className="text-[8px] uppercase tracking-[0.16em] text-muted-foreground">Entrenamiento de hoy</p>
          <p className="mt-0.5 text-[11px] font-bold">Fuerza · Tren superior</p>
          <p className="mt-1 text-[8px] text-muted-foreground">4 semanas · Intermedio</p>
          <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[8px] font-bold text-primary-foreground">
            Entrenar ahora <ArrowRight className="size-2.5" aria-hidden />
          </span>
        </div>
        <MiniBar label="Semana actual" value="2/4" pct={50} />
        <div className="space-y-1.5">
          <p className="text-[8px] uppercase tracking-[0.16em] text-muted-foreground">Otros planes</p>
          {["Torso inferior · Principiante", "HIIT · Intermedio"].map((p) => (
            <div key={p} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-2 py-1.5">
              <span className="text-[9px] font-medium">{p}</span>
              <ChevronRight className="size-3 text-muted-foreground" aria-hidden />
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    title: "Nutrición",
    caption: "Contador de calorías simple y efectivo.",
    nav: 2,
    body: (
      <>
        <MiniTabs tabs={["Hoy", "Calculadoras"]} active={0} />
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-accent/40 p-2.5">
          <MiniRing center="1.840" sub="/ 2.400 kcal" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <MiniBar label="Proteínas" value="120 g" pct={72} />
            <MiniBar label="Carbohidratos" value="210 g" pct={64} />
            <MiniBar label="Grasas" value="65 g" pct={58} />
          </div>
        </div>
        <p className="text-[8px] uppercase tracking-[0.16em] text-muted-foreground">Comidas de hoy</p>
        {[
          ["Desayuno", "420 kcal"],
          ["Almuerzo", "580 kcal"],
          ["Cena", "640 kcal"],
        ].map(([m, k]) => (
          <div key={m} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-2 py-1.5">
            <span className="text-[9px] font-medium">{m}</span>
            <span className="text-[9px] tabular-nums text-muted-foreground">{k}</span>
          </div>
        ))}
      </>
    ),
  },
  {
    title: "Progreso",
    caption: "Visualizá tus resultados reales.",
    nav: 3,
    body: (
      <>
        <MiniTabs tabs={["Resumen", "Fuerza"]} active={1} />
        <div className="rounded-xl border border-border/60 bg-accent/40 p-2.5">
          <div className="flex items-baseline justify-between">
            <p className="text-[9px] text-muted-foreground">Peso corporal</p>
            <p className="text-[11px] font-bold tabular-nums">78,4 kg</p>
          </div>
          <MiniLine />
        </div>
        <p className="text-[8px] uppercase tracking-[0.16em] text-muted-foreground">Récords · e1RM</p>
        {[
          ["Press de banca", "82,3 kg"],
          ["Sentadilla", "110 kg"],
          ["Peso muerto", "130 kg"],
        ].map(([l, v]) => (
          <div key={l} className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-2 py-1.5">
            <span className="text-[9px] font-medium">{l}</span>
            <span className="text-[9px] font-semibold tabular-nums text-primary">{v}</span>
          </div>
        ))}
      </>
    ),
  },
  {
    title: "Biblioteca",
    caption: "200 ejercicios con técnica clara.",
    nav: 1,
    body: (
      <>
        <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/50 px-2 py-1.5 text-muted-foreground">
          <Search className="size-3" aria-hidden />
          <span className="text-[9px]">Buscar ejercicio o músculo…</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {["Pecho", "Espalda", "Piernas"].map((g, i) => (
            <span
              key={g}
              className={
                i === 0
                  ? "rounded-full bg-primary px-2 py-0.5 text-[8px] font-bold text-primary-foreground"
                  : "rounded-full border border-border/60 bg-background/50 px-2 py-0.5 text-[8px] text-muted-foreground"
              }
            >
              {g}
            </span>
          ))}
        </div>
        {["Press de banca con barra", "Jalón al pecho"].map((e) => (
          <div key={e} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 p-1.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
              <Dumbbell className="size-3.5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 truncate text-[9px] font-medium">{e}</span>
            <ChevronRight className="size-3 shrink-0 text-muted-foreground" aria-hidden />
          </div>
        ))}
        <p className="rounded-lg bg-primary/10 px-2 py-1.5 text-[8px] font-semibold text-primary">
          200 ejercicios · 7 grupos musculares
        </p>
      </>
    ),
  },
  {
    title: "Herramientas",
    caption: "Todo lo que necesitás, en un solo lugar.",
    nav: 0,
    body: (
      <>
        {[
          { icon: Calculator, l: "Calculadoras fitness", s: "IMC, TDEE, macros, 1RM" },
          { icon: UtensilsCrossed, l: "Contador de calorías", s: "Registro diario" },
          { icon: Dumbbell, l: "Biblioteca de ejercicios", s: "200 ejercicios" },
          { icon: BookOpen, l: "Blog y guía", s: "Artículos y recursos" },
        ].map((r) => (
          <div key={r.l} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 p-1.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
              <r.icon className="size-3.5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[9px] font-semibold">{r.l}</span>
              <span className="block truncate text-[8px] text-muted-foreground">{r.s}</span>
            </span>
            <ChevronRight className="size-3 shrink-0 text-muted-foreground" aria-hidden />
          </div>
        ))}
        <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/10 p-2">
          <Flame className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden />
          <p className="text-[8px] leading-snug text-foreground/90">
            <span className="font-bold">Consejo:</span> registrá cada serie. Lo que se mide, mejora.
          </p>
        </div>
      </>
    ),
  },
] as const;

export function AppShowcase() {
  return (
    <section aria-labelledby="app-showcase-title" className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Una sola app"
          title="Todo lo que necesitás, en un solo lugar"
          description="Mi Zona reúne tus rutinas, tu registro, tu progreso y las herramientas de nutrición. Vistas ilustrativas con datos de ejemplo."
          align="center"
        />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 xl:grid-cols-5">
          {SHOWCASE.map((s, i) => (
            <Reveal key={s.title} delay={0.05 * i}>
              <div className="flex h-full flex-col gap-3">
                <Phone title={s.title} activeNav={s.nav}>
                  {s.body}
                </Phone>
                <div className="px-1 text-center">
                  <p className="text-sm font-bold">{s.title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{s.caption}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
