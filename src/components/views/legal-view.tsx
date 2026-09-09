"use client";

import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { PlaceholderNote } from "@/components/site/placeholder-note";
import { legalSections } from "@/lib/content/legal";

type LegalDoc = "privacidad" | "terminos" | "aviso" | "cookies";

const DOC_TITLES: Record<LegalDoc, string> = {
  aviso: "Aviso legal",
  privacidad: "Política de privacidad",
  cookies: "Política de cookies",
  terminos: "Términos y condiciones",
};

/**
 * Legal (#/privacidad, #/terminos, #/aviso-legal, #/politica-de-cookies).
 * Un solo componente para los cuatro documentos; contenido de legalSections.
 * Termina SIN bloque de siguiente paso (página legal).
 */
export function LegalView({ doc }: { doc: "privacidad" | "terminos" | "aviso" | "cookies" }) {
  const sections = legalSections[doc];

  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title={DOC_TITLES[doc]}
        description="Texto base conforme a LSSI-CE / RGPD. Los datos entre corchetes deben sustituirse con los del titular antes de publicar."
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: DOC_TITLES[doc] }]}
      />

      <section aria-label={`Contenido: ${DOC_TITLES[doc]}`} className="py-12 sm:py-16">
        <Container className="max-w-3xl">
          {sections.map((s) => (
            <section key={s.h} aria-labelledby={`legal-${s.h}`} className="mb-8 last:mb-0">
              <h2 id={`legal-${s.h}`} className="text-xl font-bold tracking-tight sm:text-2xl">
                {s.h}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{s.p}</p>
            </section>
          ))}

          <PlaceholderNote className="mt-10">
            Sustituir los datos [entre corchetes] con los del titular antes de publicar.
          </PlaceholderNote>
        </Container>
      </section>
    </>
  );
}
