"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { track } from "@/lib/analytics";

/**
 * Formulario del lead magnet (guía gratuita).
 * Envío real a POST /api/leads. Si el email del titular aún no está
 * configurado, el lead queda registrado y la UI lo indica con honestidad.
 */
export function GuideLeadForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [note, setNote] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined, source: "guia-gratis" }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; note?: string };
      if (!res.ok || !data.ok) {
        setState("error");
        setNote(data.error ?? "No pudimos registrar tu solicitud. Inténtalo de nuevo.");
        return;
      }
      track("lead_submit", { source: "guia-gratis" });
      setNote(data.note ?? "");
      setState("done");
    } catch {
      setState("error");
      setNote("Error de red. Comprueba tu conexión e inténtalo de nuevo.");
    }
  }

  if (state === "done") {
    return (
      <div role="status" className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
        ¡Solicitud registrada! Te enviaremos la guía a la dirección indicada.
        {note ? <span className="mt-1 block text-muted-foreground">{note}</span> : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={compact ? "space-y-3" : "space-y-4"}>
      <div className={compact ? "space-y-3" : "grid gap-4 sm:grid-cols-2"}>
        <div className="space-y-1.5">
          <Label htmlFor={`gl-name-${compact ? "c" : "f"}`}>Nombre</Label>
          <Input
            id={`gl-name-${compact ? "c" : "f"}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            autoComplete="name"
            maxLength={80}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`gl-email-${compact ? "c" : "f"}`}>Email *</Label>
          <Input
            id={`gl-email-${compact ? "c" : "f"}`}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
            maxLength={120}
          />
        </div>
      </div>
      <Button type="submit" disabled={state === "sending"} className="w-full sm:w-auto">
        <Mail aria-hidden />
        {state === "sending" ? "Enviando…" : "Quiero la guía gratuita"}
      </Button>
      {state === "error" ? (
        <p role="alert" className="text-sm text-destructive">{note}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Al enviar aceptas recibir el recurso y comunicaciones del servicio. Puedes darte de
          baja en cualquier momento. Más info en Privacidad.
        </p>
      )}
    </form>
  );
}
