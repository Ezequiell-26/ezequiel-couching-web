/**
 * Fórmulas de nutrición con estándares publicados (reales, no simuladas):
 * - BMR: Mifflin-St Jeor (1990), Harris-Benedict revisado (Roza & Shizgal, 1984),
 *   Katch-McArdle (con % grasa conocida).
 * - TDEE: BMR × factor de actividad (estándares ASECP/USDA).
 * - IMC: OMS. % grasa: US Navy (Hodgdon & Beckett, 1984) y Deurenberg (1991).
 * - 1RM: Epley (1985) y Brzycki (1993). Agua: 30–35 ml/kg (EFSA aproximación).
 */

export type Sex = "hombre" | "mujer";
export type ActivityKey = "sedentario" | "ligero" | "moderado" | "activo" | "muy_activo";

export const ACTIVITY_FACTORS: Record<ActivityKey, { factor: number; label: string; hint: string }> = {
  sedentario: { factor: 1.2, label: "Sedentario", hint: "Oficina, poco movimiento" },
  ligero: { factor: 1.375, label: "Ligero", hint: "Ejercicio 1–3 días/semana" },
  moderado: { factor: 1.55, label: "Moderado", hint: "Ejercicio 3–5 días/semana" },
  activo: { factor: 1.725, label: "Activo", hint: "Ejercicio 6–7 días/semana" },
  muy_activo: { factor: 1.9, label: "Muy activo", hint: "Trabajo físico + entrenamiento" },
};

export function bmrMifflin(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "hombre" ? base + 5 : base - 161);
}

export function bmrHarrisBenedict(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return Math.round(
    sex === "hombre"
      ? 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age
      : 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age,
  );
}

export function bmrKatchMcArdle(weightKg: number, bodyFatPct: number): number {
  const lbm = weightKg * (1 - bodyFatPct / 100);
  return Math.round(370 + 21.6 * lbm);
}

export function tdee(bmr: number, activity: ActivityKey): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activity].factor);
}

