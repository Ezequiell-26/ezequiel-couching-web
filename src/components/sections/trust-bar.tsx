import { Container } from "@/components/site/container";
import { trustClaims } from "@/lib/content/site";

export function TrustBar() {
  return (
    <section aria-label="Qué garantiza el servicio" className="border-y border-border/60 bg-card/40">
      <Container className="grid grid-cols-2 gap-3 py-5 sm:grid-cols-4">
        {trustClaims.map((claim) => (
          <p key={claim} className="flex items-center justify-center gap-2 text-center text-xs font-medium text-muted-foreground sm:text-sm">
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
            {claim}
          </p>
        ))}
      </Container>
    </section>
  );
}
