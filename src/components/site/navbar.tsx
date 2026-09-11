"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { cn } from "@/lib/utils";
import { useRouter, type ViewId } from "@/lib/router";
import { track } from "@/lib/analytics";
import { Logo } from "./logo";
import { CTAButton } from "./cta-button";
import { ScrollProgress } from "./scroll-progress";

interface NavItem {
  label: string;
  view: ViewId;
  anchor?: string;
  /** Elemento destacado de zona: se muestra como botón volt en desktop, no en la lista. */
  zone?: boolean;
  /** Clase extra para el <li> del menú de escritorio (p. ej. mostrarlo solo en lg). */
  desktopClassName?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", view: "home" },
  { label: "Coaching", view: "coaching" },
  { label: "Tienda", view: "tienda" },
  { label: "Ejercicios", view: "biblioteca", desktopClassName: "hidden lg:block" },
  { label: "Método", view: "metodo" },
  { label: "Resultados", view: "resultados" },
  { label: "Blog", view: "blog" },
  { label: "Contacto", view: "contacto" },
  { label: "Mi Zona", view: "zona", zone: true },
];

const SCROLL_THRESHOLD = 24;

function subscribeScroll(onChange: () => void): () => void {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

function getScrollState(): boolean {
  return window.scrollY > SCROLL_THRESHOLD;
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const view = useRouter((s) => s.view);
  const navigate = useRouter((s) => s.navigate);
  const reduce = useReducedMotionSafe();

  // Estado de scroll sin setState en efectos (react-hooks/set-state-in-effect)
  const scrolled = useSyncExternalStore(subscribeScroll, getScrollState, () => false);

  // Bloquear scroll con menú abierto + cerrar con Escape
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const go = (item: NavItem) => {
    track("nav_click", { label: item.label.toLowerCase() });
    setOpen(false);
    navigate(item.view, {}, { anchor: item.anchor });
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border/70 bg-background/85 shadow-[0_8px_30px_-12px_oklch(0_0_0/0.5)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <ScrollProgress />
      <nav
        aria-label="Navegación principal"
        className={cn(
          "relative z-50 mx-auto flex w-full max-w-6xl items-center justify-between px-3 transition-all duration-300 sm:px-6 lg:px-8",
          scrolled ? "h-14" : "h-[76px]",
        )}
      >
        <Logo
          className={cn(
            "transition-transform duration-300",
            scrolled ? "scale-90" : "scale-100",
          )}
        />

        {/* Desktop (los elementos "zone" van al área de acciones como botón destacado) */}
        <ul className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.filter((item) => !item.zone).map((item) => (
            <li key={item.label} className={item.desktopClassName}>
              <button
                type="button"
                onClick={() => go(item)}
                aria-current={view === item.view ? "page" : undefined}
                className={cn(
                  "relative rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-accent/60",
                  view === item.view || (item.view === "home" && view === "home")
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {view === item.view ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary"
                  />
                ) : null}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <CTAButton
            view="zona"
            event="cta_click"
            eventProps={{ label: "navbar-mi-zona" }}
            source="navbar"
            size="sm"
            className="hidden lg:inline-flex"
          >
            Mi Zona
          </CTAButton>

          <CTAButton
            view="cuestionario"
            event="cta_click"
            eventProps={{ label: "navbar-cuestionario" }}
            source="navbar"
            size="sm"
            className="hidden md:inline-flex"
          >
            Empezar
          </CTAButton>

          {/* Mobile: hamburger + CTA compacto */}
          <CTAButton
            view="cuestionario"
            event="cta_click"
            eventProps={{ label: "navbar-mobile-cuestionario" }}
            source="navbar-mobile"
            size="sm"
            withArrow={false}
            className="px-2.5 text-[13px] md:hidden"
          >
            Empezar
          </CTAButton>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            className="flex size-10 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent md:hidden"
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </nav>

      {/* Mobile menu: fade + slide + stagger suave */}
      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-menu"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 top-0 z-40 bg-background/97 backdrop-blur-xl md:hidden"
          >
            <div className="flex h-full flex-col px-6 pb-10 pt-24">
              <ul className="flex flex-col gap-1">
                {NAV_ITEMS.map((item, i) => (
                  <motion.li
                    key={item.label}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
                    transition={{ delay: reduce ? 0 : 0.06 * i + 0.08, duration: 0.35, ease: "easeOut" }}
                  >
                    <button
                      type="button"
                      onClick={() => go(item)}
                      className="w-full rounded-lg px-3 py-4 text-left text-2xl font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
                    >
                      <span className="mr-3 font-mono text-xs text-primary">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {item.label}
                    </button>
                  </motion.li>
                ))}
              </ul>
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : 0.4, duration: 0.4, ease: "easeOut" }}
                className="mt-auto"
                onClickCapture={() => setOpen(false)}
              >
                <CTAButton
                  view="cuestionario"
                  event="cta_click"
                  eventProps={{ label: "mobile-menu-cuestionario" }}
                  source="mobile-menu"
                  size="lg"
                  className="w-full"
                >
                  Empezar ahora
                </CTAButton>
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
