/**
 * SEO central: metadatos por vista + builders de JSON-LD.
 * La URL del sitio es un placeholder documentado hasta tener el dominio real:
 * configurar NEXT_PUBLIC_SITE_URL en .env cuando exista.
 */

import type { Metadata } from "next";
import type { ViewId } from "./router";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ezequielcoaching.example";
export const SITE_NAME = "Ezequiel Coaching";

type Meta = { title: string; description: string };

const VIEW_META: Record<ViewId, Meta> = {
  home: {
    title: "Ezequiel Coaching — Entrenador personal online",
    description:
      "Entrenamiento online profesional: planes personalizados, seguimiento real y herramientas gratuitas (calculadoras y contador de calorías).",
  },
  coaching: {
    title: "Coaching online — Ezequiel Coaching",
    description: "Programas de coaching online 1:1: acompañamiento, planificación y seguimiento semanal.",
  },
  servicio: {
    title: "Servicio de coaching — Ezequiel Coaching",
    description: "Detalle del servicio de coaching online: qué incluye, para quién es y cómo empezar.",
  },
  tienda: {
    title: "Tienda — Ezequiel Coaching",
    description: "Programas y recursos digitales descargables para entrenar con método.",
  },
  producto: {
    title: "Producto — Ezequiel Coaching",
    description: "Ficha del producto digital: contenido, formato y compra.",
  },
  checkout: {
    title: "Checkout — Ezequiel Coaching",
    description: "Finaliza tu pedido de forma segura.",
  },
  pedido: {
    title: "Estado de mi pedido — Ezequiel Coaching",
    description: "Consulta el estado de tu pedido con tu número y email.",
  },
  "guia-gratis": {
    title: "Guía gratuita — Ezequiel Coaching",
    description: "Descarga la guía de inicio: fundamentos de entrenamiento y nutrición.",
  },
  cuestionario: {
    title: "Cuestionario inicial — Ezequiel Coaching",
    description: "Cuéntame tu situación (edad, peso, objetivo, experiencia) y recibe tu propuesta.",
  },
  metodo: {
    title: "Método — Ezequiel Coaching",
    description: "El método de trabajo por fases: evaluación, planificación, ejecución y revisión.",
  },
  resultados: {
    title: "Resultados — Ezequiel Coaching",
    description: "Testimonios y resultados de clientes, con contexto honesto.",
  },
  blog: {
    title: "Blog — Ezequiel Coaching",
    description: "Artículos sobre entrenamiento, nutrición y hábitos.",
  },
  post: {
    title: "Artículo — Ezequiel Coaching",
    description: "Artículo del blog de Ezequiel Coaching.",
  },
  planes: {
    title: "Planes de entrenamiento — Ezequiel Coaching",
    description: "Planes de entrenamiento por nivel y objetivo, listos para empezar.",
  },
  plan: {
    title: "Plan de entrenamiento — Ezequiel Coaching",
    description: "Detalle del plan de entrenamiento: semanas, sesiones y compra.",
  },
  progreso: {
    title: "Mi progreso — Ezequiel Coaching",
    description: "Registra tu peso, tus sesiones y sigue tu evolución (datos guardados en tu dispositivo).",
  },
  calculadoras: {
    title: "Calculadoras fitness — Ezequiel Coaching",
    description: "IMC, calorías, macros, 1RM, grasa corporal, agua y peso ideal con fórmulas validadas.",
  },
  contador: {
    title: "Contador de calorías — Ezequiel Coaching",
    description: "Registra tus comidas del día, controla kcal y macronutrientes. Datos guardados en tu dispositivo.",
  },
  biblioteca: {
    title: "Biblioteca de ejercicios — Ezequiel Coaching",
    description:
      "Biblioteca de ejercicios con técnica paso a paso: músculos implicados, ejecución y consejos para pecho, espalda, piernas, hombros, brazos y core.",
  },
  zona: {
    title: "Mi Zona de entrenamiento — Ezequiel Coaching",
    description:
      "Tu zona de entrenamiento personal: rutinas, sesiones guiadas y seguimiento adaptadas a tu objetivo y material.",
  },
  contacto: {
    title: "Contacto — Ezequiel Coaching",
    description: "Escríbeme para dudas, propuestas o colaboración.",
  },
  faq: {
    title: "Preguntas frecuentes — Ezequiel Coaching",
    description: "Respuestas a las dudas más comunes sobre coaching, planes y herramientas.",
  },
  privacidad: {
    title: "Política de privacidad — Ezequiel Coaching",
    description: "Cómo tratamos tus datos personales (RGPD/LOPDGDD).",
  },
  terminos: {
    title: "Términos y condiciones — Ezequiel Coaching",
    description: "Condiciones de uso, contratación y desistimiento.",
  },
  "aviso-legal": {
    title: "Aviso legal — Ezequiel Coaching",
    description: "Identificación del titular y condiciones de uso (LSSI-CE).",
  },
  cookies: {
    title: "Política de cookies — Ezequiel Coaching",
    description: "Qué cookies usamos y cómo gestionarlas.",
  },
  dashboard: {
    title: "Mi panel — Ezequiel Coaching",
    description: "Tu resumen diario: herramientas, progreso y accesos rápidos.",
  },
  coach: {
    title: "Panel del entrenador — Ezequiel Coaching",
    description: "Gestión de leads, mensajes y pedidos.",
  },
  admin: {
    title: "Administración — Ezequiel Coaching",
    description: "Panel de administración.",
  },
  "not-found": {
    title: "Página no encontrada — Ezequiel Coaching",
    description: "La página que buscas no existe o cambió de dirección.",
  },
};

export function metaFor(view: ViewId, override?: Partial<Meta>): Metadata {
  const base = VIEW_META[view];
  const title = override?.title ?? base.title;
  const description = override?.description ?? base.description;
  return {
    title,
    description,
    alternates: { canonical: SITE_URL },
    openGraph: { title, description, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/logo-full.png`,
    description: VIEW_META.home.description,
    areaServed: "ES",
  };
}

export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
}
