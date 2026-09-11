"use client";

import Image from "next/image";
import { useRouter } from "@/lib/router";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Marca KinetixFitt: isotipo K + wordmark (PNG transparente generado del logo oficial).
 * <360px solo isotipo para no chocar con la CTA del navbar.
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
      aria-label="KinetixFitt — ir al inicio"
      className={cn(
        "group flex items-center transition-transform duration-200 hover:scale-[1.02]",
        className,
      )}
    >
      <Image
        src="/brand/logo-mark.png"
        alt=""
        aria-hidden
        width={256}
        height={160}
        priority
        className={cn(
          "h-9 w-auto",
          variant === "full" ? "hidden" : "min-[360px]:hidden",
        )}
      />
      <Image
        src="/brand/logo-full.png"
        alt="KinetixFitt"
        width={900}
        height={257}
        priority
        className={cn(
          "h-8 w-auto",
          variant === "full" ? "block" : "hidden min-[360px]:block",
        )}
      />
    </button>
  );
}
