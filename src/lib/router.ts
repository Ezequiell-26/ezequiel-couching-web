"use client";

/**
 * Router SPA — el preview del entorno solo expone la ruta `/`, por lo que la
 * plataforma multipágina vive en vistas sincronizadas con `location.hash`.
 * Esto habilita deep-linking (#/tienda/producto/plan-de-8-semanas), botón
 * atrás/adelante y navegación accesible, sin crear rutas de Next.js adicionales.
 * En un deploy con rutas reales, cada vista se mapea 1:1 a un path propio.
 *
 * RESTAURADO VERBATIM desde evidencia leída en vivo (Task 22-a).
 */

import { create } from "zustand";
import { track } from "./analytics";

export type ViewId =
  | "home"
  | "coaching"
  | "servicio"
  | "tienda"
  | "producto"
  | "checkout"
  | "pedido"
  | "guia-gratis"
  | "cuestionario"
  | "metodo"
  | "resultados"
  | "blog"
  | "post"
  | "planes"
  | "plan"
  | "progreso"
  | "calculadoras"
  | "contador"
  | "contacto"
  | "faq"
  | "privacidad"
  | "terminos"
  | "aviso-legal"
  | "cookies"
  | "dashboard"
  | "coach"
  | "admin"
  | "biblioteca"
  | "zona"
  | "not-found";

export interface ViewParams {
  slug?: string;
  postSlug?: string;
  category?: string;
}

export interface NavigateOptions {
  /** Ancla dentro de la vista destino (scroll suave tras montar). */
  anchor?: string;
  replace?: boolean;
  source?: string;
}

interface RouterState {
  view: ViewId;
  params: ViewParams;
  pendingAnchor?: string;
  navigate: (view: ViewId, params?: ViewParams, options?: NavigateOptions) => void;
  syncFromHash: (hash: string) => void;
}

const VALID_VIEWS: ViewId[] = [
  "home",
  "coaching",
  "servicio",
  "tienda",
  "producto",
  "checkout",
  "pedido",
  "guia-gratis",
  "cuestionario",
  "metodo",
  "resultados",
  "blog",
  "post",
  "planes",
  "plan",
  "progreso",
  "calculadoras",
  "contador",
  "contacto",
  "faq",
  "privacidad",
  "terminos",
  "aviso-legal",
  "cookies",
  "dashboard",
  "coach",
  "admin",
  "biblioteca",
  "zona",
];

export function parseHash(hash: string): { view: ViewId; params: ViewParams } {
  const clean = hash.replace(/^#\/?/, "").replace(/\/$/, "");
  if (!clean) return { view: "home", params: {} };
  const [segment, ...rest] = clean.split("/");
  const first = rest[0];
  const second = rest[1];

  switch (segment) {
    // Coaching: landing completa con los 3 niveles.
    case "coaching":
      if (first) return { view: "servicio", params: { slug: first } };
      return { view: "coaching", params: {} };
    // Alias legacy: los enlaces antiguos #/servicios siguen funcionando.
    case "servicios":
      if (first) return { view: "servicio", params: { slug: first } };
      return { view: "coaching", params: {} };
    case "tienda":
      if (first === "producto") {
        if (!second) return { view: "tienda", params: {} };
        return { view: "producto", params: { slug: second } };
      }
      if (first) return { view: "tienda", params: { category: first } };
      return { view: "tienda", params: {} };
    case "checkout":
      return { view: "checkout", params: { slug: first } };
    // Estado de mi pedido: consulta por número + email (sin cuenta).
    case "pedido":
      return { view: "pedido", params: {} };
    case "guia-gratis":
      return { view: "guia-gratis", params: {} };
    case "cuestionario":
      return { view: "cuestionario", params: {} };
    case "metodo":
      return { view: "metodo", params: {} };
    case "resultados":
      return { view: "resultados", params: {} };
    case "blog":
      if (first) return { view: "post", params: { postSlug: first } };
      return { view: "blog", params: {} };
    // Planes de entrenamiento: #/planes (índice) y #/planes/[slug] (detalle).
    case "planes":
      if (first) return { view: "plan", params: { slug: first } };
      return { view: "planes", params: {} };
    // Mi progreso: tracker local (localStorage), sin cuenta ni backend.
    case "progreso":
      return { view: "progreso", params: {} };
    // Herramientas: calculadoras y contador de calorías.
    case "calculadoras":
      return { view: "calculadoras", params: {} };
    case "contador-de-calorias":
      return { view: "contador", params: {} };
    // Biblioteca de ejercicios: hash descriptivo (SEO/UX), como "contador".
    case "ejercicios":
      return { view: "biblioteca", params: {} };
    // Mi Zona: área personal de entrenamiento.
    case "mi-zona":
      return { view: "zona", params: {} };
    case "contacto":
      return { view: "contacto", params: {} };
    case "faq":
      return { view: "faq", params: {} };
    case "privacidad":
      return { view: "privacidad", params: {} };
    case "terminos":
      return { view: "terminos", params: {} };
    case "aviso-legal":
      return { view: "aviso-legal", params: {} };
    case "politica-de-cookies":
      return { view: "cookies", params: {} };
    case "dashboard":
      return { view: "dashboard", params: {} };
    case "coach":
      return { view: "coach", params: {} };
    case "admin":
      return { view: "admin", params: {} };
    default:
      return { view: "not-found", params: {} };
  }
}

function toHash(view: ViewId, params: ViewParams): string {
  switch (view) {
    case "home":
      return "#/";
    case "servicio":
      return `#/coaching/${params.slug ?? ""}`;
    case "producto":
      return `#/tienda/producto/${params.slug ?? ""}`;
    case "checkout":
      return `#/checkout/${params.slug ?? ""}`;
    // Artículo: el hash canónico es #/blog/[slug] (idempotente con parseHash).
    case "post":
      return `#/blog/${params.postSlug ?? ""}`;
    // Plan: hash canónico #/planes/[slug] (idempotente, igual que "post").
    case "plan":
      return `#/planes/${params.slug ?? ""}`;
    // Contador: hash descriptivo (SEO/UX) y a la vez idempotente.
    case "contador":
      return "#/contador-de-calorias";
    // Biblioteca y zona: hashes descriptivos idempotentes con parseHash.
    case "biblioteca":
      return "#/ejercicios";
    case "zona":
      return "#/mi-zona";
    case "cookies":
      return "#/politica-de-cookies";
    case "not-found":
      return "#/404";
    default:
      return `#/${view}`;
  }
}

export const useRouter = create<RouterState>((set, get) => ({
  view: "home",
  params: {},

  navigate: (view, params = {}, options = {}) => {
    const prev = get();
    if (prev.view !== view || JSON.stringify(prev.params) !== JSON.stringify(params)) {
      track("view_change", { to: view, from: prev.view, source: options.source });
    }

    const hash = toHash(view, params);
    try {
      if (options.replace) {
        window.history.replaceState(null, "", hash);
      } else {
        window.history.pushState(null, "", hash);
      }
    } catch {
      /* entorno sin history API */
    }

    set({ view, params, pendingAnchor: options.anchor });
    if (!options.anchor) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  },

  syncFromHash: (hash) => {
    const { view, params } = parseHash(hash);
    set({ view, params, pendingAnchor: undefined });
  },
}));

export function scrollToAnchor(anchor: string): void {
  const el = document.getElementById(anchor);
  if (el) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }
}

export { VALID_VIEWS };
