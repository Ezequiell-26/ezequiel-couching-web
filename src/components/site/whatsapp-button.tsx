import { MessageCircle } from "lucide-react";
import { site } from "@/lib/content/site";

/**
 * Botón flotante de WhatsApp. SOLO se renderiza con un número real
 * configurado en site.whatsappNumber (si está vacío no existe: sin
 * botones falsos).
 */
export function WhatsAppButton() {
  if (!site.whatsappNumber) return null;
  return (
    <a
      href={`https://wa.me/${site.whatsappNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbeme por WhatsApp"
      className="fixed bottom-5 right-5 z-40 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground glow-volt transition-transform hover:scale-105"
    >
      <MessageCircle className="size-6" aria-hidden />
    </a>
  );
}
