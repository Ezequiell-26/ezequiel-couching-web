"use client";

/**
 * Registro diario del contador de calorías — persistencia 100% local
 * (localStorage). Sin cuentas ni servidor: borrar datos borra todo.
 */

export type DiaryEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  meal: "desayuno" | "almuerzo" | "cena" | "snack";
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type FoodDiaryData = {
  entries: DiaryEntry[];
  customFoods: { id: string; name: string; kcal: number; protein: number; carbs: number; fat: number }[];
};

const KEY = "ec_food_diary_v1";

export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function empty(): FoodDiaryData {
  return { entries: [], customFoods: [] };
}

export function loadDiary(): FoodDiaryData {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as FoodDiaryData;
    if (!Array.isArray(parsed.entries)) return empty();
    return { entries: parsed.entries, customFoods: parsed.customFoods ?? [] };
  } catch {
    return empty();
  }
}

export function saveDiary(data: FoodDiaryData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* almacenamiento no disponible */
  }
}

export function entriesForDate(data: FoodDiaryData, date: string): DiaryEntry[] {
  return data.entries.filter((e) => e.date === date);
}

export function dayTotals(entries: DiaryEntry[]): { kcal: number; protein: number; carbs: number; fat: number } {
  return entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