export function imc(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function imcCategory(value: number): string {
  if (value < 18.5) return "Bajo peso";
  if (value < 25) return "Peso saludable";
  if (value < 30) return "Sobrepeso";
  if (value < 35) return "Obesidad grado I";
  if (value < 40) return "Obesidad grado II";
  return "Obesidad grado III";
}

/** US Navy (Hodgdon & Beckett, 1984). Circunferencias en cm. */
export function bodyFatNavy(
  sex: Sex,
  heightCm: number,
  neckCm: number,
  waistCm: number,
  hipCm?: number,
): number {
  if (sex === "hombre") {
    return (
      495 /
        (1.0324 -
          0.19077 * Math.log10(waistCm - neckCm) +
          0.15456 * Math.log10(heightCm)) -
      450
    );
  }
  if (!hipCm) return NaN;
  return (
    495 /
      (1.29579 -
        0.35004 * Math.log10(waistCm + hipCm - neckCm) +
        0.221 * Math.log10(heightCm)) -
    450
  );
}

/** Deurenberg et al. (1991): estimación desde IMC, edad y sexo. */
export function bodyFatDeurenberg(bmiValue: number, age: number, sex: Sex): number {
  return 1.2 * bmiValue + 0.23 * age - 10.8 * (sex === "hombre" ? 1 : 0) - 5.4;
}

/** 1RM: Epley y Brzycki. Devuelve kcal de las dos fórmulas + promedio. */
export function oneRepMax(weightKg: number, reps: number): {
  epley: number;
  brzycki: number;
  average: number;
} {
  if (reps <= 1) return { epley: weightKg, brzycki: weightKg, average: weightKg };
  const epley = weightKg * (1 + reps / 30);
  const brzycki = weightKg * (36 / (37 - reps));
  return {
    epley: Math.round(epley * 10) / 10,
    brzycki: Math.round(brzycki * 10) / 10,
    average: Math.round(((epley + brzycki) / 2) * 10) / 10,
  };
}

export function waterLiters(weightKg: number, activity: ActivityKey): number {
  const extra = { sedentario: 0, ligero: 0.35, moderado: 0.7, activo: 1.0, muy_activo: 1.3 }[
    activity
  ];
  return Math.round((weightKg * 0.033 + extra) * 10) / 10;
}

/** Peso ideal por rango de IMC saludable (18,5–24,9) — Devine como referencia. */
export function idealWeightRange(heightCm: number): { min: number; max: number } {
  const m = heightCm / 100;
  return { min: Math.round(18.5 * m * m), max: Math.round(24.9 * m * m) };
}

export function idealWeightDevine(sex: Sex, heightCm: number): number {
  const inchesOver5ft = Math.max(0, heightCm - 152.4) / 2.54;
  const base = sex === "hombre" ? 50 : 45.5;
  return Math.round((base + 2.3 * inchesOver5ft) * 10) / 10;
}

export type MacroGoal = "perder" | "mantener" | "ganar";

export function macroSplit(kcal: number, goal: MacroGoal, weightKg: number): {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbG: number;
} {
  const target = goal === "perder" ? kcal - 400 : goal === "ganar" ? kcal + 300 : kcal;
  const proteinPerKg = goal === "perder" ? 2.0 : goal === "ganar" ? 1.8 : 1.6;
  const proteinG = Math.round(weightKg * proteinPerKg);
  const fatG = Math.round((target * (goal === "perder" ? 0.27 : 0.25)) / 9);
  const carbG = Math.max(0, Math.round((target - proteinG * 4 - fatG * 9) / 4));
  return { kcal: Math.round(target), proteinG, fatG, carbG };
}

/** Base local de alimentos con kcal/macros por 100 g (valores estándar USDA). */
export type FoodItem = { id: string; name: string; kcal: number; protein: number; carbs: number; fat: number; per: number };

export const FOOD_DB: FoodItem[] = [
  { id: "pechuga-pollo", name: "Pechuga de pollo a la plancha", kcal: 165, protein: 31, carbs: 0, fat: 3.6, per: 100 },
  { id: "arroz-blanco", name: "Arroz blanco cocido", kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, per: 100 },
  { id: "huevo", name: "Huevo entero", kcal: 155, protein: 13, carbs: 1.1, fat: 11, per: 100 },
  { id: "avena", name: "Avena en copos (seca)", kcal: 389, protein: 17, carbs: 66, fat: 7, per: 100 },
  { id: "platano", name: "Plátano", kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, per: 100 },
  { id: "manzana", name: "Manzana", kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, per: 100 },
  { id: "lentejas", name: "Lentejas cocidas", kcal: 116, protein: 9, carbs: 20, fat: 0.4, per: 100 },
  { id: "salmon", name: "Salmón al horno", kcal: 208, protein: 20, carbs: 0, fat: 13, per: 100 },
  { id: "atun-lata", name: "Atún en lata al natural", kcal: 116, protein: 26, carbs: 0, fat: 1, per: 100 },
  { id: "yogur-natural", name: "Yogur natural", kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3, per: 100 },
  { id: "pan-integral", name: "Pan integral", kcal: 247, protein: 13, carbs: 41, fat: 3.4, per: 100 },
  { id: "pasta", name: "Pasta cocida", kcal: 158, protein: 5.8, carbs: 31, fat: 0.9, per: 100 },
  { id: "ternera", name: "Ternera magra a la plancha", kcal: 217, protein: 26, carbs: 0, fat: 12, per: 100 },
  { id: "merluza", name: "Merluza", kcal: 90, protein: 18, carbs: 0, fat: 1.6, per: 100 },
  { id: "patata", name: "Patata cocida", kcal: 87, protein: 2, carbs: 20, fat: 0.1, per: 100 },
  { id: "brocoli", name: "Brócoli cocido", kcal: 35, protein: 2.4, carbs: 7, fat: 0.4, per: 100 },
  { id: "aceite-oliva", name: "Aceite de oliva", kcal: 884, protein: 0, carbs: 0, fat: 100, per: 100 },
  { id: "almendras", name: "Almendras", kcal: 579, protein: 21, carbs: 22, fat: 50, per: 100 },
  { id: "queso-fresco", name: "Queso fresco batido 0%", kcal: 57, protein: 8, carbs: 4, fat: 0.5, per: 100 },
  { id: "batido-proteina", name: "Batido de proteína (solo polvo)", kcal: 380, protein: 78, carbs: 8, fat: 5, per: 100 },
];
