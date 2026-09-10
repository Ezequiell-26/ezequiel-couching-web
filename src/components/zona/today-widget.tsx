"use client";

import * as React from "react";
import { CalendarDays, CalendarPlus, Dumbbell, Moon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/site/states";
import { track } from "@/lib/analytics";
import { ZonaUnauthorized, zonaApi, type ScheduleSlotDTO } from "./api";

/**
 * Widget "Plan de hoy" (Task 27-a): card compacto al inicio de Mi Zona, encima
 * de las tabs. Lee GET /api/zona/schedule (array fijo de 7 slots) y muestra la
 * asignación del día en curso con CTA a Entrenar; si hoy no toca entrenar pero
 * el plan existe, "Hoy: descanso" con acceso al plan semanal; si no hay ningún
 * slot configurado, estado vacío con CTA a Rutinas. El cambio de tab va SOLO
 * por callbacks de zona-view (switchTab existente): sin estado global nuevo.
 *
 * Hidratación: el día "hoy" se calcula SOLO dentro de la continuación del
 * fetch (o del retry que la re-ejecuta) — nunca en el render ni síncrono en
 * el cuerpo del effect.
 */

/** Etiquetas indexadas por el weekday del backend: 0=Lunes .. 6=Domingo. */
const WEEKDAY_LABELS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

/**
 * Hoy como índice del contrato del API (0=Lunes..6=Domingo). Date.getDay()
 * devuelve 0=Domingo..6=Sábado, así que (getDay()+6)%7 convierte 1:1 al
 * mapping del backend (schedule/route.ts: "0 (lunes) a 6 (domingo)").
 * Llamar SOLO desde continuaciones de promesas o event handlers.
 */
function todayWeekdayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

export function TodayWidget({
  onGoToTrain,
  onGoToRoutines,
  onActionError,
}: {
  /** CTA principal: cambia a la tab Entrenar (switchTab de zona-view). */
  onGoToTrain: () => void;
  /** CTA secundario / empty: cambia a la tab Rutinas (switchTab de zona-view). */
  onGoToRoutines: () => void;
  /** Patrón de la casa (Task 25-e): 401 → AuthGate vía handleActionError. */
  onActionError: (err: unknown) => void;
}) {
  const [slots, setSlots] = React.useState<ScheduleSlotDTO[] | null>(null);
  /** Índice 0=Lunes..6=Domingo del día en curso; null hasta que responde el fetch. */
  const [todayWeekday, setTodayWeekday] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Id incremental: si un retry se superpone con una respuesta anterior, la
  // obsoleta se descarta (mismo objetivo que el flag "alive" de la casa, pero
  // cubre también los reintentos por event handler).
  const reqIdRef = React.useRef(0);

  // Arranca el fetch SIN setState síncrono: todo estado se setea en las
  // continuaciones (.then/.catch/.finally) o en handlers.
  const loadSchedule = React.useCallback(() => {
    const reqId = ++reqIdRef.current;
    return zonaApi<ScheduleSlotDTO[]>("/api/zona/schedule")
      .then((data) => {
        if (reqIdRef.current !== reqId) return;
        setSlots(data);
        setTodayWeekday(todayWeekdayIndex()); // "hoy" se recalcula en cada carga
        setError(null);
      })
      .catch((err: unknown) => {
        if (reqIdRef.current !== reqId) return;
        if (err instanceof ZonaUnauthorized) {
          onActionError(err); // patrón de la casa: vuelve al AuthGate
          return;
        }
        setError(err instanceof Error ? err.message : "No pudimos cargar tu plan de hoy.");
      })
      .finally(() => {
        if (reqIdRef.current === reqId) setLoading(false);
      });
  }, [onActionError]);

  // Carga inicial en la continuación de la promesa: nunca setState síncrono
  // en el cuerpo del effect (react-hooks/set-state-in-effect).
  React.useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  function retry() {
    setError(null);
    setLoading(true); // handler: síncrono permitido; el weekday se recalcula en la continuación
    void loadSchedule();
  }

  function goTrain() {
    track("cta_click", { label: "zona-plan-hoy-entrenar" });
    onGoToTrain();
  }

  function goPlan() {
    track("cta_click", { label: "zona-plan-hoy-ver-semana" });
    onGoToRoutines();
  }

  function goArmar() {
    track("cta_click", { label: "zona-plan-hoy-armar" });
    onGoToRoutines();
  }

  // Derivados del render: puros, sin new Date() (el día vino en estado).
  const todaySlot =
    slots && todayWeekday != null
      ? (slots.find((s) => s.weekday === todayWeekday) ?? null)
      : null;
  const planHasSlots = slots?.some((s) => s.routineId != null) ?? false;
  const assigned = todaySlot?.routineId != null;
  const weekdayLabel = todayWeekday != null ? WEEKDAY_LABELS[todayWeekday] : "";

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        {loading ? (
          <div role="status" aria-live="polite" aria-label="Cargando tu plan de hoy" className="flex flex-wrap items-center gap-x-3 gap-y-3">
            <Skeleton className="size-9 shrink-0 rounded-full motion-reduce:animate-none" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-32 max-w-full motion-reduce:animate-none" />
              <Skeleton className="h-5 w-48 max-w-full motion-reduce:animate-none" />
            </div>
            <Skeleton className="h-11 w-full shrink-0 motion-reduce:animate-none sm:w-44" />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : assigned && todaySlot ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <CalendarDays className="size-5 text-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Plan de hoy · {weekdayLabel}
              </p>
              <div className="mt-0.5 flex min-w-0 items-center gap-2">
                <p className="truncate text-base font-bold leading-tight sm:text-lg">{todaySlot.routineTitle ?? "Tu rutina"}</p>
                {todaySlot.day != null ? (
                  <span className="shrink-0 rounded-full border border-primary/50 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold">
                    Día {todaySlot.day}
                  </span>
                ) : null}
              </div>
            </div>
            <Button className="min-h-11 w-full shrink-0 sm:w-auto" onClick={goTrain} aria-label={`Entrenar ahora: ${todaySlot.routineTitle ?? "tu rutina"}${todaySlot.day != null ? `, día ${todaySlot.day}` : ""}`}>
              <Dumbbell aria-hidden /> Entrenar ahora
            </Button>
          </div>
        ) : planHasSlots ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <Moon className="size-5 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1" role="status">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Plan de hoy · {weekdayLabel}
              </p>
              <p className="mt-0.5 text-base font-bold leading-tight sm:text-lg">Hoy: descanso</p>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">Tu plan no asigna entrenamiento para hoy. Descansá bien.</p>
            </div>
            <Button variant="outline" className="min-h-11 w-full shrink-0 sm:w-auto" onClick={goPlan}>
              <CalendarDays aria-hidden /> Ver plan semanal
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <CalendarPlus className="size-5 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1" role="status">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Plan de hoy</p>
              <p className="mt-0.5 text-base font-bold leading-tight sm:text-lg">Todavía no armaste tu plan semanal</p>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">Asigná rutinas a tus días y acá te mostramos qué toca hoy.</p>
            </div>
            <Button className="min-h-11 w-full shrink-0 sm:w-auto" onClick={goArmar}>
              <CalendarPlus aria-hidden /> Armar mi plan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
