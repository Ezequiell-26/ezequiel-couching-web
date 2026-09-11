"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { EmptyState, LoadingState } from "@/components/site/states";
import { loadProgress, saveProgress, type ProgressData, type SessionEntry, type WeightEntry } from "@/lib/progress-store";
import { todayKey } from "@/lib/food-diary-store";
import { track } from "@/lib/analytics";
import { formatDate } from "@/lib/utils";

/**
 * Mi progreso — tracker 100% local (localStorage, ec_progress_v1).
 * Registro manual y honesto: no hay datos de demostración; los totales
 * empiezan en 0 y los gráficos exigen al menos 2 puntos reales.
 */

function fmt1(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(n);
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function shiftDate(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + days);
  return todayKey(d);
}

/* Gráfico de línea de peso (SVG manual) ----------------------------------- */

function WeightLine({ points }: { points: WeightEntry[] }) {
  if (points.length < 2) {
    return (
      <EmptyState
        title="No hay suficientes datos todavía"
        hint="Registra al menos dos pesadas para ver la evolución del peso."
      />
    );
  }

  const W = 320;
  const H = 160;
  const padL = 34;
  const padR = 12;
  const padT = 16;
  const padB = 26;

  const kgs = points.map((p) => p.kg);
  const min = Math.min(...kgs);
  const max = Math.max(...kgs);
  const span = Math.max(max - min, 1);

  const x = (i: number) => padL + (i * (W - padL - padR)) / (points.length - 1);
  const y = (kg: number) => padT + (1 - (kg - min) / span) * (H - padT - padB);
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Evolución del peso: de ${fmt1(min)} a ${fmt1(max)} kg`}>
      {/* rejilla horizontal mínima */}
      <line x1={padL} x2={W - padR} y1={padT} y2={padT} strokeWidth="1" className="stroke-border/60" strokeDasharray="3 4" />
      <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} strokeWidth="1" className="stroke-border/60" strokeDasharray="3 4" />
      <text x={padL - 4} y={padT + 4} textAnchor="end" className="fill-muted-foreground text-[9px]">
        {fmt1(max)}
      </text>
      <text x={padL - 4} y={H - padB + 3} textAnchor="end" className="fill-muted-foreground text-[9px]">
        {fmt1(min)}
      </text>
      <polyline points={line} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-primary" />
      {points.map((p, i) => (
        <circle key={`${p.date}-${i}`} cx={x(i)} cy={y(p.kg)} r="3" className="fill-primary" />
      ))}
      <text x={padL} y={H - 8} className="fill-muted-foreground text-[9px]">
        {formatDate(`${points[0].date}T12:00:00`)}
      </text>
      <text x={W - padR} y={H - 8} textAnchor="end" className="fill-muted-foreground text-[9px]">
        {formatDate(`${points[points.length - 1].date}T12:00:00`)}
      </text>
    </svg>
  );
}

/* Vista -------------------------------------------------------------------- */

export function ProgressView() {
  // Carga inicial perezosa desde localStorage (vista client-only: window existe).
  const [data, setData] = React.useState<ProgressData | null>(() => loadProgress());
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // Formularios
  const [wDate, setWDate] = React.useState<string>(() => todayKey());
  const [wKg, setWKg] = React.useState("");
  const [sDate, setSDate] = React.useState<string>(() => todayKey());
  const [sTitle, setSTitle] = React.useState("");
  const [sExercises, setSExercises] = React.useState("");
  const [sVolume, setSVolume] = React.useState("");

  if (!data) {
    return <LoadingState label="Cargando tu progreso…" className="min-h-[50vh]" />;
  }

  const weights = [...data.weights].sort((a, b) => a.date.localeCompare(b.date));
  const sessions = [...data.sessions].sort((a, b) => b.date.localeCompare(a.date));

  const weekStart = shiftDate(todayKey(), -6);
  const weekVolume = sessions
    .filter((s) => s.date >= weekStart)
    .reduce((acc, s) => acc + s.volumeKg, 0);

  function persist(next: ProgressData) {
    setData(next);
    saveProgress(next);
  }

  function addWeight(e: React.FormEvent) {
    e.preventDefault();
    const kg = Number(wKg.trim().replace(",", "."));
    if (!wDate || !Number.isFinite(kg) || kg < 25 || kg > 400) {
      toast({ title: "Revisa los datos", description: "Fecha válida y peso entre 25 y 400 kg.", variant: "error" });
      return;
    }
    const next: ProgressData = {
      ...data!,
      weights: [...data!.weights, { date: wDate, kg }].sort((a, b) => a.date.localeCompare(b.date)),
    };
    persist(next);
    setWKg("");
    toast({ title: "Peso registrado", description: `${fmt1(kg)} kg el ${formatDate(`${wDate}T12:00:00`)}` });
    track("progress_add_weight");
  }

  function addSession(e: React.FormEvent) {
    e.preventDefault();
    const exercises = Number(sExercises);
    const volume = Number(sVolume.replace(",", "."));
    const title = sTitle.trim();
    if (!sDate || title.length < 2) {
      toast({ title: "Revisa los datos", description: "Fecha y un título de sesión válidos.", variant: "error" });
      return;
    }
    if (!Number.isInteger(exercises) || exercises < 0 || exercises > 50 || !Number.isFinite(volume) || volume < 0) {
      toast({ title: "Revisa los datos", description: "Ejercicios (nº) y volumen en kg válidos.", variant: "error" });
      return;
    }
    const entry: SessionEntry = { id: newId(), date: sDate, title, exercises, volumeKg: Math.round(volume) };
    persist({ ...data!, sessions: [entry, ...data!.sessions] });
    setSTitle("");
    setSExercises("");
    setSVolume("");
    toast({ title: "Sesión registrada", description: `${title} · ${entry.volumeKg} kg de volumen` });
    track("progress_add_session");
  }

  function borrarTodo() {
    try {
      window.localStorage.removeItem("ec_progress_v1");
    } catch {
      /* almacenamiento no disponible */
    }
    setData({ weights: [], sessions: [] });
    setConfirmOpen(false);
    toast({ title: "Datos borrados", description: "Se ha eliminado todo tu registro local de progreso." });
  }

  return (
    <>
      <PageHeader
        eyebrow="Herramientas"
        title="Mi progreso"
        description="Peso corporal y sesiones completadas, con registro manual. Todo se guarda solo en este navegador: no hay cuentas ni sincronización."
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Progreso" }]}
      />

      <Container className="space-y-6 py-8 sm:py-10">
        {/* Peso corporal */}
        <section aria-labelledby="prog-peso-title" className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Card className="self-start">
            <CardHeader>
              <CardTitle id="prog-peso-title" className="text-base">
                Registrar peso
              </CardTitle>
              <CardDescription>Una pesada al día, siempre en las mismas condiciones (por la mañana, en ayunas).</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={addWeight} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pw-fecha">Fecha</Label>
                  <Input id="pw-fecha" type="date" max={todayKey()} value={wDate} onChange={(e) => setWDate(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw-kg">Peso · kg</Label>
                  <Input
                    id="pw-kg"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={25}
                    max={400}
                    placeholder="75.4"
                    value={wKg}
                    onChange={(e) => setWKg(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" className="w-full sm:w-auto">
                    <Plus aria-hidden /> Añadir pesada
                  </Button>
                </div>
              </form>

              <div className="mt-6">
                <h3 className="mb-2 text-sm font-semibold">Últimas 10 pesadas</h3>
                {weights.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">
                    Aún no has registrado ningún peso.
                  </p>
                ) : (
                  <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                    {[...weights]
                      .slice(-10)
                      .reverse()
                      .map((w, idx) => {
                        const origIdx = weights.length - 1 - idx;
                        const prev = origIdx > 0 ? weights[origIdx - 1] : null;
                        const diff = prev ? w.kg - prev.kg : null;
                        return (
                          <li
                            key={`${w.date}-${idx}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-sm"
                          >
                            <span className="text-muted-foreground">{formatDate(`${w.date}T12:00:00`)}</span>
                            <span className="flex items-center gap-2">
                              <span className="font-semibold">{fmt1(w.kg)} kg</span>
                              {diff !== null && Math.abs(diff) >= 0.05 ? (
                                <span className={diff < 0 ? "text-primary" : "text-muted-foreground"}>
                                  <span aria-hidden>{diff < 0 ? "▼" : "▲"}</span>
                                  <span className="sr-only">{diff < 0 ? "bajó" : "subió"}</span>{" "}
                                  {fmt1(Math.abs(diff))} kg
                                </span>
                              ) : diff !== null ? (
                                <Badge variant="muted">igual</Badge>
                              ) : null}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolución del peso</CardTitle>
              <CardDescription>Pesadas registradas de más antigua a más reciente.</CardDescription>
            </CardHeader>
            <CardContent>
              <WeightLine points={weights} />
            </CardContent>
          </Card>
        </section>

        {/* Sesiones */}
        <section aria-labelledby="prog-sesiones-title" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <Card className="self-start">
              <CardHeader>
                <CardTitle id="prog-sesiones-title" className="text-base">
                  Registrar sesión
                </CardTitle>
                <CardDescription>Apunta manualmente lo que realmente entrenaste: sin estimaciones automáticas.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={addSession} className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="ps-fecha">Fecha</Label>
                    <Input id="ps-fecha" type="date" max={todayKey()} value={sDate} onChange={(e) => setSDate(e.target.value)} className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ps-titulo">Sesión</Label>
                    <Input id="ps-titulo" value={sTitle} onChange={(e) => setSTitle(e.target.value)} placeholder="p. ej. Empuje — pesas" className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ps-ejercicios">Nº de ejercicios</Label>
                    <Input
                      id="ps-ejercicios"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={50}
                      step="1"
                      placeholder="6"
                      value={sExercises}
                      onChange={(e) => setSExercises(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ps-volumen">
                      Volumen total <span className="font-normal text-muted-foreground">· kg (series × reps × carga)</span>
                    </Label>
                    <Input
                      id="ps-volumen"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      placeholder="4200"
                      value={sVolume}
                      onChange={(e) => setSVolume(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" className="w-full sm:w-auto">
                      <Plus aria-hidden /> Añadir sesión
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Sesiones registradas</CardTitle>
                  <CardDescription className="mt-1.5">De la más reciente a la más antigua.</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Volumen · 7 días</p>
                  <p className="text-2xl font-bold text-primary">{fmt1(weekVolume)} kg</p>
                </div>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">
                    Aún no has registrado sesiones. El volumen semanal empieza en 0.
                  </p>
                ) : (
                  <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                    {sessions.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(`${s.date}T12:00:00`)} · {s.exercises} {s.exercises === 1 ? "ejercicio" : "ejercicios"}
                          </p>
                        </div>
                        <span className="shrink-0 font-semibold">{fmt1(s.volumeKg)} kg</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Zona de datos */}
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-border/70 bg-card/50 p-4 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            Tus pesos y sesiones se guardan solo en este navegador. Puedes borrarlos cuando quieras.
          </p>
          <Button variant="ghost" onClick={() => setConfirmOpen(true)} className="shrink-0 text-destructive hover:text-destructive">
            <Trash2 aria-hidden /> Borrar mis datos
          </Button>
        </div>
      </Container>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title="¿Borrar todos tus datos?">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Se eliminarán todas tus pesadas y sesiones guardadas en este navegador (ec_progress_v1). Esta acción no se puede
          deshacer.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={borrarTodo}>
            Sí, borrar todo
          </Button>
        </div>
      </Dialog>
    </>
  );
}
