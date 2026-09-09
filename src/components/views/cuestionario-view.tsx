"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { z } from "zod";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { Reveal } from "@/components/site/reveal";
import { SuccessNote, LoadingState } from "@/components/site/states";
import { CTAButton } from "@/components/site/cta-button";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { track } from "@/lib/analytics";
import { intakeSchema, quizSteps } from "@/lib/content/quiz";

/* ------------------------------------------------------------------ */
/* Tipos y esquemas por paso                                           */
/* ------------------------------------------------------------------ */

type FormState = {
  name: string;
  email: string;
  age: string;
  sex: string;
  heightCm: string;
  weightKg: string;
  goal: string;
  experience: string;
  daysPerWeek: string;
  equipment: string;
  injuries: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;
type StepId = (typeof quizSteps)[number]["id"];
type StepSchema = z.ZodType<unknown, z.ZodTypeDef, unknown>;

/** Validación por paso: un pick() del esquema completo por cada etapa. */
const STEP_SCHEMAS: Record<StepId, StepSchema> = {
  identity: intakeSchema.pick({ name: true, email: true }),
  body: intakeSchema.pick({ age: true, sex: true, heightCm: true, weightKg: true }),
  goal: intakeSchema.pick({ goal: true, experience: true }),
  context: intakeSchema.pick({ daysPerWeek: true, equipment: true, injuries: true, message: true }),
};

const STEP_COPY: Record<StepId, string> = {
  identity: "Para responderte y enviarte la propuesta por email.",
  body: "Tu punto de partida real: sin datos no hay plan serio.",
  goal: "Qué quieres conseguir y de dónde partes.",
  context: "Disponibilidad, material y lesiones. Los campos opcionales puedes dejarlos vacíos.",
};

/** Mensaje cuando el campo requerido llega vacío. */
const REQUIRED_MSG: Partial<Record<keyof FormState, string>> = {
  name: "Escribe tu nombre",
  email: "Escribe tu email",
  age: "Indica tu edad",
  sex: "Elige una opción",
  heightCm: "Indica tu altura en cm",
  weightKg: "Indica tu peso en kg",
  goal: "Elige tu objetivo",
  experience: "Elige tu experiencia",
  daysPerWeek: "Elige cuántos días puedes entrenar",
  equipment: "Elige tu material",
};

/** Traducción de errores de enum del esquema a mensajes en español. */
const ENUM_MSG: Partial<Record<keyof FormState, string>> = {
  sex: "Elige una opción válida",
  goal: "Elige tu objetivo",
  experience: "Elige tu experiencia",
  equipment: "Elige tu material",
  daysPerWeek: "Elige cuántos días puedes entrenar",
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  age: "",
  sex: "",
  heightCm: "",
  weightKg: "",
  goal: "",
  experience: "",
  daysPerWeek: "",
  equipment: "",
  injuries: "",
  message: "",
};

const GOAL_OPTIONS: { value: string; label: string }[] = [
  { value: "perder_grasa", label: "Perder grasa" },
  { value: "ganar_musculo", label: "Ganar músculo" },
  { value: "rendimiento", label: "Rendimiento" },
  { value: "salud", label: "Salud general" },
];

const EXPERIENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "nunca", label: "Nunca he entrenado" },
  { value: "menos_1_ano", label: "Menos de 1 año" },
  { value: "1_3_anos", label: "Entre 1 y 3 años" },
  { value: "mas_3_anos", label: "Más de 3 años" },
];

const EQUIPMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "gimnasio", label: "Gimnasio" },
  { value: "casa_minimo", label: "Casa con material mínimo" },
  { value: "peso_corporal", label: "Peso corporal" },
];

const SEX_OPTIONS: { value: string; label: string }[] = [
  { value: "hombre", label: "Hombre" },
  { value: "mujer", label: "Mujer" },
];

const DAYS_OPTIONS = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
  value: String(n),
  label: n === 1 ? "1 día" : `${n} días`,
}));

type IntakeResponse = {
  ok?: boolean;
  id?: number;
  error?: string;
  estimate?: { bmr?: number; tdee?: number };
};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

/**
 * Cuestionario inicial (#/cuestionario) — wizard de 4 pasos guiado por quizSteps.
 * Cada paso valida con intakeSchema.pick() antes de avanzar; el envío hace
 * POST /api/intake y muestra la estimación TMB/TDEE del servidor.
 */
