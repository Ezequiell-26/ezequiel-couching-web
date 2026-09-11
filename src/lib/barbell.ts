/**
 * Utilidades puras de gimnasio para las Calculadoras (sin dependencias, sin I/O):
 * - Armado de barra con discos: platesFor() — greedy del disco más pesado al más
 *   liviano, como se carga una barra real (cada disco elegido va a ambos lados).
 * - Redondeo a discos: roundToPlate() — para la tabla de cargas de trabajo del 1RM.
 * - VO2máx por test de Cooper (1968) + tabla de clasificación por sexo y edad.
 *
 * Todas las fórmulas y tablas citan fuente. Verificación aritmética con bun -e
 * documentada en worklog.md (Task 36-a).
 */

import type { Sex } from "./nutrition";

/** Redondeo a centésimas para evitar artefactos de float (0.1 + 0.2). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Discos por lado para alcanzar `targetKg` sobre una barra de `barKg`.
 *
 * Algoritmo greedy del disco MÁS PESADO al MÁS LIVIANO (así funciona un set real
 * de gimnasio: primero los grandes). `available` es la lista de pesos de disco
 * disponibles (p. ej. [25, 20, 15, 10, 5, 2.5, 1.25]); de cada peso se asume que
 * hay al menos un par (un disco por lado), y se pueden usar varios pares.
 *
 * Cada disco agregado a `side` va a AMBOS lados: se carga 2 × disco en total.
 * - side: discos por lado, de mayor a menor (p. ej. [25, 10, 2.5]).
 * - leftover: kg que NO se pudieron armar POR LADO con el set marcado
 *   (0 ideal; el total que falta en la barra es 2 × leftover).
 * - error: mensaje es-AR si el objetivo no alcanza a la barra; null si hay cálculo.
 */
export function platesFor(
  targetKg: number,
  barKg: number,
  available: number[],
): { side: number[]; leftover: number; error: string | null } {
  if (!Number.isFinite(targetKg) || !Number.isFinite(barKg)) {
    return { side: [], leftover: 0, error: "Ingresá valores numéricos válidos." };
  }
  const toLoad = round2(targetKg - barKg);
  if (toLoad <= 0) {
    return { side: [], leftover: 0, error: "El peso objetivo es menor o igual que la barra." };
  }
  const perSide = round2(toLoad / 2);
  const plates = [...new Set(available.filter((p) => Number.isFinite(p) && p > 0))].sort(
    (a, b) => b - a,
  );

  const side: number[] = [];
  let acc = 0; // kg ya cargados por lado
  for (const p of plates) {
    while (round2(acc + p) <= perSide + 1e-9) {
      side.push(p);
      acc = round2(acc + p);
    }
  }
  return { side, leftover: round2(perSide - acc), error: null };
}

/**
 * Redondea kg al múltiplo de `plateKg` (por defecto 2,5) MÁS CERCANO: devuelve
 * cargas que se pueden armar con discos estándar. Empates (a 1,25 kg justo entre
 * dos múltiplos) redondean hacia arriba, como Math.round.
 */
export function roundToPlate(kg: number, plateKg = 2.5): number {
  if (!Number.isFinite(kg)) return kg;
  return round2(Math.round(kg / plateKg) * plateKg);
}

/**
 * Test de Cooper (1968): distancia recorrida a pie en 12 minutos → VO2máx.
 * Fórmula citada: VO2máx = (distancia_m − 504,9) / 44,73 ml/kg/min.
 * Fuente: Cooper, K.H. "A Means of Assessing Maximal Oxygen Intake: Correlation
 * Between Field and Treadmill Testing", JAMA 1968;203(3):203 (referencia
 * verificada también en en.wikipedia.org/wiki/VO2_max, consulta 2026-09-11).
 * Sanity check: 2800 m → (2800 − 504,9) / 44,73 = 51,31 ≈ 51,3 ml/kg/min.
 */
export function vo2Cooper(distanceM: number): number {
  return (distanceM - 504.9) / 44.73;
}

