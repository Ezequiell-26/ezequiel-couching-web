"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/site/states";
import { toast } from "@/components/ui/toaster";
import { track } from "@/lib/analytics";
import { EXERCISES, EXERCISE_GROUPS } from "@/lib/content/exercises";
import {
  EQUIPMENT_LABELS,
  GOAL_LABELS,
  LEVEL_LABELS,
  ZonaUnauthorized,
  zonaApi,
  type RoutineDTO,
  type RoutineItemPayload,
} from "./api";

/**
 * Creador/editor manual de rutinas (Task 26-b, inspirado en wger/My-Workouts):
 * dos modos sobre el mismo formulario — crear (POST /api/zona/routines) y
 * editar (PATCH /api/zona/routines/[id], precargado con la rutina actual).
 * Por cada día 1..daysPerWeek hay un builder con buscador de la biblioteca
 * (EXERCISES, filtro por nombre/músculos) y lista editable (series, reps,
 * descanso, quitar y reordenar). Sin notas: el campo existe en el API pero el
 * formulario manual no lo pide (queda para un futuro, documentado).
 */

/** Fila del builder: datos a guardar + nombre para mostrar. */
type DraftItem = {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: string;
  restSec: number;
};

const GOAL_OPTIONS = ["general", "hipertrofia", "fuerza", "perder-grasa", "resistencia"] as const;
const LEVEL_OPTIONS = ["principiante", "intermedio", "avanzado"] as const;
const EQUIPMENT_OPTIONS = ["gimnasio", "mancuernas", "casa", "peso-corporal"] as const;
const REST_OPTIONS = [30, 45, 60, 75, 90, 120, 180];
const MAX_RESULTS = 30;

const GROUP_LABELS = new Map(EXERCISE_GROUPS.map((g) => [g.id, g.label]));

function defaultItem(exerciseId: string, exerciseName: string): DraftItem {
  return { exerciseId, exerciseName, sets: 3, reps: "10", restSec: 90 };
}

/** Items precargados de una rutina existente, agrupados por día (1..daysPerWeek). */
function itemsFromRoutine(routine: RoutineDTO): DraftItem[][] {
  const byDay: DraftItem[][] = Array.from({ length: routine.daysPerWeek }, () => []);
  const sorted = [...routine.items].sort((a, b) => a.day - b.day || a.orderIdx - b.orderIdx);
  for (const it of sorted) {
    const bucket = byDay[it.day - 1];
    if (bucket) bucket.push({ exerciseId: it.exerciseId, exerciseName: it.exerciseName, sets: it.sets, reps: it.reps, restSec: it.restSec });
  }
  return byDay;
}

