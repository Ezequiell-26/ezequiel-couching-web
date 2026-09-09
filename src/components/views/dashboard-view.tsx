"use client";

import * as React from "react";
import { ArrowRight, Calculator, Dumbbell, HelpCircle, UtensilsCrossed } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/site/states";
import { loadProfile } from "@/lib/calc-profile";
import { entriesForDate, dayTotals, loadDiary, todayKey } from "@/lib/food-diary-store";
import { loadProgress } from "@/lib/progress-store";
import { useRouter, type ViewId } from "@/lib/router";
import { formatDate } from "@/lib/utils";

/**
 * Panel personal — resumen 100% local (sin cuentas): hoy (kcal vs objetivo),
 * último peso registrado y accesos rápidos. Cero métricas inventadas: si no
 * hay datos, se muestra un vacío honesto con su siguiente paso.
 */

const QUICK_ACCESS: {
  view: ViewId;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}[] = [
  {
    view: "calculadoras",
    title: "Calculadoras",
    desc: "IMC, TDEE, macros, 1RM, grasa, agua y peso ideal.",
    icon: Calculator,
  },
  {
    view: "contador",
    title: "Contador de calorías",
    desc: "Registra tus comidas del día y controla tus kcal.",
    icon: UtensilsCrossed,
  },
  {
    view: "progreso",
    title: "Mi progreso",
    desc: "Peso corporal y sesiones de entrenamiento.",
    icon: Dumbbell,
  },
  {
    view: "planes",
    title: "Planes",
    desc: "Programas de entrenamiento descargables.",
    icon: ArrowRight,
  },
  {
    view: "faq",
    title: "FAQ",
    desc: "Dudas frecuentes sobre el servicio y la entrega.",
    icon: HelpCircle,
  },
];

