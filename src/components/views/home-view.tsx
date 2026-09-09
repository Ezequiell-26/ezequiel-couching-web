"use client";

import { Hero } from "@/components/sections/hero";
import { TrustBar } from "@/components/sections/trust-bar";
import { ValueProps } from "@/components/sections/value-props";
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
 * Home — orden de conversión de la especificación:
 * hero → confianza → propuesta de valor → método → servicios → resultados →
 * productos digitales → herramientas → guía gratuita → testimonios → FAQ → CTA final.
 * Las secciones de marca personal/problemas/quiz/oferta viven en #/coaching.
 *
 * RESTAURADO VERBATIM desde evidencia leída en vivo (Task 22-a).
 */
export function HomeView() {
  return (
    <>
      <Hero />
      <TrustBar />
      <ValueProps />
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
