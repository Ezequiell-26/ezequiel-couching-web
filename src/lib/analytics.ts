"use client";

/**
 * Analítica local: eventos en cola con persistencia en localStorage.
 * Sin dependencias externas ni red: si más adelante hay un endpoint de
 * recogida, solo hay que cambiar flush().
 */

export type AnalyticsEvent = {
  name: string;
  props?: Record<string, unknown>;
  ts: number;
};

const KEY = "ec_analytics_events";
const MAX = 500;

function safeParse(raw: string | null): AnalyticsEvent[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function track(name: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    const list = safeParse(window.localStorage.getItem(KEY));
    list.push({ name, props, ts: Date.now() });
    while (list.length > MAX) list.shift();
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* almacenamiento no disponible */
  }
}

export function getEvents(): AnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(KEY));
}

export function clearEvents(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
