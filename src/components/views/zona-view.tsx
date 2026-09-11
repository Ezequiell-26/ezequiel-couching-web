"use client";

import * as React from "react";
import { ClipboardList, Dumbbell, History, Loader2, LogOut, Share2, Trophy, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { ErrorState, LoadingState, SuccessNote } from "@/components/site/states";
import { track } from "@/lib/analytics";
import { AuthGate } from "@/components/zona/auth-gate";
import { TodayWidget } from "@/components/zona/today-widget";
import { RoutinesTab } from "@/components/zona/routines-tab";
import { TrainEmpty, TrainTab } from "@/components/zona/train-tab";
import { ProgressTab } from "@/components/zona/progress-tab";
import { AchievementsTab } from "@/components/zona/achievements-tab";
import { HistoryTab } from "@/components/zona/history-tab";
import { WeatherCard } from "@/components/zona/weather-card";
import {
  ZonaUnauthorized,
  fmtInt,
  fmtKg,
  zonaApi,
  type AchievementDTO,
  type NewPRDTO,
  type ProgressDTO,
  type RoutineDTO,
  type SessionDTO,
  type ZonaProfile,
} from "@/components/zona/api";

/**
 * Mi Zona (#/mi-zona): área personal de entrenamiento. AuthGate con nombre+PIN
 * y cinco tabs (Rutinas · Entrenar · Progreso · Logros · Historial) sobre las
 * APIs reales /api/zona/*. Encima de las tabs, el widget Plan de hoy (Task 27-a)
 * resume la asignación del día. Arranca vacío: sin datos demo, estados vacíos honestos.
 */

type TabId = "rutinas" | "entrenar" | "progreso" | "logros" | "historial";
type FinishedResult = { session: SessionDTO; newPRs: NewPRDTO[] };

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "rutinas", label: "Rutinas", icon: ClipboardList },
  { id: "entrenar", label: "Entrenar", icon: Dumbbell },
  { id: "progreso", label: "Progreso", icon: TrendingUp },
  { id: "logros", label: "Logros", icon: Trophy },
  { id: "historial", label: "Historial", icon: History },
];

