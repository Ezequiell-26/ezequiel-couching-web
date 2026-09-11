"use client";

import * as React from "react";
import { ChevronDown, ClipboardList, Dumbbell, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/site/states";
import { cn } from "@/lib/utils";
import {
  ZonaUnauthorized,
  fmtInt,
  fmtKg,
  shortDate,
  zonaApi,
  type SessionDTO,
  type SessionDetailDTO,
  type SetDTO,
} from "./api";

/**
 * Tab Historial (Task 25-a, inspirado en LiftShift/iTrack): últimas 20 sesiones
 * con volumen/series/estado; cada card se expande y pide el detalle (series por
 * ejercicio) a GET /api/zona/sessions/[id], cacheado en un Map local para no
 * refetch. Sin datos demo: arranca vacío con estado honesto.
 */
export function HistoryTab({
  onGoToRoutines,
  onGoToTrain,
  onActionError,
}: {
  onGoToRoutines: () => void;
  onGoToTrain: () => void;
  onActionError: (err: unknown) => void;
}) {
  const [sessions, setSessions] = React.useState<SessionDTO[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [listError, setListError] = React.useState<string | null>(null);

  // Detalle cacheado por id de sesión; una card abierta a la vez.
  const [openId, setOpenId] = React.useState<number | null>(null);
  const [details, setDetails] = React.useState<Map<number, SessionDetailDTO>>(new Map());
  const [detailLoadingId, setDetailLoadingId] = React.useState<number | null>(null);
  const [detailError, setDetailError] = React.useState<{ id: number; message: string } | null>(null);

  // Carga inicial en la continuación de la promesa (nunca setState síncrono).
  React.useEffect(() => {
    let alive = true;
    fetchSessionList()
      .then((list) => {
        if (!alive) return;
        setSessions(list);
        setListError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof ZonaUnauthorized) {
          onActionError(err); // patrón de la casa: vuelve al AuthGate
          return;
        }
        setListError(err instanceof Error ? err.message : "No pudimos cargar tu historial.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // onActionError es estable (useCallback en zona-view): nunca re-dispara.
  }, [onActionError]);

  function retryList() {
    setLoading(true);
    setListError(null);
    fetchSessionList()
      .then((list) => {
        setSessions(list);
        setListError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof ZonaUnauthorized) {
          onActionError(err);
          return;
        }
        setListError(err instanceof Error ? err.message : "No pudimos cargar tu historial.");
      })
      .finally(() => setLoading(false));
  }

  async function loadDetail(session: SessionDTO) {
    setDetailLoadingId(session.id);
    setDetailError(null);
    try {
      const d = await zonaApi<SessionDetailDTO>(`/api/zona/sessions/${session.id}`);
      setDetails((prev) => new Map(prev).set(session.id, d));
    } catch (err) {
      if (err instanceof ZonaUnauthorized) {
        onActionError(err);
        return;
      }
      setDetailError({
        id: session.id,
        message: err instanceof Error ? err.message : "No pudimos cargar las series de esta sesión.",
      });
    } finally {
      setDetailLoadingId(null);
    }
  }

  function toggleExpand(session: SessionDTO) {
    if (openId === session.id) {
      setOpenId(null);
      return;
    }
    setOpenId(session.id);
    // Cache: solo refetch si nunca se cargó o si la sesión sigue activa
    // (puede haber sumado series desde la última visita).
    if (!details.has(session.id) || session.status === "activa") {
      void loadDetail(session);
    }
  }

  const totals = React.useMemo(() => {
    const list = sessions ?? [];
    return {
      count: list.length,
      volumeKg: list.reduce((acc, s) => acc + s.volumeKg, 0),
      sets: list.reduce((acc, s) => acc + s.setsCount, 0),
    };
  }, [sessions]);

  if (loading) {
    return <LoadingState label="Cargando tu historial…" className="min-h-[40vh]" />;
  }

  if (listError || sessions === null) {
    return (
      <ErrorState
        message={listError ?? "No pudimos cargar tu historial."}
        onRetry={retryList}
        className="min-h-[40vh]"
      />
    );
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="Todavía no tenés entrenamientos registrados"
        hint="Cuando termines una sesión en Entrenar, aparece acá con tu volumen, tus series y su detalle ejercicio por ejercicio."
        action={
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Button
              onClick={() => {
                onGoToTrain();
              }}
            >
              <Dumbbell aria-hidden /> Ir a Entrenar
            </Button>
            <Button variant="outline" onClick={onGoToRoutines}>
              <ClipboardList aria-hidden /> Ir a mis rutinas
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Resumen de lo mostrado ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3" aria-label="Resumen de tus últimas sesiones">
        <SummaryTile label="Sesiones" value={fmtInt(totals.count)} />
        <SummaryTile label="Volumen" value={`${fmtInt(totals.volumeKg)} kg`} />
        <SummaryTile label="Series" value={fmtInt(totals.sets)} />
      </div>
      {sessions.length >= 20 ? (
        <p className="text-xs text-muted-foreground">Mostrando las últimas 20 sesiones.</p>
      ) : null}

      {/* ── Lista de sesiones ──────────────────────────────────────────────── */}
      <ul className="space-y-4" aria-label="Historial de entrenamientos">
        {sessions.map((s) => {
          const isOpen = openId === s.id;
          const detail = details.get(s.id);
          return (
            <li key={s.id}>
              <Card>
                <button
                  type="button"
                  onClick={() => toggleExpand(s)}
                  aria-expanded={isOpen}
                  aria-controls={`historial-panel-${s.id}`}
                  className="flex w-full items-start justify-between gap-3 p-4 text-left sm:p-6"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold sm:text-lg">{s.title}</span>
                      {s.status === "activa" ? (
                        <Badge variant="default">
                          <span aria-hidden className="mr-1.5 inline-block size-2 rounded-full bg-primary-foreground" />
                          Activa
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Completada</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{formatSessionDate(s.startedAt)}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Totales de la sesión">
                      <Badge variant="outline">{fmtKg(s.volumeKg)} kg de volumen</Badge>
                      <Badge variant="outline">
                        {s.setsCount} {s.setsCount === 1 ? "serie" : "series"}
                      </Badge>
                      {s.routineName ? <Badge variant="outline">{s.routineName}</Badge> : null}
                    </div>
                  </div>
                  <ChevronDown
                    aria-hidden
                    className={cn("mt-1 size-5 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180 text-primary")}
                  />
                </button>

                {isOpen ? (
                  <div id={`historial-panel-${s.id}`} className="border-t border-border px-4 pb-5 pt-4 sm:px-6">
                    {detailLoadingId === s.id ? (
                      <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 aria-hidden className="size-4 animate-spin" /> Cargando series…
                      </p>
                    ) : detailError?.id === s.id ? (
                      <ErrorState message={detailError.message} onRetry={() => void loadDetail(s)} />
                    ) : detail ? (
                      <SessionSets detail={detail} />
                    ) : null}
                  </div>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── Series agrupadas por ejercicio ───────────────────────────────────────── */

function SessionSets({ detail }: { detail: SessionDetailDTO }) {
  const groups = React.useMemo(() => {
    const map = new Map<string, { name: string; sets: SetDTO[] }>();
    for (const s of detail.sets) {
      const g = map.get(s.exerciseId);
      if (g) g.sets.push(s);
      else map.set(s.exerciseId, { name: s.exerciseName, sets: [s] });
    }
    return [...map.values()];
  }, [detail]);

  if (groups.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-4 text-center text-sm text-muted-foreground">
        Esta sesión no tiene series registradas.
      </p>
    );
  }

  return (
    <ul className="space-y-3" aria-label={`Series de ${detail.title}`}>
      {groups.map((g) => (
        <li key={g.name} className="rounded-lg border border-border/70 bg-background/40 p-3 sm:p-4">
          <h4 className="mb-2 text-sm font-semibold">{g.name}</h4>
          <ul className="flex flex-wrap gap-2" aria-label={`Series de ${g.name}`}>
            {g.sets.map((set) => (
              <li
                key={set.id}
                className="flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs font-medium"
              >
                <span>{set.weightKg != null ? `${fmtKg(set.weightKg)} kg × ${set.reps}` : `${set.reps} reps`}</span>
                {set.rpe != null ? <span className="text-muted-foreground">· RPE {set.rpe}</span> : null}
                {set.isPR ? <Badge className="px-1.5 py-0 text-[10px]">PR</Badge> : null}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function fetchSessionList(): Promise<SessionDTO[]> {
  return zonaApi<SessionDTO[]>("/api/zona/sessions?status=todas&limit=20");
}

const timeFmt = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" });

/** "2026-03-12T22:45:00.000Z" → "12 mar · 22:45" (shortDate espera la fecha). */
function formatSessionDate(iso: string): string {
  const datePart = iso.slice(0, 10);
  const timePart = timeFmt.format(new Date(iso));
  return `${shortDate(datePart)} · ${timePart}`;
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-3 py-3 text-center sm:px-4">
      <p className="text-xs leading-snug text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums sm:text-xl">{value}</p>
    </div>
  );
}
