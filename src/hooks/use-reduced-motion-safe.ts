"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: (matches: boolean) => void): () => void {
  const mql = window.matchMedia(QUERY);
  const update = () => onChange(mql.matches);
  update();
  mql.addEventListener("change", update);
  return () => mql.removeEventListener("change", update);
}

/**
 * Valor crudo de la media query prefers-reduced-motion.
 * Devuelve `null` mientras la preferencia es desconocida (SSR y primer render
 * antes del efecto) y `true`/`false` una vez montado, con suscripción a cambios.
 * Úsalo solo si necesitás distinguir "aún no sé" de "no prefiere reducir".
 */
export function useReducedMotionRaw(): boolean | null {
  const [reduce, setReduce] = useState<boolean | null>(null);
  useEffect(() => subscribeReducedMotion(setReduce), []);
  return reduce;
}

/**
 * Reemplazo hydration-safe de useReducedMotion() de framer-motion.
 *
 * Por qué existe: la v12 de framer-motion lee window.matchMedia de forma
 * síncrona en el PRIMER render cliente, mientras que en el servidor devuelve
 * `null`/false → el HTML del SSR no coincide con el primer render cliente
 * ("Hydration failed ... server rendered HTML didn't match") y React regenera
 * el árbol completo.
 *
 * Contrato: SIEMPRE devuelve boolean.
 * - Estado inicial `false` idéntico en servidor y primer render cliente → HTML estable.
 * - En useEffect lee la preferencia real (matchMedia) y se suscribe a "change"
 *   con cleanup, sincronizando el estado solo si difiere.
 *
 * Coste aceptado: los usuarios con reduced-motion reciben el valor real un
 * frame después del montaje (efecto post-hidratación, sin flash visible: todas
 * las ramas `initial` del shell comparten opacity: 0).
 */
export function useReducedMotionSafe(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => subscribeReducedMotion(setReduce), []);
  return reduce;
}
