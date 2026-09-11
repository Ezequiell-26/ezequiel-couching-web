"use client";

import { Container } from "@/components/site/container";
import { GuideLeadForm } from "@/components/site/guide-lead-form";

export function LeadMagnet() {
  return (
    <section aria-labelledby="lead-title" className="py-16 sm:py-20">
      <Container>
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="bg-brand-halo grid gap-8 p-6 sm:p-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-primary">Guía gratuita</p>
              <h2 id="lead-title" className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
                Los fundamentos que sostienen cualquier transformación
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Una guía de inicio con la estructura de entrenamiento y las pautas de
                alimentación que aplico con cada cliente. Sin trucos: lo básico bien hecho.
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                <li>· Cómo estructurar tus semanas de entreno</li>
                <li>· Qué medir y cada cuánto tiempo</li>
                <li>· Pautas de energía y proteína para empezar</li>
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-background/60 p-5">
              <GuideLeadForm compact />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
