import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/** Sitemap de hashes: el router SPA expone las mismas secciones que #/vista. */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/coaching",
    "/planes",
    "/tienda",
    "/metodo",
    "/resultados",
    "/calculadoras",
    "/contador-de-calorias",
    "/ejercicios",
    "/mi-zona",
    "/progreso",
    "/blog",
    "/faq",
    "/guia-gratis",
    "/cuestionario",
    "/contacto",
    "/privacidad",
    "/terminos",
    "/aviso-legal",
    "/politica-de-cookies",
  ];
  const now = new Date();
  return routes.map((r) => ({
    url: `${SITE_URL}/${r ? `#${r.slice(1)}` : ""}`.replace(/#$/, "#/"),
    lastModified: now,
    changeFrequency: r === "" ? "weekly" : "monthly",
    priority: r === "" ? 1 : 0.6,
  }));
}