export function RoutineForm({
  open,
  routine,
  onClose,
  onSaved,
  onActionError,
}: {
  open: boolean;
  /** Presente y distinto de null → modo edición (PATCH). Null → crear (POST). */
  routine: RoutineDTO | null;
  onClose: () => void;
  onSaved: (saved: RoutineDTO) => Promise<void> | void;
  onActionError: (err: unknown) => void;
}) {
  const isEdit = routine !== null;

  const [name, setName] = React.useState(routine?.name ?? "");
  const [goal, setGoal] = React.useState(routine?.goal ?? "hipertrofia");
  const [level, setLevel] = React.useState(routine?.level ?? "principiante");
  const [equipment, setEquipment] = React.useState(routine?.equipment ?? "gimnasio");
  const [days, setDays] = React.useState(routine?.daysPerWeek ?? 3);
  const [dayItems, setDayItems] = React.useState<DraftItem[][]>(() =>
    routine ? itemsFromRoutine(routine) : Array.from({ length: 3 }, () => []),
  );
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const nameOk = name.trim().length >= 2;
  const daysOk = dayItems.slice(0, days).every((arr) => arr.length >= 1);
  const canSave = nameOk && daysOk && !saving;

  function setDaysCount(next: number) {
    // Al reducir se descartan los items de los días que salen del rango (así el
    // payload nunca manda items con day > daysPerWeek); al agrandar, días vacíos.
    setDayItems((prev) =>
      next > prev.length ? [...prev, ...Array.from({ length: next - prev.length }, () => [])] : prev.slice(0, next),
    );
    setDays(next);
  }

  function updateDay(dayIdx: number, next: DraftItem[]) {
    setDayItems((prev) => prev.map((arr, i) => (i === dayIdx ? next : arr)));
  }

  async function save() {
    if (!canSave) return;
    const items: RoutineItemPayload[] = [];
    dayItems.slice(0, days).forEach((arr, i) => {
      arr.forEach((it) => {
        items.push({
          day: i + 1,
          exerciseId: it.exerciseId,
          sets: it.sets,
          // reps es texto libre en el API (máx 12): si quedó vacío va el default.
          reps: it.reps.trim() || "10",
          restSec: it.restSec,
        });
      });
    });
    setSaving(true);
    setSaveError(null);
    try {
      const body = JSON.stringify({ name: name.trim(), goal, level, daysPerWeek: days, equipment, items });
      const saved =
        routine === null
          ? await zonaApi<RoutineDTO>("/api/zona/routines", { method: "POST", body })
          : await zonaApi<RoutineDTO>(`/api/zona/routines/${routine.id}`, { method: "PATCH", body });
      track(routine === null ? "zona_routine_create_manual" : "zona_routine_edit", {
        daysPerWeek: days,
        exercises: items.length,
      });
      toast({
        title: isEdit ? "Rutina actualizada" : "Rutina creada",
        description: `«${saved.name}» quedó guardada en tu lista.`,
      });
      await onSaved(saved);
    } catch (err) {
      if (err instanceof ZonaUnauthorized) {
        onActionError(err); // patrón de la casa: vuelve al AuthGate
        return;
      }
      // 400 (ids inválidos, day overflow, etc.): mensaje verbatim del API.
      setSaveError(err instanceof Error ? err.message : "No pudimos guardar la rutina. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => (saving ? null : onClose())}
      title={isEdit ? "Editar rutina" : "Crear rutina manualmente"}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="zona-rf-name">Nombre de la rutina</Label>
          <Input
            id="zona-rf-name"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="p. ej. Full Body 3 días"
            className="h-11"
          />
          {!nameOk ? <p className="text-xs text-muted-foreground">El nombre necesita al menos 2 caracteres.</p> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="zona-rf-goal">Objetivo</Label>
            <Select id="zona-rf-goal" className="h-11" value={goal} onChange={(e) => setGoal(e.target.value)}>
              {GOAL_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {GOAL_LABELS[g]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zona-rf-level">Nivel</Label>
            <Select id="zona-rf-level" className="h-11" value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVEL_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zona-rf-days">Días por semana</Label>
            <Select id="zona-rf-days" className="h-11" value={String(days)} onChange={(e) => setDaysCount(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((d) => (
                <option key={d} value={String(d)}>
                  {d} {d === 1 ? "día" : "días"}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zona-rf-equipment">Equipo</Label>
            <Select id="zona-rf-equipment" className="h-11" value={equipment} onChange={(e) => setEquipment(e.target.value)}>
              {EQUIPMENT_OPTIONS.map((eq) => (
                <option key={eq} value={eq}>
                  {EQUIPMENT_LABELS[eq]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          {dayItems.slice(0, days).map((items, dayIdx) => (
            <DayBuilder key={dayIdx} day={dayIdx + 1} items={items} onChange={(next) => updateDay(dayIdx, next)} />
          ))}
        </div>

        {!daysOk ? <p className="text-xs text-muted-foreground">Cada día necesita al menos un ejercicio.</p> : null}

        {saveError ? <ErrorState message={saveError} /> : null}

        <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <Button variant="ghost" className="min-h-11" disabled={saving} onClick={onClose}>
            Cancelar
          </Button>
          <Button className="min-h-11" disabled={!canSave} onClick={() => void save()}>
            {saving ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear rutina"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/* ── Builder de un día: buscador + lista editable ─────────────────────────── */

function DayBuilder({ day, items, onChange }: { day: number; items: DraftItem[]; onChange: (next: DraftItem[]) => void }) {
  const [query, setQuery] = React.useState("");

  // Mismo haystack que la biblioteca: nombre + músculos primarios y secundarios.
  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return EXERCISES.filter((e) => `${e.name} ${e.primaryMuscles.join(" ")} ${e.secondaryMuscles.join(" ")}`.toLowerCase().includes(q)).slice(
      0,
      MAX_RESULTS,
    );
  }, [query]);

  function add(exerciseId: string, exerciseName: string) {
    onChange([...items, defaultItem(exerciseId, exerciseName)]);
    setQuery("");
  }

  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function move(idx: number, dir: -1 | 1) {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(idx, 1);
    next.splice(nextIdx, 0, moved);
    onChange(next);
  }

  function patchItem(idx: number, patch: Partial<DraftItem>) {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  return (
    <section aria-label={`Día ${day}`} className="rounded-xl border border-border/70 bg-background/40 p-3">
      <h4 className="text-sm font-bold uppercase tracking-wide text-primary">Día {day}</h4>

      <div className="mt-2 space-y-1.5">
        <Label htmlFor={`zona-rf-search-${day}`} className="sr-only">
          Buscar ejercicios para el día {day}
        </Label>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`zona-rf-search-${day}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ejercicio por nombre o músculo…"
            className="h-11 pl-9"
            autoComplete="off"
          />
        </div>

        {query.trim() !== "" ? (
          results.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto rounded-lg border border-border bg-card" aria-label={`Resultados para el día ${day}`}>
              {results.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    onClick={() => add(ex.id, ex.name)}
                    className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
                  >
                    <span className="min-w-0 truncate font-medium">{ex.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{GROUP_LABELS.get(ex.group) ?? ex.group}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
              Sin resultados para «{query.trim()}». Probá con otra palabra.
            </p>
          )
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="mt-2 rounded-lg border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">
          Buscá arriba y tocá un ejercicio para agregarlo.
        </p>
      ) : (
        <ul className="mt-2 space-y-2" aria-label={`Ejercicios del día ${day}`}>
          {items.map((it, idx) => (
            <li key={`${it.exerciseId}-${idx}`} className="rounded-lg border border-border/70 bg-card p-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-medium">{it.exerciseName}</p>
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    aria-label={`Subir ${it.exerciseName}`}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp aria-hidden className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === items.length - 1}
                    aria-label={`Bajar ${it.exerciseName}`}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown aria-hidden className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    aria-label={`Quitar ${it.exerciseName} del día ${day}`}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`zona-rf-sets-${day}-${idx}`} className="sr-only">
                    Series de {it.exerciseName}
                  </Label>
                  <Input
                    id={`zona-rf-sets-${day}-${idx}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={10}
                    value={it.sets}
                    aria-label={`Series de ${it.exerciseName}`}
                    className="h-11"
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      patchItem(idx, { sets: Number.isFinite(n) ? Math.min(10, Math.max(1, Math.round(n))) : 1 });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`zona-rf-reps-${day}-${idx}`} className="sr-only">
                    Reps de {it.exerciseName}
                  </Label>
                  <Input
                    id={`zona-rf-reps-${day}-${idx}`}
                    value={it.reps}
                    maxLength={12}
                    placeholder="Reps"
                    aria-label={`Reps de ${it.exerciseName}`}
                    className="h-11"
                    onChange={(e) => patchItem(idx, { reps: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`zona-rf-rest-${day}-${idx}`} className="sr-only">
                    Descanso de {it.exerciseName}
                  </Label>
                  <Select
                    id={`zona-rf-rest-${day}-${idx}`}
                    className="h-11"
                    value={String(it.restSec)}
                    aria-label={`Descanso de ${it.exerciseName}`}
                    onChange={(e) => patchItem(idx, { restSec: Number(e.target.value) })}
                  >
                    {REST_OPTIONS.map((s) => (
                      <option key={s} value={String(s)}>
                        {s}s
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2 text-[11px] text-muted-foreground" aria-hidden>
        {items.length === 0 ? "Sin ejercicios todavía" : `${items.length} ${items.length === 1 ? "ejercicio" : "ejercicios"} · series / reps / descanso`}
      </p>
    </section>
  );
}
