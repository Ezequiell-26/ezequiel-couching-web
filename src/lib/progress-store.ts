"use client";

/**
 * Registro de progreso — persistencia 100% local (localStorage).
 * Peso corporal + sesiones completadas. Sin datos de demostración: empieza vacío.
 */

export type WeightEntry = { date: string; kg: number };
export type SessionEntry = { id: string; date: string; title: string; exercises: number; volumeKg: number };

export type ProgressData = {
  weights: WeightEntry[];
  sessions: SessionEntry[];
};

const KEY = "ec_progress_v1";

function empty(): ProgressData {
  return { weights: [], sessions: [] };
}

export function loadProgress(): ProgressData {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as ProgressData;
    return {
      weights: Array.isArray(parsed.weights) ? parsed.weights : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    return empty();
  }
}

export function saveProgress(data: ProgressData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* almacenamiento no disponible */
  }
}
