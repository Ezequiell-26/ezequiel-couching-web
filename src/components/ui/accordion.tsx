"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Acordeón accesible (sin dependencias externas). */
export function Accordion({
  items,
  className,
}: {
  items: { q: string; a: string }[];
  className?: string;
}) {
  const [open, setOpen] = React.useState<number | null>(0);
  return (
    <div className={cn("divide-y divide-border rounded-xl border border-border bg-card", className)}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              aria-controls={`acc-panel-${i}`}
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-sm font-medium transition-colors hover:bg-accent/40 sm:px-6 sm:text-base"
            >
              <span>{item.q}</span>
              <ChevronDown
                aria-hidden
                className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180 text-primary")}
              />
            </button>
            {isOpen ? (
              <div id={`acc-panel-${i}`} className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground sm:px-6">
                {item.a}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