export function CuestionarioView() {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<{ id: number | null; bmr: number | null; tdee: number | null } | null>(null);

  const step = quizSteps[stepIndex];
  const total = quizSteps.length;
  const isLast = stepIndex === total - 1;
  const progressPct = Math.round(((stepIndex + 1) / total) * 100);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitError("");
  };

  function validateStep(stepId: StepId): boolean {
    const parsed = STEP_SCHEMAS[stepId].safeParse({ ...form });
    if (parsed.success) {
      setErrors({});
      return true;
    }
    const next: FormErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof FormState | undefined;
      if (!field || next[field]) continue;
      const raw = (form[field] ?? "").trim();
      next[field] = raw === "" ? (REQUIRED_MSG[field] ?? "Campo obligatorio") : (ENUM_MSG[field] ?? issue.message);
    }
    setErrors(next);
    return false;
  }

  function next() {
    if (!validateStep(step.id)) return;
    if (isLast) {
      void submit();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function back() {
    if (sending || stepIndex === 0) return;
    setSubmitError("");
    setStepIndex((i) => i - 1);
  }

  async function submit() {
    if (sending) return;
    // Último control con el esquema completo antes de salir a la red.
    const parsed = intakeSchema.safeParse({ ...form });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = String(issue?.path[0] ?? "");
      const idx = quizSteps.findIndex((s) => (s.fields as readonly string[]).includes(field));
      if (idx >= 0) setStepIndex(idx);
      const raw = (form[field as keyof FormState] ?? "").trim();
      setErrors({ [field]: raw === "" ? (REQUIRED_MSG[field as keyof FormState] ?? "Campo obligatorio") : issue?.message ?? "Revisa los datos" });
      return;
    }

    setSending(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      const data = (await res.json()) as IntakeResponse;
      if (!res.ok || !data.ok) {
        setSubmitError(data.error ?? "No pudimos enviar tu cuestionario. Inténtalo de nuevo.");
        return;
      }
      track("intake_submit", { steps: quizSteps.length });
      setResult({
        id: typeof data.id === "number" ? data.id : null,
        bmr: typeof data.estimate?.bmr === "number" ? data.estimate.bmr : null,
        tdee: typeof data.estimate?.tdee === "number" ? data.estimate.tdee : null,
      });
      toast({ title: "Cuestionario enviado", description: "Te responderé lo antes posible." });
    } catch {
      setSubmitError("Error de red. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  }

  /* ---------------------------- Éxito ---------------------------- */
  if (result) {
    return (
      <>
        <PageHeader
          eyebrow="Cuestionario inicial"
          title="Recibido. Ahora me toca a mí"
          breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Cuestionario" }]}
        />
        <section aria-labelledby="quiz-ok" className="py-12 sm:py-16">
          <Container className="max-w-2xl">
            <h2 id="quiz-ok" className="sr-only">Cuestionario enviado</h2>
            <SuccessNote message="Cuestionario enviado. Te responderé lo antes posible." />

            {result.id != null ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Referencia de tu envío: <span className="font-mono font-semibold text-foreground">#{result.id}</span>
              </p>
            ) : null}

            {result.bmr != null || result.tdee != null ? (
              <div className="mt-6 rounded-xl border border-border bg-card p-5 sm:p-6">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Estimación orientativa</p>
                <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                  {result.bmr != null ? (
                    <div>
                      <dt className="text-sm text-muted-foreground">Metabolismo basal (TMB)</dt>
                      <dd className="mt-1 text-2xl font-bold tracking-tight">
                        {Math.round(result.bmr)} <span className="text-sm font-medium text-muted-foreground">kcal/día</span>
                      </dd>
                    </div>
                  ) : null}
                  {result.tdee != null ? (
                    <div>
                      <dt className="text-sm text-muted-foreground">Gasto total estimado (TDEE)</dt>
                      <dd className="mt-1 text-2xl font-bold tracking-tight">
                        {Math.round(result.tdee)} <span className="text-sm font-medium text-muted-foreground">kcal/día</span>
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  Estimación orientativa con Mifflin-St Jeor. Es un punto de partida con fórmulas publicadas, no un
                  diagnóstico: en la propuesta se ajusta con tu contexto real.
                </p>
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              <CTAButton variant="outline" view="metodo" source="cuestionario" withArrow={false}>
                Ver el método
              </CTAButton>
              <CTAButton variant="ghost" view="home" source="cuestionario" withArrow={false}>
                Volver al inicio
              </CTAButton>
            </div>
          </Container>
        </section>
      </>
    );
  }

  /* --------------------------- Wizard ---------------------------- */
  return (
    <>
      <PageHeader
        eyebrow="Cuestionario inicial"
        title="Cuéntame tu situación"
        description="Cuatro pasos cortos: identidad, punto de partida, objetivo y contexto. Con esto preparo una propuesta honesta, sin compromiso."
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Cuestionario" }]}
      />

      <section aria-labelledby="quiz-form" className="py-12 sm:py-16">
        <Container className="max-w-2xl">
          <h2 id="quiz-form" className="sr-only">Formulario del cuestionario</h2>

          {/* Progreso */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <p>
                Paso <span className="font-semibold text-foreground">{stepIndex + 1}</span> de {total} ·{" "}
                <span className="font-medium text-foreground">{step.title}</span>
              </p>
              <p aria-hidden className="font-mono">{progressPct}%</p>
            </div>
            <div
              role="progressbar"
              aria-label={`Progreso del cuestionario: paso ${stepIndex + 1} de ${total}`}
              aria-valuemin={1}
              aria-valuemax={total}
              aria-valuenow={stepIndex + 1}
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progressPct}%` }} />
            </div>
            <ol className="mt-3 flex flex-wrap gap-1.5" aria-label="Pasos del cuestionario">
              {quizSteps.map((s, i) => {
                const done = i < stepIndex;
                const active = i === stepIndex;
                return (
                  <li key={s.id} aria-current={active ? "step" : undefined}>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                        active
                          ? "border-primary bg-primary/10 text-foreground"
                          : done
                            ? "border-primary/40 text-muted-foreground"
                            : "border-border text-muted-foreground"
                      }`}
                    >
                      {done ? <Check aria-hidden className="size-3 text-primary" /> : null}
                      {s.title}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <Reveal>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                next();
              }}
              noValidate
              className="rounded-xl border border-border bg-card p-5 sm:p-6"
            >
              <p className="text-sm leading-relaxed text-muted-foreground">{STEP_COPY[step.id]}</p>

              {step.id === "identity" ? (
                <div className="mt-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="quiz-name">Nombre *</Label>
                    <Input
                      id="quiz-name"
                      value={form.name}
                      onChange={set("name")}
                      placeholder="Tu nombre"
                      autoComplete="name"
                      maxLength={80}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? "quiz-name-err" : undefined}
                    />
                    <FieldError id="quiz-name-err" message={errors.name} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="quiz-email">Email *</Label>
                    <Input
                      id="quiz-email"
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      placeholder="tu@email.com"
                      autoComplete="email"
                      maxLength={120}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "quiz-email-err" : undefined}
                    />
                    <FieldError id="quiz-email-err" message={errors.email} />
                  </div>
                </div>
              ) : null}

              {step.id === "body" ? (
                <div className="mt-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="quiz-age">Edad *</Label>
                      <Input
                        id="quiz-age"
                        type="number"
                        inputMode="numeric"
                        min={14}
                        max={90}
                        value={form.age}
                        onChange={set("age")}
                        placeholder="Años"
                        aria-invalid={Boolean(errors.age)}
                        aria-describedby={errors.age ? "quiz-age-err" : undefined}
                      />
                      <FieldError id="quiz-age-err" message={errors.age} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="quiz-sex">Sexo *</Label>
                      <Select
                        id="quiz-sex"
                        value={form.sex}
                        onChange={set("sex")}
                        aria-invalid={Boolean(errors.sex)}
                        aria-describedby={errors.sex ? "quiz-sex-err" : undefined}
                      >
                        <option value="">Elige…</option>
                        {SEX_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </Select>
                      <FieldError id="quiz-sex-err" message={errors.sex} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="quiz-height">Altura (cm) *</Label>
                      <Input
                        id="quiz-height"
                        type="number"
                        inputMode="decimal"
                        min={120}
                        max={230}
                        value={form.heightCm}
                        onChange={set("heightCm")}
                        placeholder="Ej. 175"
                        aria-invalid={Boolean(errors.heightCm)}
                        aria-describedby={errors.heightCm ? "quiz-height-err" : undefined}
                      />
                      <FieldError id="quiz-height-err" message={errors.heightCm} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="quiz-weight">Peso (kg) *</Label>
                      <Input
                        id="quiz-weight"
                        type="number"
                        inputMode="decimal"
                        min={35}
                        max={300}
                        value={form.weightKg}
                        onChange={set("weightKg")}
                        placeholder="Ej. 72"
                        aria-invalid={Boolean(errors.weightKg)}
                        aria-describedby={errors.weightKg ? "quiz-weight-err" : undefined}
                      />
                      <FieldError id="quiz-weight-err" message={errors.weightKg} />
                    </div>
                  </div>
                </div>
              ) : null}

              {step.id === "goal" ? (
                <div className="mt-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="quiz-goal">Objetivo principal *</Label>
                    <Select
                      id="quiz-goal"
                      value={form.goal}
                      onChange={set("goal")}
                      aria-invalid={Boolean(errors.goal)}
                      aria-describedby={errors.goal ? "quiz-goal-err" : undefined}
                    >
                      <option value="">Elige tu objetivo…</option>
                      {GOAL_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </Select>
                    <FieldError id="quiz-goal-err" message={errors.goal} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="quiz-experience">Experiencia entrenando *</Label>
                    <Select
                      id="quiz-experience"
                      value={form.experience}
                      onChange={set("experience")}
                      aria-invalid={Boolean(errors.experience)}
                      aria-describedby={errors.experience ? "quiz-experience-err" : undefined}
                    >
                      <option value="">Elige tu experiencia…</option>
                      {EXPERIENCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </Select>
                    <FieldError id="quiz-experience-err" message={errors.experience} />
                  </div>
                </div>
              ) : null}

              {step.id === "context" ? (
                <div className="mt-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="quiz-days">Días por semana que puedes entrenar *</Label>
                      <Select
                        id="quiz-days"
                        value={form.daysPerWeek}
                        onChange={set("daysPerWeek")}
                        aria-invalid={Boolean(errors.daysPerWeek)}
                        aria-describedby={errors.daysPerWeek ? "quiz-days-err" : undefined}
                      >
                        <option value="">Elige…</option>
                        {DAYS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </Select>
                      <FieldError id="quiz-days-err" message={errors.daysPerWeek} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="quiz-equipment">Material disponible *</Label>
                      <Select
                        id="quiz-equipment"
                        value={form.equipment}
                        onChange={set("equipment")}
                        aria-invalid={Boolean(errors.equipment)}
                        aria-describedby={errors.equipment ? "quiz-equipment-err" : undefined}
                      >
                        <option value="">Elige tu material…</option>
                        {EQUIPMENT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </Select>
                      <FieldError id="quiz-equipment-err" message={errors.equipment} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="quiz-injuries">Lesiones o molestias (opcional)</Label>
                    <Textarea
                      id="quiz-injuries"
                      value={form.injuries}
                      onChange={set("injuries")}
                      placeholder="Ej. molestia lumbar al sentadilla, hombro derecho…"
                      rows={3}
                      maxLength={500}
                      aria-describedby="quiz-injuries-hint"
                    />
                    <p id="quiz-injuries-hint" className="text-xs text-muted-foreground">
                      Ante dolor agudo o lesión sin diagnosticar, la recomendación es valoración médica previa.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="quiz-message">Algo más que deba saber (opcional)</Label>
                    <Textarea
                      id="quiz-message"
                      value={form.message}
                      onChange={set("message")}
                      placeholder="Horarios, deporte que practicas, objetivos a plazo…"
                      rows={4}
                      maxLength={1000}
                    />
                  </div>
                </div>
              ) : null}

              {submitError ? (
                <p role="alert" className="mt-5 text-sm text-destructive">{submitError}</p>
              ) : null}

              {sending ? (
                <div className="mt-6">
                  <LoadingState label="Enviando tu cuestionario…" />
                </div>
              ) : (
                <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={back}
                    disabled={stepIndex === 0}
                    className="min-h-11 w-full sm:w-auto"
                  >
                    <ArrowLeft aria-hidden />
                    Atrás
                  </Button>
                  <Button type="submit" className="min-h-11 w-full sm:w-auto">
                    {isLast ? "Enviar cuestionario" : "Continuar"}
                    <ArrowRight aria-hidden />
                  </Button>
                </div>
              )}

              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                Los datos se usan solo para preparar tu propuesta, según la Política de privacidad.
              </p>
            </form>
          </Reveal>
        </Container>
      </section>

      {/* Siguiente paso */}
      <section aria-labelledby="quiz-siguiente" className="pb-16 sm:pb-20">
        <Container>
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <h2 id="quiz-siguiente" className="text-xl font-bold tracking-tight">Siguiente paso</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Mientras esperas la respuesta, puedes ver cómo trabajamos o qué incluye cada nivel de coaching.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <CTAButton variant="outline" view="metodo" source="cuestionario" withArrow={false}>
                Ver el método
              </CTAButton>
              <CTAButton variant="ghost" view="coaching" source="cuestionario" withArrow={false}>
                Ver coaching
              </CTAButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
