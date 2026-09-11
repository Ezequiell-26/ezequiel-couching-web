"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { Reveal } from "@/components/site/reveal";
import { CTAButton } from "@/components/site/cta-button";
import { ErrorState, EmptyState, Skeleton } from "@/components/site/states";
import { useAsyncData } from "@/hooks/use-async-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/lib/router";
import { track } from "@/lib/analytics";
import { formatDate } from "@/lib/utils";

type PostRow = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  createdAt: string;
};

const ALL = "Todas";

/**
 * Blog (#/blog) — listado de artículos con filtro por categoría (chips).
 * Datos reales de la API; estados de carga, error y vacío honestos.
 */
export function BlogView() {
  const navigate = useRouter((s) => s.navigate);
  const [filter, setFilter] = useState<string>(ALL);
  const { status, data, reload } = useAsyncData<PostRow[]>(async () => {
    const res = await fetch("/api/posts");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as PostRow[];
    return Array.isArray(json) ? json : [];
  }, []);
  const posts = useMemo(() => data ?? [], [data]);

  const categories = useMemo(() => {
    const set = new Set(posts.map((p) => p.category).filter(Boolean));
    return [ALL, ...Array.from(set).sort((a, b) => a.localeCompare(b, "es"))];
  }, [posts]);

  const visible = filter === ALL ? posts : posts.filter((p) => p.category === filter);

  return (
    <>
      <PageHeader
        eyebrow="Blog"
        title="Artículos con criterio, sin atajos mágicos"
        description="Entrenamiento, nutrición y hábitos explicados con el mismo método que uso con mis clientes."
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Blog" }]}
      />

      <section aria-labelledby="blog-lista" className="py-12 sm:py-16">
        <Container>
          <h2 id="blog-lista" className="sr-only">Listado de artículos</h2>

          {status === "ready" && posts.length > 0 ? (
            <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filtrar artículos por categoría">
              {categories.map((c) => {
                const active = filter === c;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(c)}
                    className={`min-h-9 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          ) : null}

          {status === "loading" ? (
            <div role="status" aria-live="polite">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-5 sm:p-6">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="mt-3 h-6 w-3/4" />
                    <Skeleton className="mt-3 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-2/3" />
                  </div>
                ))}
              </div>
              <p className="sr-only">Cargando artículos…</p>
            </div>
          ) : null}

          {status === "error" ? (
            <ErrorState
              message="No pudimos cargar el blog. Comprueba tu conexión e inténtalo de nuevo."
              onRetry={reload}
            />
          ) : null}

          {status === "ready" && posts.length === 0 ? (
            <EmptyState
              title="El blog está arrancando"
              hint="Estamos escribiendo los primeros artículos. Mientras tanto, el método y los servicios ya están disponibles."
            />
          ) : null}

          {status === "ready" && posts.length > 0 && visible.length === 0 ? (
            <EmptyState
              title={`No hay artículos de ${filter} todavía`}
              hint="Prueba con otra categoría o vuelve a la lista completa."
              action={
                <Button variant="outline" onClick={() => setFilter(ALL)}>
                  Ver todas las categorías
                </Button>
              }
            />
          ) : null}

          {status === "ready" && visible.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((post, i) => (
                <Reveal key={post.slug} delay={0.05 * i}>
                  <article className="flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="muted">{post.category}</Badge>
                      <time dateTime={new Date(post.createdAt).toISOString()}>{formatDate(post.createdAt)}</time>
                    </div>
                    <h3 className="mt-3 text-xl font-semibold tracking-tight">{post.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
                    <button
                      type="button"
                      onClick={() => {
                        track("cta_click", { label: `post:${post.slug}`, source: "blog" });
                        navigate("post", { postSlug: post.slug });
                      }}
                      className="group mt-4 inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-medium text-primary transition-colors hover:text-foreground"
                    >
                      Leer artículo
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </button>
                  </article>
                </Reveal>
              ))}
            </div>
          ) : null}
        </Container>
      </section>

      {/* Siguiente paso */}
      <section aria-labelledby="blog-siguiente" className="pb-16 sm:pb-20">
        <Container>
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h2 id="blog-siguiente" className="text-xl font-bold tracking-tight">Siguiente paso</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Leer está bien; aplicar es mejor. El cuestionario inicial convierte la teoría en un plan para tu caso.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <CTAButton view="cuestionario" event="cta_click" eventProps={{ label: "cta_blog" }} source="blog">
                Rellenar el cuestionario
              </CTAButton>
              <CTAButton variant="outline" view="metodo" source="blog" withArrow={false}>
                Ver el método
              </CTAButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
