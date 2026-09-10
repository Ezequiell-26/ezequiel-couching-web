"use client";

import * as React from "react";
import { Activity, Check, Download, Droplets, Flame, Loader2, Scale, Target, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { EmptyState } from "@/components/site/states";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { BarChart, LineChart } from "./charts";
import {
  HABITS,
  ZonaUnauthorized,
  fmtInt,
  fmtKg,
  shortDate,
  shortWeek,
  zonaApi,
  type ProgressDTO,
  type ZonaProfileGoals,
  type ZonaProfileWithGoals,
} from "./api";

/**
 * Tab Progreso: stats agregadas, peso corporal con curva SVG propia y meta
 * propia (Task 26-b), agua con meta configurable (null = objetivo sugerido
 * 2000 ml), hábitos del día + semana, volumen semanal, heatmap de actividad de
 * los últimos 90 días (activityDays) y tabla de PRs. Todo honesto: sin datos,
 * estados vacíos explicados.
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

  // ── Metas propias (Task 26-b): GET /api/zona/profile al montar el tab ─────
  const [goals, setGoals] = React.useState<ZonaProfileGoals | null>(null);
  const [goalBusy, setGoalBusy] = React.useState<"peso" | "agua" | null>(null);
  const [weightGoalInput, setWeightGoalInput] = React.useState("");
  const [waterGoalInput, setWaterGoalInput] = React.useState("");
  const [weightGoalOpen, setWeightGoalOpen] = React.useState(false);
  const [waterGoalOpen, setWaterGoalOpen] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    zonaApi<ZonaProfileWithGoals>("/api/zona/profile")
      .then((p) => {
        if (!alive) return;
        setGoals({ weightGoalKg: p.weightGoalKg, waterGoalMl: p.waterGoalMl });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        onActionError(err); // 401 → AuthGate (patrón de la casa); resto → toast
      });
    return () => {
      alive = false;
    };
  }, [onActionError]);

  async function saveGoal(kind: "peso" | "agua", value: number | null) {
    setGoalBusy(kind);
    try {
      const res = await zonaApi<ZonaProfileWithGoals>("/api/zona/profile", {
        method: "PATCH",
        body: JSON.stringify(kind === "peso" ? { weightGoalKg: value } : { waterGoalMl: value }),
      });
      setGoals({ weightGoalKg: res.weightGoalKg, waterGoalMl: res.waterGoalMl });
      if (kind === "peso") {
        setWeightGoalOpen(false);
        setWeightGoalInput("");
      } else {
        setWaterGoalOpen(false);
        setWaterGoalInput("");
      }
      toast({
        title: value === null ? "Meta quitada" : "Meta guardada",
        description:
          kind === "peso"
            ? value === null
              ? "Se quitó tu meta de peso."
              : `Objetivo: ${fmtKg(value)} kg.`
            : value === null
              ? "Se quitó tu meta de agua."
              : `Objetivo: ${fmtInt(value)} ml al día.`,
      });
      track("zona_goal_save", { kind, value });
    } catch (err) {
      // 400 (fuera de rango) → toast con el mensaje del API; 401 → AuthGate.
      onActionError(err);
    } finally {
      setGoalBusy(null);
    }
  }

  function submitWeightGoal() {
    const n = Number(weightGoalInput.replace(",", "."));
    if (!Number.isFinite(n) || n < 30 || n > 300) {
      toast({ title: "Revisá la meta", description: "Ingresá un valor entre 30 y 300 kg.", variant: "error" });
      return;
    }
    void saveGoal("peso", Math.round(n * 10) / 10);
  }

  function submitWaterGoal() {
    const n = Number(waterGoalInput);
    if (!Number.isInteger(n) || n < 500 || n > 5000) {
      toast({ title: "Revisá la meta", description: "Ingresá un valor entero entre 500 y 5000 ml.", variant: "error" });
      return;
    }
    void saveGoal("agua", n);
  }

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

  const weightGoal = goals?.weightGoalKg ?? null;
  const waterGoal = goals?.waterGoalMl ?? null;
  const waterTarget = waterGoal ?? 2000;
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

            {/* Meta propia de peso (Task 26-b): datos reales del perfil. */}
            {goals !== null ? (
              <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-2.5">
                {weightGoal != null ? (
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-semibold">Meta: {fmtKg(weightGoal)} kg</span>
                      <span className="text-muted-foreground"> · {weightGoalText(weightGoal, lastWeight)}</span>
                    </p>
                    <GoalEditor
                      id="zona-weight-goal"
                      label="Cambiar meta de peso (kg)"
                      placeholder="Nueva meta (kg)"
                      value={weightGoalInput}
                      onValueChange={setWeightGoalInput}
                      onSave={submitWeightGoal}
                      onCancel={() => void saveGoal("peso", null)}
                      cancelLabel="Limpiar"
                      busy={goalBusy !== null}
                      step={0.1}
                    />
                  </div>
                ) : weightGoalOpen ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Definí tu meta de peso</p>
                    <GoalEditor
                      id="zona-weight-goal"
                      label="Meta de peso (kg)"
                      placeholder="p. ej. 75"
                      value={weightGoalInput}
                      onValueChange={setWeightGoalInput}
                      onSave={submitWeightGoal}
                      onCancel={() => setWeightGoalOpen(false)}
                      cancelLabel="Cancelar"
                      busy={goalBusy !== null}
                      step={0.1}
                    />
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setWeightGoalOpen(true)}>
                    <Target aria-hidden className="size-4" /> Definir meta de peso
                  </Button>
                )}
              </div>
            ) : null}

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
            <CardDescription>
              {waterGoal != null
                ? `Tu meta: ${fmtInt(waterGoal)} ml al día. Cada toque suma al registro.`
                : "Objetivo sugerido: 2000 ml al día. Cada toque suma al registro."}
            </CardDescription>
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

            {/* Meta propia de agua (Task 26-b): si no hay, se mantiene el objetivo sugerido. */}
            {goals !== null ? (
              <div className="border-t border-border/60 pt-3">
                {waterGoal != null ? (
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-semibold">Meta: {fmtInt(waterGoal)} ml</span>
                    </p>
                    <GoalEditor
                      id="zona-water-goal"
                      label="Cambiar meta de agua (ml)"
                      placeholder="Nueva meta (ml)"
                      value={waterGoalInput}
                      onValueChange={setWaterGoalInput}
                      onSave={submitWaterGoal}
                      onCancel={() => void saveGoal("agua", null)}
                      cancelLabel="Limpiar"
                      busy={goalBusy !== null}
                      step={50}
                    />
                  </div>
                ) : waterGoalOpen ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Definí tu meta de agua</p>
                    <GoalEditor
                      id="zona-water-goal"
                      label="Meta de agua (ml)"
                      placeholder="p. ej. 2500"
                      value={waterGoalInput}
                      onValueChange={setWaterGoalInput}
                      onSave={submitWaterGoal}
                      onCancel={() => setWaterGoalOpen(false)}
                      cancelLabel="Cancelar"
                      busy={goalBusy !== null}
                      step={50}
                    />
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setWaterGoalOpen(true)}>
                    <Target aria-hidden className="size-4" /> Definir meta de agua
                  </Button>
                )}
              </div>
            ) : null}
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

      {/* ── Heatmap de actividad (Task 26-b, inspirado en LiftShift/openGym) ─ */}
      <ActivityHeatmap activityDays={progress.activityDays} />

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

      {/* ── Exportar mis datos (portabilidad, Task 25-e) ────────────────── */}
      <ExportCard onActionError={onActionError} />
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