/**
 * Tabla de clasificación del test de Cooper: distancia (m) en 12 min por sexo y
 * edad → banda. VERIFICADA el 2026-09-11 contra TRES fuentes independientes con
 * la tabla completa hombres/mujeres por edad:
 *  1) palabraderunner.com/test-de-cooper
 *  2) planetatriatlon.com/test-cooper-calcular-vo2max
 *  3) corredorespopulares.es/cooper.php
 * Además, blog.institutoisaf.es/test-de-cooper describe con texto los extremos
 * ("más de 2,8 km → Excelente" para hombre <30; "menos de 1,5 km → Muy Mala"
 * para mujer <30), consistente con las tres tablas.
 *
 * Columnas: <30, 30–39, 40–49, 50–59 años. Cada celda son los umbrales en metros:
 * [muy mala <, mala <, regular <, buena hasta (inclusive)]; "más de" el último → banda superior.
 * Discrepancias entre fuentes (se tomó la mayoría y se deja asentado):
 *  - Hombres 30–39, borde Mala/Regular: 1900 m (palabraderunner + corredorespopulares)
 *    vs 2000 m (planetatriatlon). Se usa 1900.
 *  - Mujeres 30–39, borde Regular/Buena: 2000 m (palabraderunner + planetatriatlon)
 *    vs 2200 m (corredorespopulares). Se usa 2000.
 *  - Hombres 50–59: 1300/1600/2000/2400 (palabraderunner + corredorespopulares)
 *    vs 1300/1500/1900/2400 (planetatriatlon). Se usa el primero (2/3).
 *  - Mujeres 50–59: 1100/1400/1700/2200 (palabraderunner + corredorespopulares)
 *    vs 1100/1400/1700/2100 (planetatriatlon). Se usa el primero (2/3).
 * Banda 60+ (solo planetatriatlon: H 1100/1400/1700/2000; M 900/1200/1500/1700):
 * aparece en UNA sola fuente → NO se usa; cooperCategory() devuelve null y la UI
 * muestra solo el valor con nota para comparar con tablas publicadas.
 * Etiquetas: las fuentes nombran la banda superior "Excelente" (planetatriatlon,
 * corredorespopulares "EXCEL." e institutoisaf en texto) y la inferior "Muy mala"
 * (palabraderunner y planetatriatlon "Muy Mala"). Ninguna fuente usa "Excelente"
 * y "Muy buena" como bandas separadas.
 */
const COOPER_BANDS: Record<Sex, number[][]> = {
  hombre: [
    [1600, 2200, 2400, 2800], // <30 — consenso 3/3 fuentes
    [1500, 1900, 2300, 2700], // 30–39 — borde Mala/Regular por mayoría (2/3)
    [1400, 1700, 2100, 2500], // 40–49 — consenso 3/3 fuentes
    [1300, 1600, 2000, 2400], // 50–59 — por mayoría (2/3)
  ],
  mujer: [
    [1500, 1800, 2200, 2700], // <30 — consenso 3/3 fuentes
    [1400, 1700, 2000, 2500], // 30–39 — borde Regular/Buena por mayoría (2/3)
    [1200, 1500, 1900, 2300], // 40–49 — consenso 3/3 fuentes
    [1100, 1400, 1700, 2200], // 50–59 — por mayoría (2/3)
  ],
};

export type CooperCategory = {
  label: "Excelente" | "Buena" | "Regular" | "Mala" | "Muy mala";
  /** Rango de distancia en metros que define la banda (0 = "menos de", null = "más de"). */
  from: number;
  to: number | null;
  /** Etiqueta de la columna de edad, p. ej. "menos de 30 años". */
  band: string;
};

/**
 * Banda de Cooper para una distancia, sexo y edad. Devuelve null si la edad cae
 * en la banda 60+, no verificable en dos fuentes independientes (ver arriba).
 */
export function cooperCategory(distanceM: number, sex: Sex, age: number): CooperCategory | null {
  if (!Number.isFinite(distanceM) || !Number.isFinite(age) || age >= 60) return null;
  const col = age < 30 ? 0 : age < 40 ? 1 : age < 50 ? 2 : 3;
  const [t1, t2, t3, t4] = COOPER_BANDS[sex][col];
  const band = ["menos de 30 años", "30 a 39 años", "40 a 49 años", "50 a 59 años"][col];
  if (distanceM < t1) return { label: "Muy mala", from: 0, to: t1, band };
  if (distanceM < t2) return { label: "Mala", from: t1, to: t2, band };
  if (distanceM < t3) return { label: "Regular", from: t2, to: t3, band };
  if (distanceM <= t4) return { label: "Buena", from: t3, to: t4, band };
  return { label: "Excelente", from: t4, to: null, band };
}
