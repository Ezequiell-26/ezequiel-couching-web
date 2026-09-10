"use client";

import { useEffect } from "react";

/**
 * Registro seguro del service worker (capa offline de la PWA).
 *
 * - SOLO se registra en producción (`NODE_ENV === "production"`): en
 *   desarrollo no hace nada, para no interferir con el hot-reload del
 *   dev server.
 * - Nunca rompe la app: cualquier error de registro se silencia.
 * - No renderiza nada visible (devuelve null).
 */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
