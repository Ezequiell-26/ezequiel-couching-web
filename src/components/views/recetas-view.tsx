"use client";

/**
 * Recetas (#/recetas, Task 35-a): búsqueda por nombre y chips de categorías
 * sobre TheMealDB (API pública gratuita, contenido en inglés). La API propia
 * (/api/recipes) normaliza y cachea el upstream; acá solo consumimos esa ruta
 * relativa. Cada card abre un diálogo con ingredientes, medidas e
 * instrucciones reales de TheMealDB.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ChefHat, ExternalLink, Search } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { EmptyState, ErrorState, LoadingState, Skeleton } from "@/components/site/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { track } from "@/lib/analytics";

type MealSummary = {
  id: number;
  name: string;
  category: string | null;
  thumb: string | null;
};

type MealIngredient = { name: string; measure: string };

type MealDetail = {
  id: number;
  name: string;
  category: string | null;
  area: string | null;
  thumb: string | null;
  tags: string[];
  youtube: string | null;
  source: string | null;
  instructions: string;
  ingredients: MealIngredient[];
};

type ListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string; retry: Retry }
  | { status: "results"; meals: MealSummary[]; label: string };

type Retry = { kind: "q"; term: string } | { kind: "category"; name: string };

type CategoriesState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; categories: string[] };

type DetailState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; meal: MealDetail };

export function RecetasView() {
  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [list, setList] = useState<ListState>({ status: "idle" });
  const [categories, setCategories] = useState<CategoriesState>({ status: "loading" });
  const [selected, setSelected] = useState<MealSummary | null>(null);
  const [detail, setDetail] = useState<DetailState>({ status: "loading" });

  // Debounce 450 ms + descarte de respuestas obsoletas (patrón del contador).
  const searchTimer = useRef<number | null>(null);
  const latestQuery = useRef("");

  // Limpia el debounce pendiente al desmontar.
  useEffect(() => {
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, []);

  /* Categorías reales de TheMealDB (modo categories), cargadas al montar
     y reintentables desde el error. Un id de request descarta respuestas
     viejas si el usuario reintenta mientras hay una carga en vuelo.
     Sin setState síncrono acá: el estado inicial ya es "loading" y el
     resultado se aplica post-await (react-hooks/set-state-in-effect). */
  const categoriesReqId = useRef(0);
  const loadCategories = useCallback(async () => {
    const reqId = ++categoriesReqId.current;
    try {
      const res = await fetch("/api/recipes?mode=categories");
      const json = (await res.json()) as { categories?: unknown; error?: string };
      if (reqId !== categoriesReqId.current) return;
      if (!res.ok) {
        setCategories({
          status: "error",
          message: json.error ?? "No pudimos cargar las categorías.",
        });
        return;
      }
      const cats = Array.isArray(json.categories)
        ? json.categories.filter((c): c is string => typeof c === "string" && c !== "")
        : [];
      setCategories({ status: "done", categories: cats });
    } catch {
      if (reqId !== categoriesReqId.current) return;
      setCategories({ status: "error", message: "No pudimos cargar las categorías." });
    }
  }, []);

  useEffect(() => {
    // Patrón timer+IIFE (como weather-card): nada de setState síncrono
    // dentro del effect; el resultado se aplica post-await.
    const t = window.setTimeout(() => void loadCategories(), 0);
    return () => window.clearTimeout(t);
  }, [loadCategories]);

  /* Búsqueda por texto (q), con debounce desde onQueryChange. */
  async function runSearch(term: string) {
    latestQuery.current = term;
    setList({ status: "loading" });
    try {
      const res = await fetch(`/api/recipes?q=${encodeURIComponent(term)}`);
      const json = (await res.json()) as { meals?: MealSummary[]; error?: string };
      if (latestQuery.current !== term) return; // el usuario ya escribió otra cosa
      if (!res.ok) {
        setList({
          status: "error",
          message: json.error ?? "No se pudo buscar. Intentá de nuevo.",
          retry: { kind: "q", term },
        });
        return;
      }
      const meals = Array.isArray(json.meals) ? json.meals : [];
      setList({ status: "results", meals, label: term });
      track("recipes_search", { q: term, n: meals.length });
    } catch {
      if (latestQuery.current !== term) return;
      setList({
        status: "error",
        message: "Sin conexión con el buscador. Revisá tu red e intentá de nuevo.",
        retry: { kind: "q", term },
      });
    }
  }

  /* Categoría: fetch inmediato (sin debounce). */
  async function runCategory(name: string) {
    latestQuery.current = `cat:${name}`;
    setList({ status: "loading" });
    try {
      const res = await fetch(`/api/recipes?category=${encodeURIComponent(name)}`);
      const json = (await res.json()) as { meals?: MealSummary[]; error?: string };
      if (latestQuery.current !== `cat:${name}`) return;
      if (!res.ok) {
        setList({
          status: "error",
          message: json.error ?? "No se pudo cargar la categoría. Intentá de nuevo.",
          retry: { kind: "category", name },
        });
        return;
      }
      const meals = Array.isArray(json.meals) ? json.meals : [];
      setList({ status: "results", meals, label: name });
      track("recipes_search", { q: name, n: meals.length });
    } catch {
      if (latestQuery.current !== `cat:${name}`) return;
      setList({
        status: "error",
        message: "Sin conexión con el buscador. Revisá tu red e intentá de nuevo.",
        retry: { kind: "category", name },
      });
    }
  }

  function onQueryChange(value: string) {
    setQ(value);
    setSelectedCategory(null);
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    const term = value.trim();
    if (term.length < 2) {
      latestQuery.current = term;
      setList({ status: "idle" });
      return;
    }
    searchTimer.current = window.setTimeout(() => void runSearch(term), 450);
  }

  function onCategoryClick(name: string) {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    if (selectedCategory === name) {
      // Volver al estado inicial: chips + invitación a elegir.
      setSelectedCategory(null);
      setQ("");
      latestQuery.current = "";
      setList({ status: "idle" });
      return;
    }
    setSelectedCategory(name);
    setQ("");
    void runCategory(name);
  }

  function resetToIdle() {
    setSelectedCategory(null);
    setQ("");
    latestQuery.current = "";
    setList({ status: "idle" });
  }

  /* Detalle: lookup por id al abrir la card. */
  async function loadDetail(id: number) {
    try {
      const res = await fetch(`/api/recipes?id=${id}`);
      const json = (await res.json()) as { meal?: MealDetail | null; error?: string };
      if (!res.ok || !json.meal) {
        setDetail({
          status: "error",
          message: json.error ?? "No encontramos esa receta.",
        });
        return;
      }
      setDetail({ status: "loaded", meal: json.meal });
    } catch {
      setDetail({
        status: "error",
        message: "Sin conexión con el detalle. Revisá tu red e intentá de nuevo.",
      });
    }
  }

  function openMeal(card: MealSummary) {
    setSelected(card);
    setDetail({ status: "loading" });
    track("recipes_open", { id: card.id });
    void loadDetail(card.id);
  }

  function closeMeal() {
    setSelected(null);
    setDetail({ status: "loading" });
  }

  return (
    <>
      <PageHeader
        eyebrow="Herramientas"
        title="Recetas"
        description="Recetas internacionales de TheMealDB (contenido en inglés). Elegí una categoría o buscá por nombre."
      />

      <Container className="pb-16 pt-8 sm:pb-20">
        {/* Buscador + chips de categorías */}
        <Card className="p-4 sm:p-6">
          <div role="search" aria-label="Buscar recetas">
            <Label htmlFor="recetas-q">Buscar receta por nombre</Label>
            <div className="relative mt-2">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="recetas-q"
                type="search"
                value={q}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Ej.: chicken, pasta, soup…"
                autoComplete="off"
                className="pl-9"
              />
            </div>
          </div>

          {categories.status === "loading" ? (
            <div className="mt-4 flex flex-wrap gap-2" aria-hidden>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-9 w-24" />
              ))}
            </div>
          ) : categories.status === "error" ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">{categories.message}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCategories({ status: "loading" });
                  void loadCategories();
                }}
              >
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Categorías de recetas">
              {categories.categories.map((c) => (
                <Button
                  key={c}
                  type="button"
                  variant={selectedCategory === c ? "default" : "outline"}
                  size="sm"
                  aria-pressed={selectedCategory === c}
                  onClick={() => onCategoryClick(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          )}
        </Card>

        {/* Resultado */}
        {list.status === "loading" ? (
          <div className="mt-8">
            <LoadingState label="Buscando recetas…" />
          </div>
        ) : list.status === "error" ? (
          <div className="mt-8">
            <ErrorState
              message={list.message}
              onRetry={() =>
                void (list.retry.kind === "q"
                  ? runSearch(list.retry.term)
                  : runCategory(list.retry.name))
              }
            />
          </div>
        ) : list.status === "idle" ? (
          <div className="mt-8">
            <EmptyState
              title="Elegí una categoría o buscá una receta"
              hint="Tocá un chip para explorar por categoría, o escribí el nombre del plato en inglés (ej.: chicken, pasta, soup)."
            />
          </div>
        ) : (
          <>
            <p aria-live="polite" className="mt-6 text-sm text-muted-foreground">
              {list.meals.length === 1
                ? "1 receta encontrada"
                : `${list.meals.length} recetas encontradas`}
            </p>

            {list.meals.length > 0 ? (
              <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {list.meals.map((meal) => (
                  <li key={meal.id}>
                    <Card className="h-full transition-all duration-200 hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_oklch(0_0_0/0.5)]">
                      <button
                        type="button"
                        onClick={() => openMeal(meal)}
                        aria-haspopup="dialog"
                        aria-label={`Ver detalle de ${meal.name}`}
                        className="group flex h-full w-full flex-col gap-3 rounded-xl p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        {meal.thumb ? (
                          <div className="relative -mx-5 -mt-5 mb-1 aspect-[4/3] overflow-hidden rounded-t-xl border-b border-border bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={meal.thumb}
                              alt={meal.name}
                              loading="lazy"
                              className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
                            />
                          </div>
                        ) : null}
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="text-balance font-semibold leading-snug tracking-tight">
                            {meal.name}
                          </h2>
                          <ChefHat aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        </div>
                        {meal.category ? (
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="outline">{meal.category}</Badge>
                          </div>
                        ) : null}
                      </button>
                    </Card>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4">
                <EmptyState
                  title={`No encontramos recetas para «${list.label}».`}
                  hint="Probá con otro nombre (en inglés) o elegí una categoría de la lista."
                  action={
                    <Button variant="outline" onClick={resetToIdle}>
                      Limpiar búsqueda
                    </Button>
                  }
                />
              </div>
            )}
          </>
        )}
      </Container>

      <Dialog open={selected !== null} onClose={closeMeal} title={selected?.name ?? ""} className="max-w-2xl">
        {selected && detail.status === "loading" ? <LoadingState label="Cargando receta…" /> : null}
        {selected && detail.status === "error" ? <ErrorState message={detail.message} /> : null}
        {selected && detail.status === "loaded" ? (
          <MealDetailBody meal={detail.meal} fallbackThumb={selected.thumb} />
        ) : null}
      </Dialog>
    </>
  );
}

/** Cuerpo del diálogo: imagen, metadatos, ingredientes e instrucciones reales. */
function MealDetailBody({ meal, fallbackThumb }: { meal: MealDetail; fallbackThumb: string | null }) {
  const thumb = meal.thumb ?? fallbackThumb;

  return (
    <div className="flex flex-col gap-5">
      {thumb ? (
        <div className="overflow-hidden rounded-lg border border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb}
            alt={meal.name}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5" aria-label="Categoría y origen">
        {meal.category ? <Badge variant="default">{meal.category}</Badge> : null}
        {meal.area ? <Badge variant="outline">{meal.area}</Badge> : null}
      </div>

      {meal.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" aria-label="Etiquetas">
          {meal.tags.map((tag) => (
            <Badge key={tag} variant="muted">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}

      <section aria-label="Ingredientes con medidas">
        <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Ingredientes
        </h3>
        <ul className="divide-y divide-border/60 rounded-lg border border-border bg-background/40">
          {meal.ingredients.map((ing, i) => (
            <li key={`${ing.name}-${i}`} className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm">
              <span>{ing.name}</span>
              {ing.measure ? (
                <span className="shrink-0 text-right text-muted-foreground">{ing.measure}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {meal.instructions ? (
        <section aria-label="Instrucciones de preparación">
          <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Preparación
          </h3>
          <p className="whitespace-pre-line text-sm leading-relaxed">{meal.instructions}</p>
        </section>
      ) : null}

      {meal.youtube ? (
        <a
          href={meal.youtube}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Ver en YouTube
          <ExternalLink aria-hidden className="size-4" />
        </a>
      ) : null}

      <p className="mt-auto text-xs text-muted-foreground">Receta: TheMealDB</p>
    </div>
  );
}
