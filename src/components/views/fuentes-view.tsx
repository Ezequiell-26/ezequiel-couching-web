"use client";

/**
 * Fuentes (#/fuentes, Task 35-e): página de transparencia con los créditos
 * técnicos de KinetixFitt. Documenta las APIs y bases de datos abiertas que
 * alimentan cada función, el software open source del stack con su licencia
 * y las alternativas evaluadas pero no integradas. Es estática a propósito:
 * sin fetching ni estado, los datos van declarados como constantes de
 * módulo y se renderizan como listas tipo índice (filas densas, no grids
 * de cards).
 */

import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { Badge } from "@/components/ui/badge";

type Source = {
  name: string;
  /** Qué alimenta en KinetixFitt. */
  role: string;
  /** Licencia verificada de los datos o del proyecto. */
  license: string;
  url: string;
};

type RejectedSource = {
  name: string;
  /** Qué era, cuando aplica. */
  role?: string;
  /** Criterio de descarte. */
  reason: string;
};

/* Sección 1 — APIs y bases de datos abiertas (licencias verificadas). */
const OPEN_DATA: Source[] = [
  {
    name: "Open Food Facts",
    role: "Búsqueda de alimentos del contador de calorías",
    license: "ODbL",
    url: "https://world.openfoodfacts.org",
  },
  {
    name: "FruityVice",
    role: "Datos nutricionales de frutas (respaldo del buscador)",
    license: "API pública gratuita",
    url: "https://www.fruityvice.com",
  },
  {
    name: "TheMealDB",
    role: "Recetas internacionales",
    license: "API pública gratuita",
    url: "https://www.themealdb.com",
  },
  {
    name: "free-exercise-db (yuhonas)",
    role: "Demos fotográficas de la biblioteca de ejercicios",
    license: "Unlicense (dominio público)",
    url: "https://github.com/yuhonas/free-exercise-db",
  },
  {
    name: "Open-Meteo Forecast",
    role: "Clima para entrenar en Mi Zona",
    license: "CC BY 4.0",
    url: "https://open-meteo.com",
  },
  {
    name: "Open-Meteo Geocoding",
    role: "Buscador de ciudades del clima",
    license: "CC BY 4.0 (datos de OpenStreetMap)",
    url: "https://open-meteo.com",
  },
  {
    name: "Open-Meteo Air Quality",
    role: "Calidad del aire (EAQI) en el clima",
    license: "CC BY 4.0",
    url: "https://open-meteo.com",
  },
];

/* Sección 2 — Software open source del stack. */
const STACK: Source[] = [
  { name: "Next.js", role: "Framework", license: "MIT", url: "https://nextjs.org" },
  { name: "React", role: "UI", license: "MIT", url: "https://react.dev" },
  { name: "TypeScript", role: "Lenguaje", license: "Apache-2.0", url: "https://typescriptlang.org" },
  { name: "Tailwind CSS", role: "Estilos", license: "MIT", url: "https://tailwindcss.com" },
  { name: "shadcn/ui", role: "Componentes UI", license: "MIT", url: "https://ui.shadcn.com" },
  { name: "Radix UI", role: "Primitivas accesibles", license: "MIT", url: "https://radix-ui.com" },
  { name: "Zustand", role: "Estado", license: "MIT", url: "https://github.com/pmndrs/zustand" },
  { name: "Zod", role: "Validación de datos", license: "MIT", url: "https://zod.dev" },
  { name: "Sonner", role: "Notificaciones", license: "MIT", url: "https://sonner.emilkowal.ski" },
  { name: "Framer Motion", role: "Animaciones", license: "MIT", url: "https://motion.dev" },
  { name: "Lucide", role: "Iconos", license: "ISC", url: "https://lucide.dev" },
  { name: "Fuse.js", role: "Búsqueda difusa en la biblioteca", license: "Apache-2.0", url: "https://fusejs.io" },
  {
    name: "html-to-image",
    role: "Exportar resumen de sesión como PNG",
    license: "MIT",
    url: "https://github.com/bubkoo/html-to-image",
  },
  {
    name: "canvas-confetti",
    role: "Celebración de PRs",
    license: "ISC",
    url: "https://github.com/catdad/canvas-confetti",
  },
  { name: "Prisma", role: "ORM", license: "Apache-2.0", url: "https://prisma.io" },
  { name: "sharp", role: "Optimización de imágenes", license: "Apache-2.0", url: "https://sharp.pixelplumbing.com" },
  {
    name: "ics",
    role: "Exportar el plan semanal a calendario (.ics)",
    license: "ISC",
    url: "https://github.com/adamgibbons/ics",
  },
  {
    name: "Photon (komoot)",
    role: "Búsqueda de gimnasios (POIs de OpenStreetMap) en Mi Zona. Datos © OpenStreetMap contributors (ODbL).",
    license: "MIT",
    url: "https://github.com/komoot/photon",
  },
];

