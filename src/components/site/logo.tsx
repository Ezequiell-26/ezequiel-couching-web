"use client";

import { useRouter } from "@/lib/router";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Marca: monograma "EC" + lockup con texto.
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
      aria-label="Ezequiel Coaching — ir al inicio"
      className={cn("group flex items-center gap-2.5", className)}
    >
      <span
        aria-hidden
        className="grid size-9 place-items-center rounded-lg border border-border bg-[#0d0d10] font-mono text-sm font-bold tracking-tight text-white shadow-inner transition-transform duration-300 group-hover:scale-105"
      >
        EC<span className="text-primary">.</span>
      </span>
      <span
        className={cn(
          "hidden min-[360px]:block leading-none",
          variant === "full" ? "block" : "",
        )}
      >
        <span className="block text-[13px] font-bold tracking-tight text-foreground">
          EZEQUIEL<span className="text-primary"> COACHING</span>
        </span>
        <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
          online fitness
        </span>
      </span>
    </button>
  );
}
