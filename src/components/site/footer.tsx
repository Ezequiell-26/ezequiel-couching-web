"use client";

import { useRouter } from "@/lib/router";
import { track } from "@/lib/analytics";
import { site } from "@/lib/content/site";
import { Logo } from "./logo";
import { Container } from "./container";

const COLUMNS: { title: string; links: { label: string; view: Parameters<ReturnType<typeof useRouter.getState>["navigate"]>[0] }[] }[] = [
  {
    title: "Entrenamiento",
    links: [
      { label: "Coaching", view: "coaching" },
      { label: "Planes", view: "planes" },
      { label: "Método", view: "metodo" },
      { label: "Resultados", view: "resultados" },
    ],
  },
  {
    title: "Herramientas",
    links: [
      { label: "Calculadoras", view: "calculadoras" },
      { label: "Contador de calorías", view: "contador" },
      { label: "Ejercicios", view: "biblioteca" },
      { label: "Mi Zona", view: "zona" },
      { label: "Mi progreso", view: "progreso" },
      { label: "Mi panel", view: "dashboard" },
    ],
  },
  {
    title: "Contenido",
    links: [
      { label: "Tienda", view: "tienda" },
      { label: "Blog", view: "blog" },
      { label: "Guía gratuita", view: "guia-gratis" },
      { label: "Preguntas frecuentes", view: "faq" },
      { label: "Contacto", view: "contacto" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Aviso legal", view: "aviso-legal" },
      { label: "Privacidad", view: "privacidad" },
      { label: "Cookies", view: "cookies" },
      { label: "Términos", view: "terminos" },
    ],
  },
];

export function Footer() {
  const navigate = useRouter((s) => s.navigate);

  return (
    <footer className="mt-auto border-t border-border/70 bg-background" role="contentinfo">
      <Container className="pb-8 pt-12 sm:pb-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
          <div className="col-span-2">
            <Logo variant="full" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {site.tagline}
            </p>
            {site.socials.length > 0 ? (
              <ul className="mt-4 flex gap-3" aria-label="Redes sociales">
                {site.socials.map((s) => (
                  <li key={s.label}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {col.title}
              </h3>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <button
                      type="button"
                      onClick={() => {
                        track("nav_click", { label: l.label.toLowerCase(), area: "footer" });
                        navigate(l.view);
                      }}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {site.name}. Todos los derechos reservados.
          </p>
          <button
            type="button"
            onClick={() => {
              track("nav_click", { label: "back-to-top" });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            ↑ Volver arriba
          </button>
        </div>
      </Container>
    </footer>
  );
}