/* Sección 3 — Evaluadas y no integradas (criterio de descarte). */
const REJECTED: RejectedSource[] = [
  {
    name: "wger",
    role: "API de ejercicios/nutrición",
    reason: "Código AGPL y datos CC-BY-SA con redundancia respecto de la biblioteca local.",
  },
  {
    name: "ExerciseDB",
    reason: "Requiere suscripción vía RapidAPI.",
  },
  {
    name: "USDA FoodData Central",
    reason: "Requiere registro de API key; Open Food Facts cubre el caso sin key.",
  },
  {
    name: "Recharts",
    reason: "Los gráficos SVG propios son más livianos y consistentes con el tema.",
  },
];

/** Etiqueta visible del enlace: la URL sin protocolo. */
function linkLabel(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

/** Fila de fuente integrada: nombre → qué alimenta → licencia → enlace. */
function SourceRow({ source, index }: { source: Source; index: number }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:py-3.5">
      <div className="flex min-w-0 items-baseline gap-2.5 sm:w-56 sm:shrink-0">
        <span aria-hidden className="font-mono text-xs tabular-nums text-muted-foreground">
          {String(index).padStart(2, "0")}
        </span>
        <p className="min-w-0 truncate text-sm font-medium leading-6 text-foreground">{source.name}</p>
      </div>
      <p className="min-w-0 flex-1 text-sm leading-6 text-muted-foreground">{source.role}</p>
      {/* El cluster puede envolver (badge arriba, enlace abajo) para no
          desbordar en tablets; con espacio alcanza una sola línea. */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 sm:justify-end">
        <Badge variant="outline" className="shrink-0">
          {source.license}
        </Badge>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-w-0 max-w-[13rem] items-center gap-1 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          <span className="min-w-0 truncate">{linkLabel(source.url)}</span>
          <ExternalLink aria-hidden className="size-3.5 shrink-0" />
          <span className="sr-only"> (se abre en una pestaña nueva)</span>
        </a>
      </div>
    </li>
  );
}

/** Lista tipo índice de fuentes integradas, con numeración continua. */
function SourceList({ sources, offset }: { sources: Source[]; offset: number }) {
  return (
    <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
      {sources.map((source, i) => (
        <SourceRow key={source.name} source={source} index={offset + i} />
      ))}
    </ul>
  );
}

/** Fila de alternativa evaluada y descartada: nombre → criterio → badge. */
function RejectedRow({ item }: { item: RejectedSource }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-start sm:gap-4 sm:py-3.5">
      <div className="min-w-0 sm:w-56 sm:shrink-0">
        <p className="truncate text-sm font-medium leading-6 text-foreground">{item.name}</p>
        {item.role ? <p className="text-xs leading-5 text-muted-foreground">{item.role}</p> : null}
      </div>
      <p className="min-w-0 flex-1 text-sm leading-6 text-muted-foreground">{item.reason}</p>
      <div className="shrink-0">
        <Badge variant="outline">Descartada</Badge>
      </div>
    </li>
  );
}

export function FuentesView() {
  return (
    <>
      <PageHeader
        eyebrow="Transparencia"
        title="Fuentes de datos y open source"
        description="KinetixFitt funciona con bases de datos abiertas y software libre. Esta página documenta qué usa cada función y bajo qué licencia."
      />

      <Container className="pb-16 pt-10 sm:pb-20 sm:pt-12">
        <div className="flex flex-col gap-12 sm:gap-14">
          <section aria-label="APIs y bases de datos abiertas">
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              APIs y bases de datos abiertas
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Bases abiertas y APIs públicas que alimentan el buscador de alimentos, las recetas,
              la biblioteca de ejercicios y el clima de Mi Zona.
            </p>
            <SourceList sources={OPEN_DATA} offset={1} />
          </section>

          <section aria-label="Software open source del stack">
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              Software open source del stack
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Librerías y herramientas con las que está construido el sitio.
            </p>
            <SourceList sources={STACK} offset={OPEN_DATA.length + 1} />
          </section>

          <section aria-label="Fuentes evaluadas y no integradas">
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              Evaluadas y no integradas
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Alternativas que evaluamos y descartamos, con el criterio de cada decisión.
            </p>
            <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
              {REJECTED.map((item) => (
                <RejectedRow key={item.name} item={item} />
              ))}
            </ul>
          </section>

          <div className="border-t border-border pt-5">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Nota</p>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">
              Los datos mostrados provienen de estas fuentes en tiempo real o están empaquetados
              con su licencia original. KinetixFitt no altera los datos; las estimaciones (calorías,
              zonas de FC, DOTS) se calculan con fórmulas publicadas y son de cribado, nunca un
              diagnóstico.
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
