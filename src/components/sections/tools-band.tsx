"use client";

import { ArrowRight } from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";
import { useRouter } from "@/lib/router";

const TOOLS = [
  {
    view: "calculadoras" as const,
    title: "Calculadoras fitness",
    body: "IMC, calorías (Mifflin-St Jeor), macros, 1RM, grasa corporal, agua y peso ideal. Fórmulas publicadas, resultados explicados.",
    cta: "Abrir calculadoras",
  },
  {
    view: "contador" as const,
    title: "Contador de calorías",
    body: "Registra tus comidas del día y compara con tu objetivo. Todo se guarda en tu dispositivo, sin cuentas.",
    cta: "Abrir contador",
  },
  {
    view: "recetas" as const,
    title: "Recetas internacionales",
    body: "Buscá por nombre o categoría y mirá ingredientes, medidas y preparación. Datos reales de TheMealDB.",
    cta: "Ver recetas",
  },
  {
    view: "progreso" as const,
    title: "Mi progreso",
    body: "Registra tu peso y tus sesiones, y mira tu evolución con gráficos claros. 100% local y privado.",
    cta: "Registrar progreso",
  },
] as const;

/** Índice de herramientas: panel único con filas numeradas (sin grid de cards). */
export function ToolsBand() {
  const navigate = useRouter((s) => s.navigate);

  return (
    <section aria-labelledby="tools-title" className="border-y border-border/60 bg-card/30 py-16 sm:py-20">
      <Container>
        <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-14">
          <SectionHeading
            eyebrow="Herramientas gratuitas"
            title="Empezá a medir hoy mismo"
            description="Uso libre y sin registro: cálculos con fórmulas reales y datos guardados solo en tu navegador."
          />

          <Reveal>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {TOOLS.map((t, i) => (
                <button
                  key={t.view}
                  type="button"
                  onClick={() => navigate(t.view)}
                  className="group flex w-full items-center gap-4 border-b border-border/60 p-5 text-left transition-colors last:border-b-0 hover:bg-accent/40"
                >
                  <span aria-hidden className="shrink-0 font-mono text-xs text-muted-foreground">
                    0{i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{t.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{t.body}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    {t.cta}
                    <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </button>
              ))}
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
