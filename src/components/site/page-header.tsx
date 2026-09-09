import { cn } from "@/lib/utils";
import { Container } from "./container";

/** Cabecera estándar de páginas interiores (H1 + descripción + breadcrumb). */
export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumb,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumb?: { label: string; href?: string }[];
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("bg-brand-halo border-b border-border/60", className)}>
      <Container className="pb-10 pt-28 sm:pb-12 sm:pt-32">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav aria-label="Miga de pan" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {breadcrumb.map((item, i) => (
                <li key={item.label} className="flex items-center gap-1.5">
                  {i > 0 ? <span aria-hidden>/</span> : null}
                  {item.href ? (
                    <a href={item.href} className="transition-colors hover:text-primary">
                      {item.label}
                    </a>
                  ) : (
                    <span aria-current="page" className="text-foreground/80">{item.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {eyebrow ? (
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        ) : null}
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
        {children}
      </Container>
    </header>
  );
}