/* ── Metas propias (Task 26-b) ────────────────────────────────────────────── */

/**
 * Texto honesto de avance contra la meta de peso según el ÚLTIMO peso real
 * registrado (sin proyecciones): falta, excedente o meta alcanzada.
 */
function weightGoalText(goalKg: number, last: { kg: number } | null): string {
  if (!last) return "registrá tu peso para ver cuánto falta";
  const diff = last.kg - goalKg;
  if (Math.abs(diff) < 0.05) return "llegaste a tu meta";
  return diff > 0 ? `estás ${fmtKg(diff)} kg por encima` : `te faltan ${fmtKg(-diff)} kg`;
}

/** Editor compacto de meta: input + Guardar + Limpiar/Cancelar (PATCH perfil). */
function GoalEditor({
  id,
  label,
  placeholder,
  value,
  onValueChange,
  onSave,
  onCancel,
  cancelLabel,
  busy,
  step,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onValueChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  cancelLabel: "Limpiar" | "Cancelar";
  busy: boolean;
  step: number;
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1">
        <Label htmlFor={id} className="sr-only">
          {label}
        </Label>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder}
          className="h-11"
        />
      </div>
      <Button variant="outline" className="min-h-11 shrink-0" disabled={busy || value.trim() === ""} onClick={onSave}>
        Guardar
      </Button>
      <Button
        variant="ghost"
        className="min-h-11 shrink-0 text-muted-foreground hover:text-destructive"
        disabled={busy}
        onClick={onCancel}
      >
        {cancelLabel}
      </Button>
    </div>
  );
}

/* ── Heatmap de actividad 90 días (Task 26-b, inspirado en LiftShift/openGym) ── */

type HeatCell = { key: string; active: boolean; isToday: boolean; future: boolean };

const HEAT_WEEKS = 13;
const HEAT_WEEKDAY_INITIALS = ["L", "M", "X", "J", "V", "S", "D"];

