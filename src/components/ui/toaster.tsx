"use client";

import * as React from "react";
import { X } from "lucide-react";

/** Toast minimalista basado en eventos personalizados (sin dependencias). */

export type ToastData = { title: string; description?: string; variant?: "ok" | "error" };

const EVENT = "ec-toast";

export function toast(t: ToastData) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastData>(EVENT, { detail: t }));
}

export function Toaster() {
  const [items, setItems] = React.useState<(ToastData & { id: number })[]>([]);

  React.useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastData>).detail;
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev.slice(-2), { ...detail, id }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }, 4500);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  if (items.length === 0) return null;

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 z-[90] w-full max-w-sm -translate-x-1/2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto mb-2 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-xl backdrop-blur ${
            t.variant === "error"
              ? "border-destructive/50 bg-destructive/15 text-foreground"
              : "border-primary/40 bg-card/95"
          }`}
        >
          <div className="flex-1">
            <p className="font-medium">{t.title}</p>
            {t.description ? <p className="mt-0.5 text-muted-foreground">{t.description}</p> : null}
          </div>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => setItems((prev) => prev.filter((i) => i.id !== t.id))}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
