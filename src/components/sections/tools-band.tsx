"use client";

import { Calculator, Flame, TrendingUp } from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";
import { useRouter } from "@/lib/router";

const TOOLS = [
  {
    view: "calculadoras" as const,
    icon: Calculator,
    title: "Calculadoras fitness",
    body: "IMC, calorías (Mifflin-St Jeor), macros, 1RM, grasa corporal, agua y peso ideal. Fórmulas publicadas, resultados explicados.",
    cta: "Abrir calculadoras",
  },
  {
    view: "contador" as const,
    icon: Flame,
    title: "Contador de calorías",
    body: "Registra tus comidas del día y compara con tu objetivo. Todo se guarda en tu dispositivo, sin cuentas.",
    cta: "Abrir contador",
  },
  {
    view: "progreso" as const,
    icon: TrendingUp,
    title: "Mi progreso",
    body: "Registra tu peso y tus sesiones, y mira tu evolución con gráficos claros. 100% local y privado.",
    cta: "Registrar progreso",
  },
];

export function ToolsBand() {
  const navigate = useRouter((s) => s.navigate);

  return (
    <section aria-labelledby="tools-title" className="border-y border-border/60 bg-card/30 py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Herramientas gratuitas"
          title="Empieza a medir hoy mismo"
          description="Herramientas de uso libre, sin registro: cálculos con fórmulas reales y datos guardados solo en tu navegador."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {TOOLS.map((t, i) => (
            <Reveal key={t.view} delay={0.06 * i}>
              <article className="flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
                <div className="mb-3 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <t.icon className="size-5" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold tracking-tight">{t.title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
                <button
                  type="button"
                  onClick={() => navigate(t.view)}
                  className="mt-4 inline-flex w-fit items-center rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {t.cta}
                </button>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
