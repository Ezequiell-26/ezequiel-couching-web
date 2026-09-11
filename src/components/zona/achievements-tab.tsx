"use client";

import * as React from "react";
import { Check, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AchievementDTO } from "./api";

/**
 * Tab Logros: grid de tarjetas. Desbloqueados con borde y fondo volt + check;
 * bloqueados atenuados con barra de progreso cuando el backend la informa.
 * Si nada está desbloqueado, mensaje honesto para arrancar.
 */
export function AchievementsTab({ achievements }: { achievements: AchievementDTO[] }) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-4">
      {unlockedCount === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-center text-sm text-muted-foreground">
          Empezá a entrenar para desbloquear logros: tu primera sesión, tu primer PR y varios más te esperan.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Logros desbloqueados: <span className="font-semibold text-primary">{unlockedCount}</span> de {achievements.length}
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Lista de logros">
        {achievements.map((a) => (
          <li
            key={a.id}
            className={cn(
              "flex gap-3 rounded-xl border p-4 transition-colors",
              a.unlocked ? "border-primary/60 bg-primary/10" : "border-border/70 bg-card opacity-75",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border",
                a.unlocked ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
              )}
            >
              {a.unlocked ? <Check className="size-5" /> : <Lock className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{a.title}</h3>
                {a.unlocked ? <Badge className="px-1.5 py-0 text-[10px]">Desbloqueado</Badge> : null}
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{a.desc}</p>
              {!a.unlocked && a.progress ? (
                <div className="mt-2.5">
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={a.progress.target}
                    aria-valuenow={Math.min(a.progress.current, a.progress.target)}
                    aria-label={`Progreso de ${a.title}: ${a.progress.current} de ${a.progress.target}`}
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${Math.min(Math.round((a.progress.current / a.progress.target) * 100), 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                    {a.progress.current} / {a.progress.target}
                  </p>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
