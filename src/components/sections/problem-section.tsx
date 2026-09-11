import Image from "next/image";
import { Container } from "@/components/site/container";
import { Reveal } from "@/components/site/reveal";

const PAINS = [
  {
    title: "Planes que ignoran tu contexto",
    body: "Una rutina copiada no sabe qué material tenés, cuánto tiempo disponible ni qué molestias arrastrás.",
  },
  {
    title: "Semanas iguales, cero ajuste",
    body: "Sin revisar cargas ni adherencia, el plan de la semana 6 es igual al de la semana 1.",
  },
  {
    title: "Progreso que se siente, no se mide",
    body: "Si no registrás, no sabés si esos 60 kg de hoy son realmente mejores que los del mes pasado.",
  },
] as const;

const TRACKED = ["Cargas y series", "PRs por ejercicio", "e1RM (Epley)", "Peso corporal", "Agua diaria", "Hábitos"] as const;

/**
 * "El problema": composición editorial texto + fotografía con panel de datos.
 * Cada punto corresponde a algo que la app resuelve de verdad (plan
 * personalizado, ajuste por check-in, registro con PRs/e1RM).
 */
export function ProblemSection() {
  return (
    <section aria-labelledby="problem-title" className="py-16 sm:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <Reveal>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                El problema
              </p>
              <h2
                id="problem-title"
                className="mt-3 max-w-md text-balance text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl"
              >
                Entrenar sin registro es adivinar.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                Casi nadie falla por falta de esfuerzo. Se falla entrenando a
                ciegas: sin plan claro, sin ajustes y sin datos que muestren si
                el trabajo está rindiendo.
              </p>

              <ul className="mt-8 divide-y divide-border border-y border-border">
                {PAINS.map((p, i) => (
                  <li key={p.title} className="flex gap-4 py-4">
                    <span aria-hidden className="pt-0.5 font-mono text-xs text-primary">
                      0{i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{p.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="relative">
              <div className="overflow-hidden rounded-xl border border-border">
                <Image
                  src="/images/athlete.jpg"
                  alt="Atleta preparando una barra en un gimnasio con iluminación cinematográfica"
                  width={864}
                  height={1152}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="h-auto w-full object-cover"
                />
              </div>
              {/* Panel de datos reales que la app registra */}
              <div className="rounded-lg border border-border bg-background/95 p-4 sm:absolute sm:bottom-5 sm:left-5 sm:right-auto sm:w-[300px] sm:backdrop-blur">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Lo que FITSYNC registra
                </p>
                <ul className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {TRACKED.map((t) => (
                    <li key={t} className="flex items-center gap-1.5 text-xs text-foreground/90">
                      <span aria-hidden className="size-1 shrink-0 rounded-full bg-primary" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
