"use client";

import { Hero } from "@/components/sections/hero";
import { ProblemSection } from "@/components/sections/problem-section";
import { AppShowcase } from "@/components/sections/app-showcase";
import { MethodSection } from "@/components/sections/method-section";
import { Services } from "@/components/sections/services";
import { Results } from "@/components/sections/results";
import { ShopPreview } from "@/components/sections/shop-preview";
import { ToolsBand } from "@/components/sections/tools-band";
import { LeadMagnet } from "@/components/sections/lead-magnet";
import { Testimonials } from "@/components/sections/testimonials";
import { FaqSection } from "@/components/sections/faq-section";
import { FinalCta } from "@/components/sections/final-cta";

/**
 * Home — narrativa de producto:
 * hero (mensaje + producto) → problema → Mi Zona por dentro → método →
 * servicios → resultados → productos digitales → herramientas → guía →
 * FAQ → CTA final.
 * Las secciones de marca personal/problemas/quiz/oferta viven en #/coaching.
 */
export function HomeView() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <AppShowcase />
      <MethodSection />
      <Services />
      <Results />
      <ShopPreview />
      <ToolsBand />
      <LeadMagnet />
      <Testimonials />
      <FaqSection />
      <FinalCta />
    </>
  );
}