export function ZonaView() {
  const [phase, setPhase] = React.useState<"checking" | "anon" | "ready" | "error">("checking");
  const [checkError, setCheckError] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<ZonaProfile | null>(null);
  const [progress, setProgress] = React.useState<ProgressDTO | null>(null);
  const [routines, setRoutines] = React.useState<RoutineDTO[] | null>(null);
  const [achievements, setAchievements] = React.useState<AchievementDTO[] | null>(null);
  const [tab, setTab] = React.useState<TabId>("rutinas");
  const [finished, setFinished] = React.useState<FinishedResult | null>(null);

  /* ── Carga de datos ─────────────────────────────────────────────────────── */

  const loadData = React.useCallback(async () => {
    const [prog, routs, achs] = await Promise.all([
      zonaApi<ProgressDTO>("/api/zona/progress?weeks=8"),
      zonaApi<RoutineDTO[]>("/api/zona/routines"),
      zonaApi<AchievementDTO[]>("/api/zona/achievements"),
    ]);
    setProgress(prog);
    setRoutines(routs);
    setAchievements(achs);
    setLoadError(null);
  }, []);

  const bootstrap = React.useCallback(async () => {
    try {
      await loadData();
    } catch (err) {
      if (err instanceof ZonaUnauthorized) {
        setPhase("anon");
        setProfile(null);
        return;
      }
      setLoadError(err instanceof Error ? err.message : "No pudimos cargar tu zona.");
    }
  }, [loadData]);

  // Chequeo de sesión al montar (401 = sin sesión: AuthGate, no error) y carga
  // inicial de datos en la continuación de la promesa (nunca setState síncrono).
  React.useEffect(() => {
    let alive = true;
    zonaApi<ZonaProfile>("/api/zona/profile")
      .then((p) => {
        if (!alive) return;
        setProfile(p);
        setPhase("ready");
        return loadData().catch((loadErr: unknown) => {
          if (!alive) return;
          if (loadErr instanceof ZonaUnauthorized) {
            setPhase("anon");
            setProfile(null);
            return;
          }
          setLoadError(loadErr instanceof Error ? loadErr.message : "No pudimos cargar tu zona.");
        });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err instanceof ZonaUnauthorized) {
          setPhase("anon");
          return;
        }
        setCheckError(err instanceof Error ? err.message : "No pudimos conectar con el servidor.");
        setPhase("error");
      });
    return () => {
      alive = false;
    };
  }, [loadData]);

  const refreshProgress = React.useCallback(async () => {
    try {
      setProgress(await zonaApi<ProgressDTO>("/api/zona/progress?weeks=8"));
    } catch {
      /* reconciliación silenciosa: el próximo refresco lo corrige */
    }
  }, []);

  const refreshAchievements = React.useCallback(async () => {
    try {
      setAchievements(await zonaApi<AchievementDTO[]>("/api/zona/achievements"));
    } catch {
      /* idem */
    }
  }, []);

  const refreshRoutines = React.useCallback(async () => {
    try {
      setRoutines(await zonaApi<RoutineDTO[]>("/api/zona/routines"));
      await refreshAchievements(); // una rutina IA nueva puede desbloquear logro
    } catch {
      /* idem */
    }
  }, [refreshAchievements]);

  /* ── Auth ───────────────────────────────────────────────────────────────── */

  function handleAuthenticated(p: ZonaProfile) {
    setProfile(p);
    setPhase("ready");
    setTab("rutinas");
    setFinished(null);
    toast({ title: `¡Hola, ${p.name}!`, description: "Tu zona quedó lista: creá o generá tu primera rutina." });
    track("cta_click", { label: "zona-auth-ok" });
    // Carga inicial de datos tras autenticar (el effect de montaje ya corrió en anon).
    void bootstrap();
  }

  function resetToAnon(expiredMessage?: string) {
    setProfile(null);
    setProgress(null);
    setRoutines(null);
    setAchievements(null);
    setFinished(null);
    setPhase("anon");
    if (expiredMessage) toast({ title: "Sesión cerrada", description: expiredMessage });
  }

  const handleActionError = React.useCallback((err: unknown) => {
    if (err instanceof ZonaUnauthorized) {
      resetToAnon("Tu sesión expiró. Iniciá sesión de nuevo con tu nombre y PIN.");
      return;
    }
    toast({
      title: "Algo salió mal",
      description: err instanceof Error ? err.message : "Intentá de nuevo en un momento.",
      variant: "error",
    });
  }, []);

  async function logout() {
    try {
      await zonaApi("/api/zona/profile/logout", { method: "POST" });
    } catch {
      /* cerrar igual: sin cookie válida el AuthGate es lo correcto */
    }
    resetToAnon("Tus rutinas y progreso siguen guardados: volvé con tu nombre y PIN.");
  }

  /* ── Sesiones ───────────────────────────────────────────────────────────── */

  function patchProgress(updater: (p: ProgressDTO) => ProgressDTO) {
    setProgress((prev) => (prev ? updater(prev) : prev));
  }

  async function startFromRoutine(routine: RoutineDTO, day: number) {
    const res = await zonaApi<{ session: SessionDTO; resumed?: boolean }>("/api/zona/sessions", {
      method: "POST",
      body: JSON.stringify({ routineId: routine.id, day }),
    });
    track("zona_start_session", { source: "rutina", resumed: Boolean(res.resumed), day });
    setFinished(null);
    patchProgress((p) => ({ ...p, activeSession: res.session }));
    setTab("entrenar");
    toast({
      title: res.resumed ? "Retomamos tu sesión activa" : `Sesión iniciada: día ${day}`,
      description: res.resumed
        ? "Ya tenías una sesión en curso: seguimos donde la dejaste."
        : `${routine.name} · registrá tus series al terminar cada una.`,
    });
    void refreshProgress();
  }

  function handleSessionStarted(session: SessionDTO) {
    setFinished(null);
    patchProgress((p) => ({ ...p, activeSession: session }));
    void refreshProgress();
  }

  function handleFinished(result: FinishedResult) {
    patchProgress((p) => ({ ...p, activeSession: null }));
    setFinished(result);
    toast({
      title: "¡Entrenamiento completado!",
      description:
        result.newPRs.length > 0
          ? `${result.newPRs.length} ${result.newPRs.length === 1 ? "récord nuevo" : "récords nuevos"}. Bien ahí.`
          : "Tus series quedaron guardadas.",
    });
    void refreshProgress();
    void refreshAchievements();
  }

  function switchTab(next: TabId) {
    setTab(next);
    track("zona_tab", { tab: next });
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */

  if (phase === "checking") {
    return <LoadingState label="Abriendo tu zona…" className="min-h-[60vh]" />;
  }

  if (phase === "error") {
    return (
      <div className="min-h-[60vh] px-4 py-10">
        <ErrorState
          message={checkError ?? "No pudimos conectar con el servidor."}
          onRetry={() => {
            setCheckError(null);
            setPhase("checking");
          }}
        />
      </div>
    );
  }

  if (phase === "anon" || !profile) {
    return (
      <>
        <PageHeader
          eyebrow="Mi zona"
          title="Mi Zona de entrenamiento"
          description="Tus rutinas, tus entrenamientos y tu progreso en un solo lugar, protegidos con tu cuenta."
          breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Mi Zona" }]}
        />
        <Container className="py-8 sm:py-10">
          <AuthGate onAuthenticated={handleAuthenticated} />
        </Container>
      </>
    );
  }

  const dataReady = progress !== null && routines !== null && achievements !== null;

  return (
    <>
      <PageHeader
        eyebrow="Mi zona"
        title="Mi Zona de entrenamiento"
        description="Tus rutinas, tus entrenamientos y tu progreso en un solo lugar. Todo se guarda en tu cuenta, solo tus datos."
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Mi Zona" }]}
      />

      <Container className="space-y-6 py-8 sm:py-10">
        {/* Barra de perfil */}
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm text-muted-foreground">
            Hola, <span className="font-semibold text-foreground">{profile.name}</span>
          </p>
          <Button variant="ghost" size="sm" className="min-h-11 shrink-0 text-muted-foreground hover:text-foreground" onClick={() => void logout()}>
            <LogOut aria-hidden /> Cerrar sesión
          </Button>
        </div>

        {!dataReady ? (
          loadError ? (
            <ErrorState
              message={loadError}
              onRetry={() => {
                setLoadError(null); // vuelve al LoadingState mientras reintenta
                void bootstrap();
              }}
            />
          ) : (
            <LoadingState label="Cargando tus rutinas y tu progreso…" className="min-h-[40vh]" />
          )
        ) : (
          <>
            {/* Plan de hoy (Task 27-a): card compacto encima de las tabs. Puro
                montaje aditivo: el cambio de tab usa el switchTab existente. */}
            <TodayWidget
              onGoToTrain={() => switchTab("entrenar")}
              onGoToRoutines={() => switchTab("rutinas")}
              onActionError={handleActionError}
            />

            {/* Tabs principales */}
            <nav role="tablist" aria-label="Secciones de Mi Zona" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                const hasActiveSession = t.id === "entrenar" && progress?.activeSession != null;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => switchTab(t.id)}
                    className={`relative flex min-h-12 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors ${
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    } ${t.id === "historial" ? "col-span-2 sm:col-span-1" : ""}`}
                  >
                    <Icon className="size-4 shrink-0" />
                    {t.label}
                    {hasActiveSession ? (
                      <span aria-label="Tenés una sesión activa" className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background" />
                    ) : null}
                  </button>
                );
              })}
            </nav>

            <div role="tabpanel" aria-label={`Contenido de ${TABS.find((t) => t.id === tab)?.label}`}>
              {tab === "rutinas" ? (
                <div className="space-y-6">
                  <WeatherCard />
                  <RoutinesTab routines={routines!} onRefresh={refreshRoutines} onStartDay={startFromRoutine} onActionError={handleActionError} />
                </div>
              ) : null}

              {tab === "entrenar" ? (
                progress?.activeSession ? (
                  <TrainTab
                    key={progress.activeSession.id}
                    session={progress.activeSession}
                    routines={routines!}
                    onFinished={handleFinished}
                    onActionError={handleActionError}
                  />
                ) : finished ? (
                  <FinishSuccess result={finished} onGoProgress={() => { setFinished(null); switchTab("progreso"); }} onGoRoutines={() => { setFinished(null); switchTab("rutinas"); }} onClose={() => setFinished(null)} />
                ) : (
                  <TrainEmpty onStarted={handleSessionStarted} onGoToRoutines={() => switchTab("rutinas")} onActionError={handleActionError} />
                )
              ) : null}

              {tab === "progreso" ? (
                <ProgressTab progress={progress!} patch={patchProgress} refresh={refreshProgress} onActionError={handleActionError} />
              ) : null}

              {tab === "logros" ? <AchievementsTab achievements={achievements!} /> : null}

              {tab === "historial" ? (
                <HistoryTab
                  onGoToRoutines={() => switchTab("rutinas")}
                  onGoToTrain={() => switchTab("entrenar")}
                  onActionError={handleActionError}
                />
              ) : null}
            </div>
          </>
        )}
      </Container>
    </>
  );
}

