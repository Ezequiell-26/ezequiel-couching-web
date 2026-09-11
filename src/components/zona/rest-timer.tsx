"use client";

import * as React from "react";
import { Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Temporizador de descanso (Task 25-a, inspirado en Workout.cool): chip compacto
 * y no bloqueante con countdown mm:ss, ajuste ±15s (clamp 15–300), botón Saltar
 * y cierre. Componente AISLADO: es el único que se re-renderiza cada segundo
 * (mismo patrón que SessionTimer en train-tab). Los setState ocurren solo en
 * continuaciones (callbacks del interval/timeout), nunca en el cuerpo del effect.
 */
export function RestTimer({
  initialSeconds,
  onClose,
}: {
  initialSeconds: number;
  onClose: () => void;
}) {
  const [remaining, setRemaining] = React.useState(initialSeconds);
  const [done, setDone] = React.useState(false);
  const remainingRef = React.useRef(initialSeconds);
  // Ref del callback: el interval no se reinicia si el padre re-renderiza.
  const onCloseRef = React.useRef(onClose);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    let hideTimeout = 0;
    const id = window.setInterval(() => {
      const next = remainingRef.current - 1;
      remainingRef.current = next;
      if (next <= 0) {
        window.clearInterval(id);
        setRemaining(0);
        setDone(true);
        // "Descanso terminado" queda anunciado unos segundos y la barra sola.
        hideTimeout = window.setTimeout(() => onCloseRef.current(), 5000);
      } else {
        setRemaining(next);
      }
    }, 1000);
    return () => {
      window.clearInterval(id);
      if (hideTimeout) window.clearTimeout(hideTimeout);
    };
  }, []);

  function adjust(delta: number) {
    const next = Math.min(300, Math.max(15, remainingRef.current + delta));
    remainingRef.current = next;
    setRemaining(next);
  }

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const text = `${m}:${String(s).padStart(2, "0")}`;

  return (
    <div
      role="timer"
      aria-label="Temporizador de descanso"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-primary/50 bg-card/95 px-4 py-3 shadow-lg backdrop-blur"
    >
      {/* Región viva persistente: anuncia solo el cambio a "terminado",
          nunca cada segundo del countdown. */}
      <span className="sr-only" aria-live="polite">
        {done ? "Descanso terminado" : ""}
      </span>

      <Timer aria-hidden className="size-5 shrink-0 text-primary" />
      <div className="mr-auto min-w-16">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {done ? "Listo" : "Descanso"}
        </p>
        <p className="text-xl font-bold leading-none tabular-nums">
          {done ? "Descanso terminado" : text}
        </p>
      </div>

      {!done ? (
        <>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 px-3 sm:min-h-9"
            aria-label="Restar 15 segundos al descanso"
            onClick={() => adjust(-15)}
          >
            −15s
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 px-3 sm:min-h-9"
            aria-label="Sumar 15 segundos al descanso"
            onClick={() => adjust(15)}
          >
            +15s
          </Button>
          <Button
            size="sm"
            className="min-h-11 px-3 sm:min-h-9"
            onClick={() => onCloseRef.current()}
          >
            Saltar
          </Button>
        </>
      ) : null}

      <button
        type="button"
        aria-label="Cerrar temporizador de descanso"
        onClick={() => onCloseRef.current()}
        className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
