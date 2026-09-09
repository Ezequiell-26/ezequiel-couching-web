"use client";

import { ClipboardList, LineChart, Calculator, MessagesSquare } from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";
import { valueProps } from "@/lib/content/site";

const ICONS = { clipboard: ClipboardList, "line-chart": LineChart, calculator: Calculator, "messages-square": MessagesSquare } as const;

export function ValueProps() {
  return (
    <section aria-labelledby="value-props-title" className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Por qué funciona"
          title="Un sistema, no una rutina suelta"
          description="Todo lo que ofrece el servicio está pensado para que puedas sostener el esfuerzo en el tiempo."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((v, i) => {
            const Icon = ICONS[v.icon as keyof typeof ICONS] ?? ClipboardList;
            return (
              <Reveal key={v.title} delay={0.05 * i}>
                <div className="h-full rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
                  <div className="mb-3 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="text-base font-semibold">{v.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
