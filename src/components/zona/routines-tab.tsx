"use client";

import * as React from "react";
import { ChevronDown, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { EmptyState, ErrorState } from "@/components/site/states";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import {
  EQUIPMENT_LABELS,
  GOAL_LABELS,
  LEVEL_LABELS,
  zonaApi,
  type RoutineDTO,
} from "./api";

/**
 * Tab Rutinas: lista desplegable de rutinas (con "Entrenar día N" y borrado
 * con confirmación) + generador IA con carga honesta (tarda varios segundos).
 */
export function RoutinesTab({
  routines,
  onRefresh,
  onStartDay,
  onActionError,
}: {
  routines: RoutineDTO[];
  onRefresh: () => Promise<void>;
  onStartDay: (routine: RoutineDTO, day: number) => Promise<void>;
  onActionError: (err: unknown) => void;
}) {
  const [openId, setOpenId] = React.useState<number | null>(null);
  const [startingKey, setStartingKey] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<RoutineDTO | null>(null);

  async function handleStartDay(routine: RoutineDTO, day: number) {
    const key = `${routine.id}:${day}`;
    setStartingKey(key);
    try {
      await onStartDay(routine, day);
    } catch (err) {
      onActionError(err);
    } finally {
      setStartingKey(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await zonaApi(`/api/zona/routines/${deleteTarget.id}`, { method: "DELETE" });
      toast({ title: "Rutina eliminada", description: deleteTarget.name });
      setDeleteTarget(null);
      await onRefresh();
    } catch (err) {
      onActionError(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Lista de rutinas ─────────────────────────────────────────────── */}
      {routines.length === 0 ? (
        <EmptyState
          title="Todavía no tenés rutinas"
          hint="Generá tu primera rutina con el entrenador IA: elegí tu objetivo, tu nivel y el equipo que tengas a mano."
          action={
            <Button
              onClick={() => {
                track("cta_click", { label: "zona-primera-rutina" });
                document.getElementById("zona-generador")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <Sparkles aria-hidden /> Generar mi primera rutina
            </Button>
          }
        />
      ) : (
        <ul className="space-y-4" aria-label="Mis rutinas">
          {routines.map((routine) => {
            const isOpen = openId === routine.id;
            const days = [...new Set(routine.items.map((i) => i.day))].sort((a, b) => a - b);
            return (
              <li key={routine.id}>
                <Card>
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : routine.id)}
                    aria-expanded={isOpen}
                    aria-controls={`rutina-panel-${routine.id}`}
                    className="flex w-full items-start justify-between gap-3 p-4 text-left sm:p-6"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold sm:text-lg">{routine.name}</span>
                        {routine.source === "ia" ? <Badge>IA</Badge> : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Detalle de la rutina">
                        <Badge variant="secondary">{GOAL_LABELS[routine.goal] ?? routine.goal}</Badge>
                        <Badge variant="outline">{LEVEL_LABELS[routine.level] ?? routine.level}</Badge>
                        <Badge variant="outline">{routine.daysPerWeek} días/semana</Badge>
                        <Badge variant="outline">{EQUIPMENT_LABELS[routine.equipment] ?? routine.equipment}</Badge>
                      </div>
                    </div>
                    <ChevronDown
                      aria-hidden
                      className={cn("mt-1 size-5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180 text-primary")}
                    />
                  </button>

                  {isOpen ? (
                    <div id={`rutina-panel-${routine.id}`} className="space-y-5 border-t border-border px-4 pb-5 pt-4 sm:px-6">
                      {days.map((day) => {
                        const dayItems = routine.items.filter((i) => i.day === day);
                        return (
                          <div key={day} className="rounded-lg border border-border/70 bg-background/40 p-3 sm:p-4">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <h4 className="text-sm font-bold uppercase tracking-wide text-primary">Día {day}</h4>
                              <Button
                                size="sm"
                                className="min-h-11 sm:min-h-9"
                                disabled={startingKey !== null}
                                onClick={() => handleStartDay(routine, day)}
                              >
                                {startingKey === `${routine.id}:${day}` ? (
                                  <Loader2 aria-hidden className="animate-spin" />
                                ) : null}
                                Entrenar día {day}
                              </Button>
                            </div>
                            <ul className="space-y-2">
                              {dayItems.map((item) => (
                                <li
                                  key={item.id}
                                  className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                                >
                                  <span className="min-w-0 text-sm font-medium">{item.exerciseName}</span>
                                  <span className="shrink-0 text-xs text-muted-foreground">
                                    {item.sets}×{item.reps} · descanso {item.restSec}s
                                    {item.notes ? ` · ${item.notes}` : ""}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-11 text-destructive hover:text-destructive sm:min-h-9"
                          onClick={() => setDeleteTarget(routine)}
                        >
                          <Trash2 aria-hidden /> Eliminar rutina
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Generador IA ─────────────────────────────────────────────────── */}
      <GeneratorCard onGenerated={async (created) => { setOpenId(created.id); await onRefresh(); }} />

      {/* ── Confirmación de borrado ──────────────────────────────────────── */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => (deleting ? null : setDeleteTarget(null))}
        title="¿Eliminar esta rutina?"
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          Vas a eliminar <span className="font-medium text-foreground">{deleteTarget?.name}</span>. Tus sesiones ya
          completadas se conservan, pero ya no podrás entrenar sus días.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
            {deleting ? "Eliminando…" : "Sí, eliminar"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

/* ── Generador IA ─────────────────────────────────────────────────────────── */

const GOAL_OPTIONS = ["general", "hipertrofia", "fuerza", "perder-grasa", "resistencia"] as const;
const LEVEL_OPTIONS = ["principiante", "intermedio", "avanzado"] as const;
const EQUIPMENT_OPTIONS = ["gimnasio", "mancuernas", "casa", "peso-corporal"] as const;

function GeneratorCard({
  onGenerated,
}: {
  onGenerated: (created: RoutineDTO) => Promise<void>;
}) {
  const [goal, setGoal] = React.useState<string>("hipertrofia");
  const [level, setLevel] = React.useState<string>("principiante");
  const [days, setDays] = React.useState<string>("3");
  const [equipment, setEquipment] = React.useState<string>("gimnasio");
  const [generating, setGenerating] = React.useState(false);
  const [genError, setGenError] = React.useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setGenError(null);
    track("zona_generate_routine", { goal, level, daysPerWeek: Number(days), equipment });
    try {
      const created = await zonaApi<RoutineDTO>("/api/zona/routines/generate", {
        method: "POST",
        body: JSON.stringify({ goal, level, daysPerWeek: Number(days), equipment }),
      });
      toast({ title: "¡Rutina lista!", description: `«${created.name}» ya está en tu lista.` });
      await onGenerated(created);
    } catch (err) {
      // 502/503 del generador u otro error: mensaje del API + reintentar.
      setGenError(err instanceof Error ? err.message : "No pudimos generar la rutina. Intentá de nuevo.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card id="zona-generador" className="scroll-mt-24">
      <CardContent className="p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-primary/15">
            <Sparkles className="size-5 text-primary" />
          </span>
          <div>
            <h3 className="text-base font-semibold sm:text-lg">Generar con IA</h3>
            <p className="text-xs text-muted-foreground sm:text-sm">
              El entrenador IA arma tu rutina con los 100 ejercicios de la biblioteca.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="zona-gen-goal">Objetivo</Label>
            <Select id="zona-gen-goal" value={goal} onChange={(e) => setGoal(e.target.value)} className="h-11">
              {GOAL_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {GOAL_LABELS[g]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zona-gen-level">Nivel</Label>
            <Select id="zona-gen-level" value={level} onChange={(e) => setLevel(e.target.value)} className="h-11">
              {LEVEL_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zona-gen-days">Días por semana</Label>
            <Select id="zona-gen-days" value={days} onChange={(e) => setDays(e.target.value)} className="h-11">
              {[1, 2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={String(d)}>
                  {d} {d === 1 ? "día" : "días"}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zona-gen-equipment">Equipo</Label>
            <Select id="zona-gen-equipment" value={equipment} onChange={(e) => setEquipment(e.target.value)} className="h-11">
              {EQUIPMENT_OPTIONS.map((eq) => (
                <option key={eq} value={eq}>
                  {EQUIPMENT_LABELS[eq]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {genError ? (
          <div className="mt-4">
            <ErrorState message={genError} onRetry={() => void generate()} />
          </div>
        ) : null}

        {generating ? (
          <div role="status" aria-live="polite" className="mt-4 flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3">
            <Loader2 aria-hidden className="size-5 animate-spin text-primary" />
            <div>
              <p className="text-sm font-medium">Generando tu rutina con IA…</p>
              <p className="text-xs text-muted-foreground">Puede tardar hasta un minuto: se está diseñando ejercicio por ejercicio.</p>
            </div>
          </div>
        ) : (
          <Button size="lg" className="mt-4 w-full sm:w-auto" onClick={() => void generate()}>
            <Sparkles aria-hidden /> Generar rutina con IA
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