export function DashboardView() {
  const navigate = useRouter((s) => s.navigate);

  // Instantánea de los datos locales leída una sola vez, en el primer render
  // (vista client-only: window existe). Sin effect de carga.
  const [snapshot] = React.useState(() => {
    const p = loadProfile();

    const diary = loadDiary();
    const today = todayKey();
    const todayEntries = entriesForDate(diary, today);

    const prog = loadProgress();
    const sorted = [...prog.weights].sort((a, b) => a.date.localeCompare(b.date));
    const last = sorted.at(-1) ?? null;

    let intakeDone = false;
    try {
      // Solo una sugerencia: si otro módulo marca el check-in, se ajusta el aviso.
      intakeDone = window.localStorage.getItem("ec_intake_done") !== null;
    } catch {
      /* almacenamiento no disponible */
    }

    return {
      target: p?.targetKcal && p.targetKcal > 0 ? p.targetKcal : null,
      kcalToday: Math.round(dayTotals(todayEntries).kcal),
      entriesToday: todayEntries.length,
      lastWeight: last ? { date: last.date, kg: last.kg } : null,
      intakeDone,
    };
  });
  const { target, kcalToday, entriesToday, lastWeight, intakeDone } = snapshot;

  const hasDiaryToday = entriesToday > 0;
  const overTarget = target !== null && kcalToday > target;
  const remaining = target !== null ? Math.max(target - kcalToday, 0) : 0;
  const pct = target !== null ? Math.min(100, Math.round((kcalToday / target) * 100)) : 0;

  type Suggestion = { title: string; desc: string; view: ViewId; cta: string };
  const suggestions: Suggestion[] = [];
  if (!intakeDone) {
    suggestions.push({
      title: "Completa el cuestionario de check-in",
      desc: "Cinco minutos para que tu plan parta de datos reales y no de suposiciones.",
      view: "cuestionario",
      cta: "Ir al cuestionario",
    });
  }
  if (!hasDiaryToday) {
    suggestions.push({
      title: "Registra tus comidas de hoy",
      desc: "Añade lo que hayas comido al contador y compara con tu objetivo.",
      view: "contador",
      cta: "Abrir contador",
    });
  }
  if (!lastWeight || lastWeight.date !== todayKey()) {
    suggestions.push({
      title: "Registra tu peso de hoy",
      desc: "Una pesada diaria en las mismas condiciones es la métrica más fiable.",
      view: "progreso",
      cta: "Ir a mi progreso",
    });
  }

  return (
    <>
      <PageHeader
        eyebrow="Panel personal"
        title="Tu panel"
        description="Resumen local de tu actividad. Todo se guarda solo en este navegador: no hay cuenta asociada y nada sale de tu dispositivo."
      />

      <Container className="space-y-6 py-8 sm:py-10">
        {/* Hoy */}
        <section aria-labelledby="dash-hoy" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle id="dash-hoy" className="text-base">
                Hoy
              </CardTitle>
              <CardDescription>Calorías registradas en el contador frente a tu objetivo diario.</CardDescription>
            </CardHeader>
            <CardContent>
              {target !== null ? (
                <div>
                  <p className="text-4xl font-bold tracking-tight">
                    {kcalToday}
                    <span className="text-base font-normal text-muted-foreground"> / {target} kcal</span>
                  </p>
                  <div
                    className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={kcalToday}
                    aria-valuemin={0}
                    aria-valuemax={target}
                    aria-label="Progreso de kcal de hoy"
                  >
                    <div className={`h-full ${overTarget ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {hasDiaryToday
                      ? overTarget
                        ? `Objetivo superado en ${kcalToday - target} kcal.`
                        : `Te quedan ${remaining} kcal para tu objetivo (${pct}%).`
                      : "Hoy no has registrado alimentos todavía."}
                  </p>
                </div>
              ) : (
                <EmptyState
                  title="Aún no tienes objetivo de calorías"
                  hint="Calcula tu TDEE en la calculadora de calorías y guarda tu perfil: aparecerá aquí como objetivo diario."
                  action={
                    <button
                      type="button"
                      onClick={() => navigate("calculadoras", {}, { source: "dashboard" })}
                      className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Calcular mi objetivo <ArrowRight aria-hidden className="size-4" />
                    </button>
                  }
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Último peso registrado</CardTitle>
              <CardDescription>Desde tu registro local de progreso.</CardDescription>
            </CardHeader>
            <CardContent>
              {lastWeight ? (
                <div>
                  <p className="text-4xl font-bold tracking-tight">
                    {new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(lastWeight.kg)}
                    <span className="text-base font-normal text-muted-foreground"> kg</span>
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">Registrado el {formatDate(`${lastWeight.date}T12:00:00`)}.</p>
                  <button
                    type="button"
                    onClick={() => navigate("progreso", {}, { source: "dashboard" })}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Ver evolución completa <ArrowRight aria-hidden className="size-4" />
                  </button>
                </div>
              ) : (
                <EmptyState
                  title="Aún no has registrado ningún peso"
                  hint="Tu primera pesada será la referencia de toda tu evolución."
                  action={
                    <button
                      type="button"
                      onClick={() => navigate("progreso", {}, { source: "dashboard" })}
                      className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Registrar peso <ArrowRight aria-hidden className="size-4" />
                    </button>
                  }
                />
              )}
            </CardContent>
          </Card>
        </section>

        {/* Próximas acciones sugeridas */}
        <section aria-labelledby="dash-sugerencias">
          <Card>
            <CardHeader>
              <CardTitle id="dash-sugerencias" className="text-base">
                Próximas acciones sugeridas
              </CardTitle>
              <CardDescription>Solo sugerencias: nada se envía ni se marca automáticamente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">
                  Todo al día por ahora. ¡A por el entrenamiento de hoy!
                </p>
              ) : (
                suggestions.map((s) => (
                  <div
                    key={s.title}
                    className="flex flex-col gap-2 rounded-lg border border-border/70 bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(s.view, {}, { source: "dashboard" })}
                      className="inline-flex h-10 shrink-0 items-center gap-1.5 self-start rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent sm:self-auto"
                    >
                      {s.cta} <ArrowRight aria-hidden className="size-4" />
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        {/* Accesos rápidos */}
        <section aria-labelledby="dash-accesos">
          <h2 id="dash-accesos" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Accesos rápidos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_ACCESS.map((q) => {
              const Icon = q.icon;
              return (
                <Card key={q.view} className="transition-colors hover:border-primary/50">
                  <button
                    type="button"
                    onClick={() => navigate(q.view, {}, { source: "dashboard" })}
                    className="group flex h-full w-full flex-col items-start p-5 text-left"
                    aria-label={`Ir a ${q.title}`}
                  >
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="mt-3 flex items-center gap-2 font-semibold">
                      {q.title}
                      <ArrowRight aria-hidden className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </span>
                    <span className="mt-1 text-sm text-muted-foreground">{q.desc}</span>
                  </button>
                </Card>
              );
            })}
          </div>
        </section>

        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="muted">Privacidad</Badge>
          Este panel lee únicamente datos guardados en tu navegador (perfil, contador y progreso). No hay servidor de cuentas ni
          métricas inventadas.
        </p>
      </Container>
    </>
  );
}
