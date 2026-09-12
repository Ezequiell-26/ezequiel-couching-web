export const SITE_NAME = "KinetixFitt";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kinetixfitt.com";
export const CONTACT_EMAIL = "info@kinetixfitt.com";

export const SOCIAL_LINKS = {
  instagram: "https://instagram.com/kinetixfitt",
  tiktok: "https://tiktok.com/@kinetixfitt",
  youtube: "https://youtube.com/@kinetixfitt",
};

export const NAVIGATION = [
  { label: "Inicio", href: "/" },
  { label: "Servicios", href: "/#servicios" },
  { label: "Planes", href: "/#planes" },
  { label: "Tienda", href: "/#tienda" },
  { label: "Blog", href: "/blog" },
  { label: "Mi Zona", href: "/zona" },
];

export const FOOTER_LINKS = {
  company: [
    { label: "Sobre mí", href: "/#sobre-mi" },
    { label: "Testimonios", href: "/#testimonios" },
    { label: "Contacto", href: "/contacto" },
  ],
  services: [
    { label: "Coaching 1:1", href: "/#coaching" },
    { label: "Planes Online", href: "/#planes" },
    { label: "Productos", href: "/#tienda" },
  ],
  legal: [
    { label: "Privacidad", href: "/privacidad" },
    { label: "Términos", href: "/terminos" },
    { label: "Cookies", href: "/cookies" },
  ],
};

export const PRICING = {
  currency: "EUR",
  plans: [
    { name: "Básico", price: 29, period: "mes" },
    { name: "Pro", price: 49, period: "mes" },
    { name: "Elite", price: 79, period: "mes" },
  ],
};

export const TRAINING_LEVELS = ["Principiante", "Intermedio", "Avanzado"] as const;
export const TRAINING_GOALS = ["Perder grasa", "Ganar músculo", "Resistencia", "Fuerza", "Flexibilidad"] as const;
export const EQUIPMENT_OPTIONS = ["Sin equipamiento", "Mancuernas", "Gimnasio completo"] as const;

export const MEAL_TYPES = ["Desayuno", "Almuerzo", "Merienda", "Cena"] as const;
export const DIETARY_PREFERENCES = ["Normal", "Vegetariano", "Vegano", "Sin gluten", "Sin lactosa"] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
