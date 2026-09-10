"use client";

import * as React from "react";
import { Activity, Dumbbell, Flag, Loader2, Play, Plus, Timer, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { EmptyState, ErrorState, LoadingState } from "@/components/site/states";
import { EXERCISES, EXERCISE_GROUPS, getExerciseById, exerciseName } from "@/lib/content/exercises";
import { track } from "@/lib/analytics";
import { ZonaUnauthorized, fmtInt, fmtKg, shortDate, zonaApi, type LastPerformanceDTO, type NewPRDTO, type RoutineDTO, type SessionDTO, type SessionDetailDTO, type SetDTO } from "./api";
import { RestTimer } from "./rest-timer";

/** Descanso por defecto cuando la serie no viene de una rutina planificada. */
const DEFAULT_REST_SECONDS = 90;

/**
 * Tab Entrenar: sesión activa con timer, registro de series por ejercicio
 * (peso opcional para peso corporal), celebración de PRs en vivo y finalización
 * con resumen. Sin sesión activa: atajo a rutinas o entrenamiento libre.
 */
export function TrainTab({
  session,
  routines,
  onFinished,
  onActionError,
}: {
  session: SessionDTO;
  routines: RoutineDTO[];
  onFinished: (result: { session: SessionDTO; newPRs: NewPRDTO[] }) => void;
  onActionError: (err: unknown) => void;
}) {
  const [detail, setDetail] = React.useState<SessionDetailDTO | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(true);
  const [detailError, setDetailError] = React.useState<string | null>(null);

  const [prSetIds, setPrSetIds] = React.useState<Set<number>>(new Set());
  const [addedIds, setAddedIds] = React.useState<string[]>([]);
  const [forms, setForms] = React.useState<Record<string, { weight: string; reps: string; rpe: string }>>({});
  const [registeringFor, setRegisteringFor] = React.useState<string | null>(null);
  const [finishOpen, setFinishOpen] = React.useState(false);
  const [finishing, setFinishing] = React.useState(false);

  // Descanso: una sola instancia a la vez; el id incremental remonta el
  // componente al registrar otra serie → el timer reinicia con el nuevo valor.
  const [rest, setRest] = React.useState<{ seconds: number; id: number } | null>(null);

  // Última performance por ejercicio: cache mientras dura la sesión activa
  // (un Map por montaje de TrainTab; cada hint consulta sin refetch repetido).
  const perfCache = React.useRef<Map<string, LastPerformanceDTO>>(new Map());

  const loadDetail = React.useCallback(async () => {
    try {
      const d = await zonaApi<SessionDetailDTO>(`/api/zona/sessions/${session.id}`);
      setDetail(d);
      setDetailError(null);
    } catch (err) {
      if (err instanceof Error) setDetailError(err.message);
      else setDetailError("No pudimos cargar la sesión.");
    } finally {
      setLoadingDetail(false);
    }
  }, [session.id]);

  // Carga inicial en la continuación de la promesa (nunca setState síncrono).
  React.useEffect(() => {
    let alive = true;
    zonaApi<SessionDetailDTO>(`/api/zona/sessions/${session.id}`)
      .then((d) => {
        if (!alive) return;
        setDetail(d);
        setDetailError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setDetailError(err instanceof Error ? err.message : "No pudimos cargar la sesión.");
      })
      .finally(() => {
        if (alive) setLoadingDetail(false);
      });
    return () => {
      alive = false;
    };
  }, [session.id]);

  function retryDetail() {
    setLoadingDetail(true);
    void loadDetail();
  }

  // Ejercicios planificados: items del día de la rutina asociada (si existe).
  const plannedItems = React.useMemo(() => {
    if (!detail?.routineId || detail.day == null) return [];
    const routine = routines.find((r) => r.id === detail.routineId);
    if (!routine) return [];
    return routine.items.filter((i) => i.day === detail.day);
  }, [detail, routines]);

  // Bloques de la lista: planificados primero, luego extras (series huérfanas
  // o ejercicios añadidos a mano en entrenamiento libre).
  const blocks = React.useMemo(() => {
    const list: { exerciseId: string; plannedSets?: number; plannedReps?: string; plannedRest?: number }[] = [];
    const seen = new Set<string>();
    for (const item of plannedItems) {
      if (seen.has(item.exerciseId)) continue;
      seen.add(item.exerciseId);
      list.push({ exerciseId: item.exerciseId, plannedSets: item.sets, plannedReps: item.reps, plannedRest: item.restSec });
    }
    const extras: string[] = [];
    if (detail) {
      for (const s of detail.sets) {
        if (!seen.has(s.exerciseId)) {
          seen.add(s.exerciseId);
          extras.push(s.exerciseId);
        }
      }
    }
    for (const id of addedIds) {
      if (!seen.has(id)) {
        seen.add(id);
        extras.push(id);
      }
    }
    for (const id of extras) list.push({ exerciseId: id });
    return list;
  }, [plannedItems, detail, addedIds]);

  function updateForm(exerciseId: string, patch: Partial<{ weight: string; reps: string; rpe: string }>) {
    setForms((prev) => {
      const current = prev[exerciseId] ?? { weight: "", reps: "", rpe: "" };
      return { ...prev, [exerciseId]: { ...current, ...patch } };
    });
  }

  function setsOf(exerciseId: string): SetDTO[] {
    return detail?.sets.filter((s) => s.exerciseId === exerciseId) ?? [];
  }

  function startRest(seconds: number) {
    setRest((prev) => ({ seconds, id: (prev?.id ?? 0) + 1 }));
  }

  async function registerSet(exerciseId: string) {
    if (!detail) return;
    const form = forms[exerciseId] ?? { weight: "", reps: "", rpe: "" };
    const reps = Number(form.reps);
    if (!Number.isInteger(reps) || reps < 1 || reps > 100) {
      toast({ title: "Revisá las repeticiones", description: "Ingresá un número de reps entre 1 y 100.", variant: "error" });
      return;
    }
    let weightKg: number | undefined;
    if (form.weight.trim() !== "") {
      const w = Number(form.weight.replace(",", "."));
      if (!Number.isFinite(w) || w < 0 || w > 500) {
        toast({ title: "Revisá el peso", description: "Ingresá un peso entre 0 y 500 kg, o dejalo vacío.", variant: "error" });
        return;
      }
      weightKg = w;
    }
    const rpe = form.rpe === "" ? undefined : Number(form.rpe);

    setRegisteringFor(exerciseId);
    try {
      const res = await zonaApi<{ set: SetDTO; volumeKg: number; isPR?: boolean; previousMax?: number | null }>(
        `/api/zona/sessions/${detail.id}/sets`,
        {
          method: "POST",
          body: JSON.stringify({
            exerciseId,
            setNumber: Math.min(setsOf(exerciseId).length + 1, 30),
            ...(weightKg !== undefined ? { weightKg } : {}),
            reps,
            ...(rpe !== undefined ? { rpe } : {}),
          }),
        },
      );
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              sets: [...prev.sets, res.set],
              volumeKg: res.volumeKg,
              setsCount: prev.setsCount + 1,
            }
          : prev,
      );
      if (res.isPR) {
        setPrSetIds((prev) => new Set(prev).add(res.set.id));
        toast({
          title: "¡Nuevo PR!",
          description:
            res.previousMax != null
              ? `${res.set.exerciseName}: ${fmtKg(weightKg ?? 0)} kg (anterior: ${fmtKg(res.previousMax)} kg)`
              : `${res.set.exerciseName}: ${fmtKg(weightKg ?? 0)} kg es tu primer registro con peso`,
        });
      }
      updateForm(exerciseId, { weight: "", reps: "", rpe: "" });
      track("zona_log_set", { pr: Boolean(res.isPR) });
      // Descanso: el del ejercicio planificado (restSec de la rutina) o 90s.
      const block = blocks.find((b) => b.exerciseId === exerciseId);
      const restSec = Math.min(300, Math.max(15, Math.round(block?.plannedRest ?? DEFAULT_REST_SECONDS)));
      startRest(restSec);
    } catch (err) {
      onActionError(err);
    } finally {
      setRegisteringFor(null);
    }
  }

  async function deleteSet(set: SetDTO) {
    if (!detail) return;
    try {
      const res = await zonaApi<{ ok: boolean; volumeKg: number }>(`/api/zona/sessions/${detail.id}/sets/${set.id}`, {
        method: "DELETE",
      });
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              sets: prev.sets.filter((s) => s.id !== set.id),
              volumeKg: res.volumeKg,
              setsCount: Math.max(0, prev.setsCount - 1),
            }
          : prev,
      );
      setPrSetIds((prev) => {
        if (!prev.has(set.id)) return prev;
        const next = new Set(prev);
        next.delete(set.id);
        return next;
      });
    } catch (err) {
      onActionError(err);
    }
  }

  function addFreeExercise(id: string) {
    if (!id || addedIds.includes(id) || blocks.some((b) => b.exerciseId === id)) return;
    setAddedIds((prev) => [...prev, id]);
  }

  async function finish() {
    if (!detail) return;
    setFinishing(true);
    try {
      const res = await zonaApi<{ session: SessionDTO; newPRs: NewPRDTO[] }>(`/api/zona/sessions/${detail.id}/finish`, {
        method: "POST",
      });
      track("zona_finish_session", { sets: detail.setsCount, volumeKg: Math.round(detail.volumeKg), prs: res.newPRs.length });
      onFinished(res);
    } catch (err) {
      onActionError(err);
      setFinishOpen(false);
    } finally {
      setFinishing(false);
    }
  }

  if (loadingDetail) {
    return <LoadingState label="Cargando tu sesión…" className="min-h-[40vh]" />;
  }
  if (detailError || !detail) {
    return <ErrorState message={detailError ?? "No pudimos cargar la sesión."} onRetry={retryDetail} className="min-h-[40vh]" />;
  }

  const isFree = detail.routineId === null;

  return (
    <div className="space-y-6">
      {/* ── Cabecera de sesión ───────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-bold sm:text-xl">{detail.title}</h2>
                <Badge variant="secondary">En curso</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Timer aria-hidden className="size-4 text-primary" />
                  <SessionTimer startedAt={detail.startedAt} />
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Activity aria-hidden className="size-4 text-primary" />
                  {fmtInt(detail.volumeKg)} kg de volumen
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Dumbbell aria-hidden className="size-4 text-primary" />
                  {detail.setsCount} {detail.setsCount === 1 ? "serie" : "series"}
                </span>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => {
                setFinishOpen(true);
              }}
            >
              <Flag aria-hidden /> Finalizar entrenamiento
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plan de la rutina (si la sesión viene de una y no encontramos la rutina) */}
      {detail.routineId !== null && plannedItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          No encontramos los detalles de la rutina asociada, pero podés registrar tus series igualmente.
        </p>
      ) : null}

      {/* ── Ejercicios ───────────────────────────────────────────────────── */}
      {blocks.length === 0 ? (
        <EmptyState
          title="Tu sesión está vacía"
          hint={isFree ? "Añadí un ejercicio de la biblioteca para empezar a registrar series." : "Registrá la primera serie del día para arrancar."}
        />
      ) : (
        <ul className="space-y-4" aria-label="Ejercicios de la sesión">
          {blocks.map((block) => {
            const sets = setsOf(block.exerciseId);
            const form = forms[block.exerciseId] ?? { weight: "", reps: "", rpe: "" };
            const planned = block.plannedSets != null ? `${block.plannedSets}×${block.plannedReps}` : null;
            const planMeta = [
              planned ? `planificado ${planned}` : null,
              block.plannedRest != null ? `descanso ${block.plannedRest}s` : null,
            ].filter(Boolean) as string[];
            const formId = `zona-form-${block.exerciseId}`;
            return (
              <li key={block.exerciseId}>
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-semibold">{getExerciseById(block.exerciseId)?.name ?? exerciseName(block.exerciseId)}</h3>
                      {planMeta.length > 0 ? <span className="text-xs text-muted-foreground">{planMeta.join(" · ")}</span> : null}
                    </div>

                    {/* Series registradas */}
                    {sets.length === 0 ? (
                      <p className="mb-3 text-sm text-muted-foreground">Sin series registradas todavía.</p>
                    ) : (
                      <ul className="mb-3 flex flex-wrap gap-2" aria-label={`Series de ${getExerciseById(block.exerciseId)?.name ?? block.exerciseId}`}>
                        {sets.map((s) => (
                          <li
                            key={s.id}
                            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                              prSetIds.has(s.id) ? "border-primary bg-primary/15" : "border-border bg-background/60"
                            }`}
                          >
                            <span>
                              {s.weightKg != null ? `${fmtKg(s.weightKg)} kg × ` : ""}
                              {s.reps}
                            </span>
                            {s.rpe != null ? <span className="text-muted-foreground">· RPE {s.rpe}</span> : null}
                            {prSetIds.has(s.id) ? <Badge className="px-1.5 py-0 text-[10px]">¡Nuevo PR!</Badge> : null}
                            <button
                              type="button"
                              aria-label={`Borrar serie: ${s.weightKg != null ? `${fmtKg(s.weightKg)} kg por` : ""} ${s.reps} repeticiones`}
                              onClick={() => void deleteSet(s)}
                              className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                            >
                              <X aria-hidden className="size-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Formulario de registro */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                      <div className="space-y-1">
                        <Label htmlFor={`${formId}-weight`} className="text-xs">
                          Peso (kg) · opcional
                        </Label>
                        <Input
                          id={`${formId}-weight`}
                          type="number"
                          inputMode="decimal"
                          step={0.5}
                          min={0}
                          max={500}
                          value={form.weight}
                          onChange={(e) => updateForm(block.exerciseId, { weight: e.target.value })}
                          placeholder="p. ej. 40"
                          className="h-11"
                        />
                        <LastPerformanceHint
                          exerciseId={block.exerciseId}
                          cache={perfCache}
                          onFill={(weightKg) => updateForm(block.exerciseId, { weight: String(weightKg) })}
                          onActionError={onActionError}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`${formId}-reps`} className="text-xs">
                          Reps
                        </Label>
                        <Input
                          id={`${formId}-reps`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={100}
                          value={form.reps}
                          onChange={(e) => updateForm(block.exerciseId, { reps: e.target.value })}
                          placeholder="p. ej. 10"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`${formId}-rpe`} className="text-xs">
                          RPE
                        </Label>
                        <Select
                          id={`${formId}-rpe`}
                          value={form.rpe}
                          onChange={(e) => updateForm(block.exerciseId, { rpe: e.target.value })}
                          className="h-11 w-full sm:w-24"
                        >
                          <option value="">—</option>
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((r) => (
                            <option key={r} value={String(r)}>
                              {r}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <Button
                        className="col-span-2 min-h-11 sm:col-span-1"
                        disabled={registeringFor !== null}
                        onClick={() => void registerSet(block.exerciseId)}
                      >
                        {registeringFor === block.exerciseId ? <Loader2 aria-hidden className="animate-spin" /> : <Plus aria-hidden />}
                        Registrar serie
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Añadir ejercicio (entrenamiento libre) ───────────────────────── */}
      {isFree ? <FreeExercisePicker onAdd={addFreeExercise} /> : null}

      {/* Repetir botón de fin al fondo: siempre a un toque */}
      <Button variant="outline" size="lg" className="w-full" onClick={() => setFinishOpen(true)}>
        <Flag aria-hidden /> Finalizar entrenamiento
      </Button>

      {/* ── Temporizador de descanso (chip sticky, no bloqueante) ────────── */}
      {rest ? (
        <div className="sticky bottom-4 z-30" aria-label="Temporizador de descanso">
          <RestTimer key={rest.id} initialSeconds={rest.seconds} onClose={() => setRest(null)} />
        </div>
      ) : null}

      {/* ── Diálogo de finalización ──────────────────────────────────────── */}
      <Dialog open={finishOpen} onClose={() => (finishing ? null : setFinishOpen(false))} title="¿Finalizar entrenamiento?">
        <div className="grid grid-cols-3 gap-3 text-center" aria-label="Resumen de la sesión">
          <div className="rounded-lg border border-border/70 bg-background/40 px-2 py-3">
            <p className="text-lg font-bold text-primary">{fmtInt(detail.volumeKg)}</p>
            <p className="text-xs text-muted-foreground">kg de volumen</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/40 px-2 py-3">
            <p className="text-lg font-bold text-primary">{detail.setsCount}</p>
            <p className="text-xs text-muted-foreground">{detail.setsCount === 1 ? "serie" : "series"}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/40 px-2 py-3">
            <SessionTimer startedAt={detail.startedAt} className="text-lg font-bold" />
            <p className="text-xs text-muted-foreground">de duración</p>
          </div>
        </div>
        {detail.setsCount === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Todavía no registraste series. Podés finalizar igual o seguir entrenando.</p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Al finalizar, la sesión se guarda como completada y comparamos tus mejores series con tus récords anteriores.
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <Button variant="ghost" onClick={() => setFinishOpen(false)} disabled={finishing}>
            Seguir entrenando
          </Button>
          <Button onClick={() => void finish()} disabled={finishing}>
            {finishing ? (
              <>
                <Loader2 aria-hidden className="animate-spin" /> Finalizando…
              </>
            ) : (
              <>
                <Flag aria-hidden /> Finalizar
              </>
            )}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

/* ── Sin sesión activa: atajo a rutinas + entrenamiento libre ─────────────── */

export function TrainEmpty({
  onStarted,
  onGoToRoutines,
  onActionError,
}: {
  onStarted: (session: SessionDTO) => void;
  onGoToRoutines: () => void;
  onActionError: (err: unknown) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [starting, setStarting] = React.useState(false);

  async function startFree() {
    const clean = title.trim();
    if (clean.length < 2) {
      toast({ title: "Ponle un nombre a la sesión", description: "Mínimo 2 caracteres, p. ej. «Empuje».", variant: "error" });
      return;
    }
    setStarting(true);
    try {
      const res = await zonaApi<{ session: SessionDTO; resumed?: boolean }>("/api/zona/sessions", {
        method: "POST",
        body: JSON.stringify({ title: clean }),
      });
      track("zona_start_session", { source: "libre", resumed: Boolean(res.resumed) });
      toast({
        title: res.resumed ? "Retomamos tu sesión activa" : "Entrenamiento iniciado",
        description: res.resumed ? "Ya tenías una sesión en curso: seguimos donde la dejaste." : clean,
      });
      onStarted(res.session);
    } catch (err) {
      onActionError(err);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-6">
      <EmptyState
        title="No hay ninguna sesión activa"
        hint="Empezá desde una de tus rutinas o lanzá un entrenamiento libre con el nombre que quieras."
        action={
          <Button
            onClick={() => {
              track("cta_click", { label: "zona-ir-a-rutinas" });
              onGoToRoutines();
            }}
          >
            <Dumbbell aria-hidden /> Ir a mis rutinas
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <h3 className="text-base font-semibold sm:text-lg">Entrenamiento libre</h3>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            Sin rutina: sumás ejercicios de la biblioteca y registrás series sobre la marcha.
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="zona-free-title">Nombre de la sesión</Label>
              <Input
                id="zona-free-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="p. ej. Empuje · pecho y hombros"
                maxLength={80}
                className="h-11"
              />
            </div>
            <Button size="lg" className="w-full sm:w-auto" disabled={starting} onClick={() => void startFree()}>
              {starting ? <Loader2 aria-hidden className="animate-spin" /> : <Play aria-hidden />}
              Empezar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Timer aislado: solo este componente se re-renderiza cada segundo ─────── */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function SessionTimer({ startedAt, className }: { startedAt: string; className?: string }) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const text = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;

  return (
    <span role="timer" aria-label={`Tiempo transcurrido: ${text}`} className={className}>
      {text}
    </span>
  );
}

/* ── Hint "Última vez" (Task 25-e, inspirado en OptiLifts: progresión) ────── */

/**
 * Muestra la última performance REAL del ejercicio (su serie más reciente en
 * sesiones completadas) y rellena el input de peso al tocarla. Best-effort:
 * - solo datos del API, sin sugerencias de progresión (regla de honestidad);
 * - cacheado en el Map del TrainTab mientras dura la sesión activa (sin
 *   refetch del mismo ejercicio);
 * - si el bloque cambia rápido, la respuesta obsoleta se ignora (flag alive);
 * - errores de red silenciosos (el hint es un extra); 401 delega al patrón
 *   de la casa (AuthGate vía onActionError).
 */
function LastPerformanceHint({
  exerciseId,
  cache,
  onFill,
  onActionError,
}: {
  exerciseId: string;
  cache: { current: Map<string, LastPerformanceDTO> };
  onFill: (weightKg: number) => void;
  onActionError: (err: unknown) => void;
}) {
  // Estado inicial: si ya está cacheado, no hay fetch ni parpadeo.
  const [perf, setPerf] = React.useState<LastPerformanceDTO | null>(() => cache.current.get(exerciseId) ?? null);

  React.useEffect(() => {
    let alive = true;
    const cached = cache.current.get(exerciseId);
    const pending =
      cached != null
        ? Promise.resolve(cached)
        : zonaApi<LastPerformanceDTO>(`/api/zona/last-performance?exerciseId=${encodeURIComponent(exerciseId)}`).then(
            (dto) => {
              cache.current.set(exerciseId, dto);
              return dto;
            },
          );
    pending
      .then((dto) => {
        if (alive) setPerf(dto); // respuesta obsoleta ignorada si el ejercicio cambió
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof ZonaUnauthorized) onActionError(err);
        // Resto: silencioso, un hint que no carga no rompe el registro de series.
      });
    return () => {
      alive = false;
    };
  }, [exerciseId, cache, onActionError]);

  const last = perf?.last ?? null;
  if (!last || last.weightKg == null) return null; // sin registro con peso: estado limpio
  const lastWeightKg = last.weightKg;
  const prev = perf?.previous ?? null;
  const droppedKg =
    prev && prev.weightKg != null && prev.weightKg > lastWeightKg ? prev.weightKg - lastWeightKg : null;
  const dateLabel = last.date ? shortDate(last.date.slice(0, 10)) : null;

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <button
        type="button"
        aria-label="Usar último peso registrado"
        onClick={() => onFill(lastWeightKg)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 sm:min-h-9"
      >
        Última vez: {fmtKg(lastWeightKg)} kg × {last.reps}
        {dateLabel ? <span className="font-normal text-muted-foreground">· {dateLabel}</span> : null}
      </button>
      {droppedKg != null ? (
        <span className="text-[11px] text-muted-foreground">↓ bajó {fmtKg(droppedKg)} kg vs. la anterior</span>
      ) : null}
    </span>
  );
}

/* ── Selector de ejercicios para entrenamiento libre ──────────────────────── */

function FreeExercisePicker({ onAdd }: { onAdd: (id: string) => void }) {
  const [picked, setPicked] = React.useState("");

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="zona-add-exercise">Añadir ejercicio de la biblioteca</Label>
            <Select id="zona-add-exercise" value={picked} onChange={(e) => setPicked(e.target.value)} className="h-11">
              <option value="">Elegí un ejercicio…</option>
              {EXERCISE_GROUPS.map((group) => (
                <optgroup key={group.id} label={group.label}>
                  {EXERCISES.filter((ex) => ex.group === group.id).map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            disabled={!picked}
            onClick={() => {
              if (!picked) return;
              onAdd(picked);
              setPicked("");
            }}
          >
            <Plus aria-hidden /> Añadir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
