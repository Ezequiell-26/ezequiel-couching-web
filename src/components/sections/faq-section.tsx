"use client";

import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/site/section-heading";
import { Accordion } from "@/components/ui/accordion";
import { useRouter } from "@/lib/router";
import { homeFaqs } from "@/lib/content/site";

export function FaqSection() {
  const navigate = useRouter((s) => s.navigate);

  return (
    <section aria-labelledby="faq-title" className="border-y border-border/60 bg-card/30 py-16 sm:py-20">
      <Container className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <SectionHeading
            eyebrow="FAQ"
            title="Dudas frecuentes"
            description="Las preguntas que llegan antes de empezar, respondidas sin letra pequeña."
          />
          <button
            type="button"
            onClick={() => navigate("faq")}
            className="mt-4 text-sm font-medium text-primary transition-colors hover:text-foreground"
          >
            Ver todas las preguntas →
          </button>
        </div>
        <Accordion items={homeFaqs} />
      </Container>
    </section>
  );
}
