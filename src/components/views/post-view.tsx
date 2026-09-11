"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { CTAButton } from "@/components/site/cta-button";
import { LoadingState, ErrorState, EmptyState } from "@/components/site/states";
import { useAsyncData } from "@/hooks/use-async-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/lib/router";
import { formatDate } from "@/lib/utils";

type PostDetail = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  createdAt: string;
};

/**
 * Artículo del blog (#/blog/[slug]) — datos reales de la API.
 * El cuerpo se divide por párrafos dobles (\n\n) en <p> sencillos y seguros.
 */
export function PostView({ postSlug }: { postSlug: string }) {
  const navigate = useRouter((s) => s.navigate);
  // 404 → null: el artículo no está publicado (estado "missing" del diseño original).
  const { status, data, reload } = useAsyncData<PostDetail | null>(async () => {
    const res = await fetch(`/api/posts/${encodeURIComponent(postSlug)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as PostDetail;
  }, [postSlug]);
  const post = data;

  if (status === "loading") {
    return (
      <div className="py-16 sm:py-24">
        <Container>
          <LoadingState label="Cargando artículo…" />
        </Container>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="py-16 sm:py-24">
        <Container className="max-w-2xl">
          <ErrorState onRetry={reload} />
        </Container>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="py-16 sm:py-24">
        <Container className="max-w-2xl">
          <h1 className="sr-only">Artículo no encontrado</h1>
          <EmptyState
            title="No encontramos este artículo"
            hint="Puede que el enlace esté anticuado o que el artículo ya no esté publicado."
            action={
              <Button variant="outline" onClick={() => navigate("blog")}>
                <ArrowLeft aria-hidden />
                Volver al blog
              </Button>
            }
          />
        </Container>
      </div>
    );
  }

  const paragraphs = post.body.split("\n\n").map((p) => p.trim()).filter(Boolean);

  return (
    <>
      <PageHeader
        eyebrow="Blog"
        title={post.title}
        description={post.excerpt}
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Blog", href: "#/blog" }, { label: post.title }]}
      >
        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <Badge variant="muted">{post.category}</Badge>
          <time dateTime={new Date(post.createdAt).toISOString()}>{formatDate(post.createdAt)}</time>
        </div>
      </PageHeader>

      <section aria-label="Contenido del artículo" className="py-12 sm:py-16">
        <Container className="max-w-3xl">
          <article>
            {paragraphs.map((p, i) => (
              <p key={i} className="mb-5 text-sm leading-relaxed text-foreground/90 sm:text-base">
                {p}
              </p>
            ))}
          </article>

          <div className="mt-10">
            <Button variant="outline" onClick={() => navigate("blog")}>
              <ArrowLeft aria-hidden />
              Volver al blog
            </Button>
          </div>
        </Container>
      </section>

      {/* Siguiente paso */}
      <section aria-labelledby="post-siguiente" className="border-t border-border/60 bg-card/30 py-12 sm:py-16">
        <Container>
          <div className="rounded-xl border border-primary/40 bg-brand-halo p-6 text-center sm:p-10">
            <h2 id="post-siguiente" className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
              Siguiente paso: de leer a entrenar con método
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
              El cuestionario inicial toma tus datos (objetivo, experiencia, material) y a partir de ahí se construye la propuesta.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <CTAButton
                size="lg"
                view="cuestionario"
                event="cta_click"
                eventProps={{ label: "cta_post" }}
                source="post"
              >
                Rellenar el cuestionario
                <ArrowRight aria-hidden />
              </CTAButton>
              <CTAButton size="lg" variant="outline" view="blog" source="post" withArrow={false}>
                Seguir leyendo
              </CTAButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
