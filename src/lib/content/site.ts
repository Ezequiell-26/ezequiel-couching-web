/**
 * Configuración central del sitio.
 * Los campos marcados con [SUSTITUIR] son placeholders documentados: sin datos
 * reales del negocio NO se fabrican (regla anti-inventar).
 */

export const site = {
  name: "KinetixFitt",
  shortName: "FS",
  tagline: "Entrenamiento con método: plan personalizado, registro real y progreso medible",
  description:
    "KinetixFitt combina planes de entrenamiento personalizados, registro de cada sesión y métricas reales de progreso en Mi Zona, la app de la plataforma.",
  email: "[SUSTITUIR: email de contacto]",
  whatsappNumber: "", // [SUSTITUIR: número WhatsApp internacional sin +. Vacío = botón oculto]
  location: "[SUSTITUIR: ciudad, país]",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://ezequielcoaching.example",
  socials: [
    // [SUSTITUIR: enlaces reales de redes sociales]
    { label: "Instagram", href: "" },
    { label: "YouTube", href: "" },
    { label: "TikTok", href: "" },
  ].filter((s) => Boolean(s.href)),
  legal: {
    // [SUSTITUIR: datos del titular para LSSI-CE/RGPD]
    owner: "[NOMBRE DEL TITULAR]",
    dni: "[DNI/NIF del titular]",
    address: "[Domicilio profesional]",
  },
} as const;

export type Service = {
  slug: string;
  name: string;
  level: string;
  price: string;
  summary: string;
  includes: string[];
  for: string[];
};

export const services: Service[] = [
  {
    slug: "acompanamiento",
    name: "Acompañamiento mensual",
    level: "Nivel 1",
    price: "[SUSTITUIR: precio]",
    summary:
      "Plan de entrenamiento personalizado con revisión semanal y soporte por mensaje.",
    includes: [
      "Plan de entrenamiento mensual adaptado a tu nivel y material",
      "Revisión y ajuste cada semana",
      "Soporte por mensaje en días laborables",
      "Vídeo-guias de ejecución de los ejercicios clave",
    ],
    for: [
      "Entrenas por tu cuenta pero quieres un plan claro",
      "Quieres salir de la improvisación sin coste de 1:1",
    ],
  },
  {
    slug: "online-1a1",
    name: "Coaching online 1:1",
    level: "Nivel 2",
    price: "[SUSTITUIR: precio]",
    summary:
      "Acompañamiento cercano: plan + nutrición orientativa + check-ins semanales con vídeo.",
    includes: [
      "Todo lo del acompañamiento mensual",
      "Orientación de nutrición según tu objetivo",
      "Check-in semanal con feedback en vídeo",
      "Ajustes en tiempo real según adherencia",
    ],
    for: [
      "Buscas máxima cercanía y accountability",
      "Has probado planes sueltos y no has conseguido consistencia",
    ],
  },
  {
    slug: "premium",
    name: "Premium hybrid",
    level: "Nivel 3",
    price: "[SUSTITUIR: precio]",
    summary:
      "Coaching 1:1 + sesiones en directo + análisis de técnica por vídeo.",
    includes: [
      "Todo lo del coaching online 1:1",
      "2 sesiones en directo al mes (técnica/estrategia)",
      "Análisis de técnica por vídeo ilimitado",
      "Prioridad total de respuesta",
    ],
    for: [
      "Quieres corregir técnica con feedback directo",
      "Preparas un evento o tienes un objetivo con fecha",
    ],
  },
];

export const methodPhases = [
  {
    n: "01",
    title: "Evaluación",
    body: "Cuestionario inicial + análisis de tu punto de partida: experiencia, material, tiempo disponible, lesiones y hábitos. Sin datos no hay plan serio.",
  },
  {
    n: "02",
    title: "Planificación",
    body: "Diseño de tu plan: volumen, intensidad y progresión semana a semana, ajustado a tu agenda real. Nutrición orientativa según tu objetivo.",
  },
  {
    n: "03",
    title: "Ejecución",
    body: "Entrenas registrando series, cargas y sensaciones. El registro es la base del ajuste: lo que no se mide, no se puede progresar.",
  },
  {
    n: "04",
    title: "Revisión",
    body: "Check-in periódico: adherencia, rendimiento y cómo te sientes. Ajustamos la semana siguiente con criterio, no a capricho.",
  },
];

export const valueProps = [
  {
    title: "Plan 100% personalizado",
    body: "Nada de plantillas genéricas: el plan se construye desde tu evaluación inicial.",
    icon: "clipboard",
  },
  {
    title: "Seguimiento semanal real",
    body: "Check-ins periódicos y ajustes con datos: cargas, series y adherencia.",
    icon: "line-chart",
  },
  {
    title: "Herramientas incluidas",
    body: "Calculadoras validadas y contador de calorías para trabajar de forma autónoma.",
    icon: "calculator",
  },
  {
    title: "Comunicación directa",
    body: "Sin intermediarios: hablas con tu entrenador, no con un comercial.",
    icon: "messages-square",
  },
];

export const trustClaims = [
  "Programa estructurado por fases",
  "Revisión semanal",
  "Registro de cargas y progreso",
  "Sin permanencia",
];

/** Testimonios: placeholders documentados. SUSTITUIR por testimonios reales
 *  con consentimiento escrito del cliente. Mientras no existan, no se publican
 *  cifras ni nombres ficticios. */
export const testimonials: { quote: string; author: string; detail: string }[] = [
  {
    quote: "[SUSTITUIR: testimonio real con consentimiento del cliente]",
    author: "[Nombre o inicial]",
    detail: "[Contexto: objetivo + tiempo de trabajo]",
  },
];

export const homeFaqs = [
  {
    q: "¿Necesito ir al gimnasio?",
    a: "Depende de tu objetivo y del material que tengas. En la evaluación inicial se ajusta el plan a tu entorno: gimnasio completo, material mínimo o peso corporal.",
  },
  {
    q: "¿Cómo es el seguimiento?",
    a: "Check-in periódico (semanal según servicio) donde revisamos adherencia, cargas y cómo te sientes. Con esos datos ajustamos la semana siguiente.",
  },
  {
    q: "¿Hay compromiso mínimo?",
    a: "No hay permanencia. Los servicios funcionan mes a mes; los resultados serios sí requieren semanas de trabajo consistente.",
  },
  {
    q: "¿Las calculadoras son fiables?",
    a: "Usan fórmulas publicadas (Mifflin-St Jeor, Epley, Deurenberg, US Navy). Son estimaciones de partida útiles, no diagnósticos médicos.",
  },
];
