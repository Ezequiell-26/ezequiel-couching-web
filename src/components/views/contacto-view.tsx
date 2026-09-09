"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { Reveal } from "@/components/site/reveal";
import { CTAButton } from "@/components/site/cta-button";
import { SuccessNote } from "@/components/site/states";
import { PlaceholderNote } from "@/components/site/placeholder-note";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { track } from "@/lib/analytics";
import { site } from "@/lib/content/site";

type FormState = { name: string; email: string; body: string };
type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY: FormState = { name: "", email: "", body: "" };

/**
 * Contacto (#/contacto) — formulario real (POST /api/contact).
 * Validación mínima en cliente; errores del servidor mostrados tal cual.
 */
export function ContactoView() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [state, setState] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [serverError, setServerError] = useState("");

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  function validate(): boolean {
    const next: FormErrors = {};
    if (form.name.trim().length < 2) next.name = "Escribe tu nombre";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "Email no válido";
    if (form.body.trim().length < 10) next.body = "Cuéntanos algo más (mín. 10 caracteres)";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setServerError("");
    if (!validate()) return;

    setState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), body: form.body.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setServerError(data.error ?? "No pudimos enviar tu mensaje. Inténtalo de nuevo.");
        setState("error");
        return;
      }
      track("contact_submit");
      setForm(EMPTY);
      setState("ok");
      toast({ title: "Mensaje enviado", description: "Te responderé lo antes posible." });
    } catch {
      setServerError("Error de red. Comprueba tu conexión e inténtalo de nuevo.");
      setState("error");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Contacto"
        title="Escríbeme"
        description="Dudas sobre los servicios, propuestas o colaboración. Respondo personalmente, normalmente en días laborables."
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Contacto" }]}
      />

      <section aria-labelledby="contacto-form" className="py-12 sm:py-16">
        <Container className="max-w-2xl">
          <h2 id="contacto-form" className="sr-only">Formulario de contacto</h2>

          {site.email.startsWith("[SUSTITUIR") ? (
            <PlaceholderNote className="mb-6">
              Email de contacto pendiente de configurar ({site.email}): usa este formulario mientras tanto.
            </PlaceholderNote>
          ) : null}

          {state === "ok" ? (
            <SuccessNote message="Mensaje enviado. Te responderé lo antes posible." />
          ) : null}

          <Reveal>
            <form onSubmit={submit} noValidate className="mt-2 space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
              <div className="space-y-1.5">
                <Label htmlFor="contacto-name">Nombre *</Label>
                <Input
                  id="contacto-name"
                  value={form.name}
                  onChange={set("name")}
                  placeholder="Tu nombre"
                  autoComplete="name"
                  maxLength={80}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "contacto-name-err" : undefined}
                />
                {errors.name ? (
                  <p id="contacto-name-err" className="text-sm text-destructive">{errors.name}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contacto-email">Email *</Label>
                <Input
                  id="contacto-email"
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  maxLength={120}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "contacto-email-err" : undefined}
                />
                {errors.email ? (
                  <p id="contacto-email-err" className="text-sm text-destructive">{errors.email}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contacto-body">Mensaje *</Label>
                <Textarea
                  id="contacto-body"
                  value={form.body}
                  onChange={set("body")}
                  placeholder="Cuéntame qué necesitas: objetivo, situación actual, dudas…"
                  rows={6}
                  maxLength={2000}
                  aria-invalid={Boolean(errors.body)}
                  aria-describedby={errors.body ? "contacto-body-err" : undefined}
                />
                {errors.body ? (
                  <p id="contacto-body-err" className="text-sm text-destructive">{errors.body}</p>
                ) : null}
              </div>

              {state === "error" && serverError ? (
                <p role="alert" className="text-sm text-destructive">{serverError}</p>
              ) : null}

              <Button type="submit" disabled={state === "sending"} className="min-h-11 w-full sm:w-auto">
                <Send aria-hidden />
                {state === "sending" ? "Enviando…" : "Enviar mensaje"}
              </Button>

              <p className="text-xs leading-relaxed text-muted-foreground">
                Al enviar aceptas que tratemos tus datos para responder a tu consulta, según la Política de
                privacidad. No se usan para publicidad.
              </p>
            </form>
          </Reveal>
        </Container>
      </section>

      {/* Siguiente paso */}
      <section aria-labelledby="contacto-siguiente" className="pb-16 sm:pb-20">
        <Container>
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h2 id="contacto-siguiente" className="text-xl font-bold tracking-tight">Siguiente paso</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Si lo que quieres es empezar a entrenar, el cuestionario inicial recoge todo lo necesario para
              prepararte una propuesta concreta.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <CTAButton view="cuestionario" event="cta_click" eventProps={{ label: "cta_contacto" }} source="contacto">
                Rellenar el cuestionario
              </CTAButton>
              <CTAButton variant="outline" view="coaching" source="contacto" withArrow={false}>
                Ver servicios de coaching
              </CTAButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
