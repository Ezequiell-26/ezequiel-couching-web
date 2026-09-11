"use client";

import { useCallback, useEffect, useState } from "react";

type AsyncState<T> = { status: "loading" | "error" | "ready"; data: T | null };

/**
 * Hook de carga de datos compatible con react-hooks/set-state-in-effect:
 * nunca llama a setState de forma síncrona dentro del effect (solo en las
 * continuaciones de la promesa). El estado inicial ya es "loading".
 */
export function useAsyncData<T>(fetcher: () => Promise<T>, deps: unknown[] = []): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading", data: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    fetcher()
      .then((data) => {
        if (alive) setState({ status: "ready", data });
      })
      .catch(() => {
        if (alive) setState({ status: "error", data: null });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