/**
 * Grilla 13 semanas × 7 días (columnas = semanas, lunes primero, UTC para
 * coincidir con las claves YYYY-MM-DD de activityDays). La última columna es
 * la semana en curso; los días futuros quedan como celdas transparentes.
 * SIN datos simulados: active sale únicamente del Set real del API.
 */
function buildHeatGrid(todayKey: string, activeSet: Set<string>): HeatCell[][] {
  const today = new Date(`${todayKey}T00:00:00Z`);
  const sinceMonday = (today.getUTCDay() + 6) % 7;
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - sinceMonday - (HEAT_WEEKS - 1) * 7);
  return Array.from({ length: HEAT_WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const cellDate = new Date(start);
      cellDate.setUTCDate(start.getUTCDate() + w * 7 + d);
      const key = cellDate.toISOString().slice(0, 10);
      return { key, active: activeSet.has(key), isToday: key === todayKey, future: key > todayKey };
    }),
  );
}

function ActivityHeatmap({ activityDays }: { activityDays: string[] }) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const activeSet = React.useMemo(() => new Set(activityDays), [activityDays]);
  const weeks = React.useMemo(() => buildHeatGrid(todayKey, activeSet), [todayKey, activeSet]);
  const activeCount = activityDays.length;

  return (
    <Card>
      <CardHeader className="gap-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity aria-hidden className="size-4 text-primary" /> Actividad (últimos 90 días)
        </CardTitle>
        <CardDescription>
          Cada cuadrado es un día: cuenta como actividad registrar series, peso, agua o hábitos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto pb-1">
          <div
            role="img"
            aria-label={`Heatmap: ${activeCount} ${activeCount === 1 ? "día activo" : "días activos"} de los últimos 90`}
            className="flex w-max gap-[3px]"
          >
            <div aria-hidden className="mr-0.5 flex flex-col gap-[3px]">
              {HEAT_WEEKDAY_INITIALS.map((ini) => (
                <span key={ini} className="flex size-3 items-center justify-center text-[8px] leading-none text-muted-foreground">
                  {ini}
                </span>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} aria-hidden className="flex flex-col gap-[3px]">
                {week.map((cell) => (
                  <div
                    key={cell.key}
                    title={`${shortDate(cell.key)}${cell.isToday ? " · hoy" : cell.active ? " · día activo" : ""}`}
                    className={cn(
                      "size-3 rounded-[3px] border",
                      cell.future ? "border-transparent bg-transparent" : cell.active ? "border-primary bg-primary" : "border-border/60 bg-muted",
                      cell.isToday ? "ring-2 ring-foreground/70" : "",
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {activeCount === 0 ? <p className="text-sm text-muted-foreground">Tus días de actividad van a aparecer acá.</p> : null}

        <div aria-hidden className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            Menos
            <span className="size-2.5 rounded-[2px] border border-border/60 bg-muted" />
            <span className="size-2.5 rounded-[2px] border border-primary bg-primary" />
            Más
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px] border border-border/60 bg-muted ring-2 ring-foreground/70" />
            hoy
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Exportar mis datos (Task 25-e, inspirado en wger: portabilidad) ──────── */

const EXPORT_FILENAME = "ezequiel-coaching-mis-datos.json";

/**
 * Descarga el JSON completo del perfil (GET /api/zona/export, que responde con
 * Content-Disposition attachment): fetch → blob → object URL → click
 * programático en <a download> → revocar URL. 401 → ZonaUnauthorized → AuthGate.
 */
function ExportCard({ onActionError }: { onActionError: (err: unknown) => void }) {
  const [exporting, setExporting] = React.useState(false);

  async function exportData() {
    setExporting(true);
    try {
      let res: Response;
      try {
        res = await fetch("/api/zona/export", { credentials: "same-origin" });
      } catch {
        throw new Error("No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.");
      }
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        const msg =
          typeof data === "object" && data !== null && "error" in data && typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "No pudimos exportar tus datos. Intentá de nuevo.";
        if (res.status === 401) throw new ZonaUnauthorized(msg);
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = EXPORT_FILENAME;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Descarga lista", description: `Tus datos se descargaron como ${EXPORT_FILENAME}.` });
      track("zona_export");
    } catch (err) {
      onActionError(err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Tus datos son tuyos</h3>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Descargá un archivo JSON con tus rutinas, sesiones, series, pesos, agua y hábitos.
          </p>
        </div>
        <Button variant="outline" className="min-h-11 shrink-0" disabled={exporting} onClick={() => void exportData()}>
          {exporting ? <Loader2 aria-hidden className="animate-spin" /> : <Download aria-hidden />}
          {exporting ? "Exportando…" : "Exportar mis datos"}
        </Button>
      </CardContent>
    </Card>
  );
}
