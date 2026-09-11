"use client";

import { Zap } from "lucide-react";
import { useRouter } from "@/lib/router";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Marca FITSYNC: tile con bolt esmeralda + wordmark.
 * <360px solo monograma para no chocar con la CTA del navbar.
 */
export function Logo({
  variant = "lockup",
  className,
}: {
  variant?: "lockup" | "full";
  className?: string;
}) {
  const navigate = useRouter((s) => s.navigate);

  return (
    <button
      type="button"
      onClick={() => {
        track("nav_click", { label: "logo" });
        navigate("home");
      }}
      aria-label="FITSYNC — ir al inicio"
      className={cn("group flex items-center gap-2.5", className)}
    >
      <span
        aria-hidden
        className="grid size-9 place-items-center rounded-md border border-border bg-card transition-transform duration-200 group-hover:scale-105"
      >
        <Zap className="size-4 fill-primary text-primary" />
      </span>
      <span
        className={cn(
          "hidden min-[360px]:block leading-none",
          variant === "full" ? "block" : "",
        )}
      >
        <span className="block text-[13px] font-bold tracking-tight text-foreground">
          FIT<span className="text-primary">SYNC</span>
        </span>
        <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
          training system
        </span>
      </span>
    </button>
  );
}
