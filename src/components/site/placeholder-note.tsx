import { cn } from "@/lib/utils";

/** Nota de placeholder visible y honesta para datos pendientes del negocio. */
export function PlaceholderNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground",
        className,
      )}
    >
      <span aria-hidden className="mr-1">✎</span>
      {children}
    </div>
  );
}
