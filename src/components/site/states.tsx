"use client";

import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

/** Estados compartidos: carga, vacío, error y éxito. Nunca pantallas blancas. */

export function LoadingState({ label = "Cargando…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center gap-3 py-12 ${className ?? ""}`}>
      <span
        aria-hidden
        className="size-8 animate-spin rounded-full border-2 border-border border-t-primary"
      />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 py-12 px-4 text-center ${className ?? ""}`}>
      <Info aria-hidden className="size-6 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message = "No pudimos cargar los datos. Inténtalo de nuevo.",
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 py-10 px-4 text-center ${className ?? ""}`}>
      <AlertTriangle aria-hidden className="size-6 text-destructive" />
      <p className="text-sm">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          Reintentar
        </button>
      ) : null}
    </div>
  );
}

export function SuccessNote({ message }: { message: string }) {
  return (
    <div role="status" className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-foreground">
      <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>{message}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}
