"use client";

/**
 * Perfil compartido entre calculadoras/contador (localStorage).
 * Lo rellena la calculadora de calorías y lo reutilizan el resto de
 * herramientas. 100% local, sin backend.
 */

export type CalcProfile = {
  sex: "hombre" | "mujer";
  age: number;
  heightCm: number;
  weightKg: number;
  activity: "sedentario" | "ligero" | "moderado" | "activo" | "muy_activo";
  goal: "perder" | "mantener" | "ganar";
  targetKcal?: number;
  updatedAt: number;
};

const KEY = "ec_calc_profile";

export function loadProfile(): CalcProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CalcProfile;
    if (!parsed || typeof parsed.weightKg !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveProfile(p: CalcProfile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...p, updatedAt: Date.now() }));
  } catch {
    /* almacenamiento no disponible */
  }
}
