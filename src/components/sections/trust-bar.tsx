import { Dumbbell, LineChart, Calculator, MessagesSquare } from "lucide-react";
import { Container } from "@/components/site/container";

const ITEMS = [
  { icon: Dumbbell, title: "Planes personalizados", sub: "Según tus objetivos" },
  { icon: LineChart, title: "Seguimiento real", sub: "De tu progreso" },
  { icon: Calculator, title: "Herramientas", sub: "Calculadoras y contador" },
  { icon: MessagesSquare, title: "Tu coach", sub: "Directo, sin intermediarios" },
] as const;

/** Banda de valor tipo referencia: frase de marca + 4 columnas icono+texto. */
export function TrustBar() {
  return (
    <section aria-label="Qué garantiza el servicio" className="border-y border-border/60 bg-card/40">
      <Container className="grid gap-6 py-8 lg:grid-cols-[1.1fr_2fr] lg:items-center lg:gap-10">
        <p className="text-balance text-xl font-bold tracking-tight sm:text-2xl">
          Más que una web, <span className="text-primary">es tu entrenador personal.</span>
        </p>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          {ITEMS.map((item) => (
            <li key={item.title} className="flex items-start gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <item.icon aria-hidden className="size-4.5" />
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-semibold">{item.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{item.sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