/* ── Pantalla de éxito tras finalizar ─────────────────────────────────────── */

function FinishSuccess({
  result,
  onGoProgress,
  onGoRoutines,
  onClose,
}: {
  result: FinishedResult;
  onGoProgress: () => void;
  onGoRoutines: () => void;
  onClose: () => void;
}) {
  const { session, newPRs } = result;
  const minutes = session.finishedAt
    ? Math.max(1, Math.round((new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime()) / 60000))
    : null;

  // Task 34: "Compartir resumen" renderiza la tarjeta como PNG (html-to-image,
  // MIT, import dinámico para no pesar el bundle) y la descarga.
  const shareRef = React.useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = React.useState(false);

  async function share() {
    const node = shareRef.current;
    if (!node || sharing) return;
    setSharing(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: "#071012" });
      const slug =
        session.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "entrenamiento";
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `fitsync-${slug}-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      toast({ title: "Imagen descargada", description: "Tu resumen quedó listo para compartir." });
      track("zona_share_session", { prs: newPRs.length });
    } catch {
      toast({
        title: "No pudimos generar la imagen",
        description: "Probá de nuevo en un momento.",
        variant: "error",
      });
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="space-y-6">
      <SuccessNote message="¡Entrenamiento completado! Tus series quedaron guardadas en tu progreso." />

      <div ref={shareRef}>
      <Card>
        <CardContent className="p-4 sm:p-6">
          <h2 className="text-lg font-bold">{session.title}</h2>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center" aria-label="Resumen del entrenamiento">
            <div className="rounded-lg border border-border/70 bg-background/40 px-2 py-3">
              <p className="text-lg font-bold text-primary sm:text-xl">{fmtInt(session.volumeKg)}</p>
              <p className="text-xs text-muted-foreground">kg de volumen</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/40 px-2 py-3">
              <p className="text-lg font-bold text-primary sm:text-xl">{session.setsCount}</p>
              <p className="text-xs text-muted-foreground">{session.setsCount === 1 ? "serie" : "series"}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background/40 px-2 py-3">
              <p className="text-lg font-bold text-primary sm:text-xl">{minutes != null ? `${minutes} min` : "—"}</p>
              <p className="text-xs text-muted-foreground">de duración</p>
            </div>
          </div>

          <h3 className="mb-3 mt-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Récords de esta sesión</h3>
          {newPRs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-4 text-center text-sm text-muted-foreground">
              Sin PRs esta vez. Cada serie con peso cuenta: la próxima podés superarte.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {newPRs.map((pr) => (
                <li key={pr.exerciseId} className="rounded-xl border border-primary/60 bg-primary/10 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Trophy aria-hidden className="size-4 text-primary" />
                    {pr.exerciseName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {fmtKg(pr.weightKg)} kg × {pr.reps} reps · <span className="font-semibold text-foreground">e1RM {fmtKg(pr.e1rm)} kg</span>
                  </p>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-5 border-t border-border/60 pt-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            FITSYNC · Training System
          </p>
        </CardContent>
      </Card>
      </div>

      <div className="flex justify-center">
        <Button variant="outline" onClick={() => void share()} disabled={sharing}>
          {sharing ? <Loader2 aria-hidden className="animate-spin" /> : <Share2 aria-hidden />}
          {sharing ? "Generando imagen…" : "Compartir resumen"}
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button size="lg" onClick={onGoProgress}>
          <TrendingUp aria-hidden /> Ver mi progreso
        </Button>
        <Button variant="outline" size="lg" onClick={onGoRoutines}>
          <ClipboardList aria-hidden /> Ir a mis rutinas
        </Button>
      </div>
      <div className="text-center">
        <Button variant="ghost" onClick={onClose}>
          Quedarme aquí
        </Button>
      </div>
    </div>
  );
}
