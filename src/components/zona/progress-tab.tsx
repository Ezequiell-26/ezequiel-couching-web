"use client";

import * as React from "react";
import { Check, Droplets, Flame, Loader2, Scale, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { EmptyState } from "@/components/site/states";
import { track } from "@/lib/analytics";
import { BarChart, LineChart } from "./charts";
import { HABITS, fmtInt, fmtKg, shortDate, shortWeek, zonaApi, type ProgressDTO } from "./api";

/**
 * Tab Progreso: stats agregadas, peso corporal con curva SVG propia, agua con
 * objetivo sugerido fijo (2000 ml), hábitos del día + semana, volumen semanal
 * y tabla de PRs. Todo honesto: sin datos, estados vacíos explicados.
 */
export function ProgressTab({
  progress,
  patch,
  refresh,
  onActionError,
}: {
  progress: ProgressDTO;
  patch: (updater: (p: ProgressDTO) => ProgressDTO) => void;
  refresh: () => Promise<void>;
  onActionError: (err: unknown) => void;
}) {
  const { totals, streak } = progress;
  const lastWeight = progress.weights.length > 0 ? progress.weights[progress.weights.length - 1] : null;

  const [kgInput, setKgInput] = React.useState(lastWeight ? String(lastWeight.kg) : "");
  const [savingWeight, setSavingWeight] = React.useState(false);
  const [waterBusy, setWaterBusy] = React.useState(false);
  const [habitBusy, setHabitBusy] = React.useState<string | null>(null);

  async function saveWeight() {
    const kg = Number(kgInput.replace(",", "."));
    if (!Number.isFinite(kg) || kg < 30 || kg > 300) {
      toast({ title: "Revisá el peso", description: "Ingresá un valor entre 30 y 300 kg.", variant: "error" });
      return;
    }
    setSavingWeight(true);
    try {
      const res = await zonaApi<{ weight: { date: string; kg: number } }>("/api/zona/weight", {
        method: "POST",
        body: JSON.stringify({ kg }),
      });
      const entry = res.weight;
      patch((p) => {
        const rest = p.weights.filter((w) => w.date !== entry.date);
        return { ...p, weights: [...rest, entry].sort((a, b) => a.date.localeCompare(b.date)) };
      });
      setKgInput(String(entry.kg));
      toast({ title: "Peso guardado", description: `${fmtKg(entry.kg)} kg registrados hoy.` });
      track("zona_log_weight", { kg: entry.kg });
      void refresh();
    } catch (err) {
      onActionError(err);
    } finally {
      setSavingWeight(false);
    }
  }

  async function addWater(ml: number) {
    setWaterBusy(true);
    try {
      const res = await zonaApi<{ ml: number }>("/api/zona/water", {
        method: "POST",
        body: JSON.stringify({ ml }),
      });
      // {ml} es el total acumulado del día (upsert incremental del backend).
      patch((p) => ({
        ...p,
        waterToday: { ml: res.ml },
        waterWeek: p.waterWeek.map((d, i) => (i === p.waterWeek.length - 1 ? { ...d, ml: res.ml } : d)),
      }));
      toast({ title: "Hidratación sumada", description: `${fmtInt(res.ml)} ml registrados hoy.` });
      track("zona_log_water", { ml });
      void refresh();
    } catch (err) {
      onActionError(err);
    } finally {
      setWaterBusy(false);
    }
  }

  async function toggleHabit(habit: string) {
    const current = progress.habitsToday.find((h) => h.habit === habit)?.done ?? false;
    setHabitBusy(habit);
    try {
      const res = await zonaApi<{ habit: string; done: boolean }>("/api/zona/habits", {
        method: "POST",
        body: JSON.stringify({ habit, done: !current }),
      });
      patch((p) => {
        const today = p.habitsToday.filter((h) => h.habit !== habit);
        return {
          ...p,
          habitsToday: [...today, { habit: res.habit, done: res.done }],
          habitsWeek: p.habitsWeek.map((d, i) =>
            i === p.habitsWeek.length - 1
              ? { ...d, habits: [...d.habits.filter((h) => h.habit !== habit), { habit: res.habit, done: res.done }] }
              : d,
          ),
        };
      });
      track("zona_toggle_habit", { habit, done: res.done });
      void refresh();
    } catch (err) {
      onActionError(err);
    } finally {
      setHabitBusy(null);
    }
  }

  const waterTarget = 2000;
  const waterMl = progress.waterToday.ml;
  const waterPct = Math.min(Math.round((waterMl / waterTarget) * 100), 100);
  const volumeBars = progress.volumeByWeek.map((w) => ({ label: shortWeek(w.week), value: w.volumeKg }));
  const weekDayFmt = new Intl.DateTimeFormat("es-AR", { weekday: "narrow", timeZone: "UTC" });

  return (
    <div className="space-y-6">
      {/* ── Stats compactas ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Resumen de tu progreso">
        <StatTile label="Sesiones completadas" value={fmtInt(totals.sessionsCompleted)} />
        <StatTile label="Volumen total" value={`${fmtInt(totals.totalVolumeKg)} kg`} />
        <StatTile label="Récords (PRs)" value={fmtInt(totals.prsCount)} icon={<Trophy aria-hidden className="size-4 text-primary" />} />
        <StatTile label="Racha" value={`${fmtInt(streak.days)} ${streak.days === 1 ? "día" : "días"}`} icon={<Flame aria-hidden className="size-4 text-primary" />} />
        <StatTile label="Días entrenados (30 d)" value={fmtInt(totals.daysTrainedLast30)} className="col-span-2 sm:col-span-1" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Peso corporal ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale aria-hidden className="size-4 text-primary" /> Peso corporal
            </CardTitle>
            <CardDescription>Registrá tu peso y mirá la curva de los últimos 90 días.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-[1fr_auto] items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="zona-weight">Peso de hoy (kg)</Label>
                <Input
                  id="zona-weight"
                  type="number"
                  inputMode="decimal"
                  step={0.1}
                  min={30}
                  max={300}
                  value={kgInput}
                  onChange={(e) => setKgInput(e.target.value)}
                  placeholder={lastWeight ? `último: ${fmtKg(lastWeight.kg)}` : "p. ej. 75.5"}
                  className="h-11"
                />
              </div>
              <Button className="min-h-11" disabled={savingWeight} onClick={() => void saveWeight()}>
                {savingWeight ? <Loader2 aria-hidden className="animate-spin" /> : null}
                Guardar
              </Button>
            </div>

            {progress.weights.length > 0 ? (
              <div className="rounded-lg border border-border/70 bg-background/40 p-2">
                <LineChart
                  data={progress.weights.map((w) => ({ label: shortDate(w.date), value: w.kg }))}
                  ariaLabel={
                    lastWeight
                      ? `Curva de peso corporal: de ${fmtKg(progress.weights[0].kg)} a ${fmtKg(lastWeight.kg)} kg en ${progress.weights.length} ${progress.weights.length === 1 ? "registro" : "registros"}`
                      : "Curva de peso corporal"
                  }
                />
              </div>
            ) : (
              <EmptyState title="Registrá tu peso para ver la curva" hint="Con dos registros ya se dibuja la línea de evolución." />
            )}
          </CardContent>
        </Card>

        {/* ── Agua ───────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Droplets aria-hidden className="size-4 text-primary" /> Agua de hoy
            </CardTitle>
            <CardDescription>Objetivo sugerido: 2000 ml al día. Cada toque suma al registro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <p className="text-2xl font-bold">
                  {fmtInt(waterMl)} <span className="text-sm font-medium text-muted-foreground">ml</span>
                </p>
                <Badge variant={waterMl >= waterTarget ? "default" : "muted"}>{waterPct}%</Badge>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={waterTarget}
                aria-valuenow={waterMl}
                aria-label="Progreso de hidratación del día"
                className="h-3 overflow-hidden rounded-full bg-muted"
              >
                <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${waterPct}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-11" disabled={waterBusy} onClick={() => void addWater(250)}>
                +250 ml
              </Button>
              <Button variant="outline" className="min-h-11" disabled={waterBusy} onClick={() => void addWater(500)}>
                +500 ml
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Hábitos ────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="text-base">Hábitos de hoy</CardTitle>
            <CardDescription>Tocá cada hábito al completarlo. Tu semana, abajo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="grid gap-2 sm:grid-cols-2">
              {HABITS.map((h) => {
                const done = progress.habitsToday.find((x) => x.habit === h.id)?.done ?? false;
                return (
                  <li key={h.id}>
                    <button
                      type="button"
                      aria-pressed={done}
                      disabled={habitBusy !== null}
                      onClick={() => void toggleHabit(h.id)}
                      className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                        done ? "border-primary bg-primary/15" : "border-border bg-background/40 hover:bg-accent/50"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                          done ? "border-primary bg-primary text-primary-foreground" : "border-border"
                        }`}
                      >
                        {done ? <Check className="size-3.5" /> : null}
                      </span>
                      {h.label}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Últimos 7 días</p>
              <ul className="grid grid-cols-7 gap-1.5" aria-label="Hábitos completados por día en la última semana">
                {progress.habitsWeek.map((d) => {
                  const doneCount = d.habits.filter((h) => h.done).length;
                  return (
                    <li key={d.date} className="rounded-md border border-border/70 bg-background/40 px-1 py-1.5 text-center">
                      <span className="block text-[10px] uppercase text-muted-foreground">{weekDayFmt.format(new Date(`${d.date}T12:00:00Z`))}</span>
                      <span className={`block text-xs font-bold ${doneCount > 0 ? "text-primary" : "text-muted-foreground"}`}>
                        {doneCount}/6
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* ── Volumen semanal ────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="text-base">Volumen por semana</CardTitle>
            <CardDescription>kg totales levantados por semana (sesiones completadas con peso).</CardDescription>
          </CardHeader>
          <CardContent>
            {progress.volumeByWeek.some((w) => w.volumeKg > 0) ? (
              <div className="rounded-lg border border-border/70 bg-background/40 p-2">
                <BarChart
                  data={volumeBars}
                  ariaLabel={`Volumen semanal de las últimas ${volumeBars.length} semanas; máximo ${fmtInt(Math.max(...volumeBars.map((b) => b.value)))} kg`}
                />
              </div>
            ) : (
              <EmptyState
                title="Sin volumen registrado todavía"
                hint="Cuando completes sesiones con peso, acá verás el total de kilos por semana."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Récords personales ──────────────────────────────────────────── */}
      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy aria-hidden className="size-4 text-primary" /> Récords personales
          </CardTitle>
          <CardDescription>Tu mejor peso registrado por ejercicio, con 1RM estimado (Epley).</CardDescription>
        </CardHeader>
        <CardContent>
          {progress.prs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Tus récords aparecerán al entrenar con peso.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-72 text-sm">
                <caption className="sr-only">Récords personales por ejercicio</caption>
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="pb-2 pr-3 font-medium">Ejercicio</th>
                    <th scope="col" className="pb-2 pr-3 text-right font-medium">Peso</th>
                    <th scope="col" className="pb-2 text-right font-medium">e1RM</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.prs.map((pr) => (
                    <tr key={pr.exerciseId} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{pr.exerciseName}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {fmtKg(pr.weightKg)} kg × {pr.reps}
                      </td>
                      <td className="py-2.5 text-right font-semibold tabular-nums text-primary">{fmtKg(pr.e1rm)} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Tile de stat compacto ────────────────────────────────────────────────── */

function StatTile({ label, value, icon, className }: { label: string; value: string; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border/70 bg-card px-4 py-3.5 ${className ?? ""}`}>
      <p className="flex items-center gap-1.5 text-xs leading-snug text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
    </div>
  );
}
