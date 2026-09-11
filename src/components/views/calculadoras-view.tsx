"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { loadProfile, saveProfile } from "@/lib/calc-profile";
import {
  ACTIVITY_FACTORS,
  bmrKatchMcArdle,
  bmrMifflin,
  bodyFatDeurenberg,
  bodyFatNavy,
  idealWeightDevine,
  idealWeightRange,
  imc,
  imcCategory,
  macroSplit,
  oneRepMax,
  tdee,
  waterLiters,
  type ActivityKey,
  type MacroGoal,
  type Sex,
} from "@/lib/nutrition";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Calculadoras — 7 herramientas con fórmulas publicadas (ver src/lib/nutrition.ts).
 * 100% local: los datos introducidos no salen del navegador. Las fórmulas son
 * estimaciones de cribado, nunca un diagnóstico.
 */

const TABS = [
  { id: "imc", label: "IMC" },
  { id: "calorias", label: "Calorías / TDEE" },
  { id: "macros", label: "Macros" },
  { id: "rm", label: "1RM" },
  { id: "grasa", label: "Grasa corporal" },
  { id: "agua", label: "Agua" },
  { id: "ideal", label: "Peso ideal" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function toNum(v: string): number {
  const n = Number(String(v).trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function fmt1(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(n);
}

function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step = "any",
  placeholder,
}: {
  id: string;
  label: string;
  unit?: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {unit ? <span className="font-normal text-muted-foreground"> · {unit}</span> : null}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11"
      />
    </div>
  );
}

function SexField({ id, value, onChange }: { id: string; value: Sex; onChange: (v: Sex) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Sexo</Label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value as Sex)} className="h-11">
        <option value="hombre">Hombre</option>
        <option value="mujer">Mujer</option>
      </Select>
    </div>
  );
}

function ActivityField({ id, value, onChange }: { id: string; value: ActivityKey; onChange: (v: ActivityKey) => void }) {
  return (
    <div className="space-y-1.5 sm:col-span-2">
      <Label htmlFor={id}>Nivel de actividad</Label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value as ActivityKey)} className="h-11">
        {Object.entries(ACTIVITY_FACTORS).map(([k, a]) => (
          <option key={k} value={k}>
            {a.label} — {a.hint}
          </option>
        ))}
      </Select>
    </div>
  );
}

function CalcResult({ children }: { children: React.ReactNode }) {
  return (
    <div aria-live="polite" className="mt-5 rounded-xl border border-primary/30 bg-primary/10 p-4 sm:p-5">
      {children}
    </div>
  );
}

function LimitationNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
      <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function errorToast(description?: string) {
  toast({ title: "Revisa los datos", description: description ?? "Introduce valores numéricos válidos.", variant: "error" });
}

/* a) IMC ------------------------------------------------------------------ */

function ImcCalc() {
  // Precarga del perfil local en el primer render (vistas client-only: window existe).
  const [profile] = React.useState(() => loadProfile());
  const [peso, setPeso] = React.useState(profile ? String(profile.weightKg) : "");
  const [altura, setAltura] = React.useState(profile ? String(profile.heightCm) : "");
  const [res, setRes] = React.useState<{ bmi: number; cat: string; min: number; max: number } | null>(null);

  function calcular(e: React.FormEvent) {
    e.preventDefault();
    const w = toNum(peso);
    const h = toNum(altura);
    if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h < 80 || h > 250) {
      errorToast("Peso en kg (p. ej. 75) y altura en cm (p. ej. 178).");
      return;
    }
    const v = imc(w, h);
    const r = idealWeightRange(h);
    setRes({ bmi: v, cat: imcCategory(v), min: r.min, max: r.max });
    track("calc_use", { name: "imc" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Índice de masa corporal (IMC)</CardTitle>
        <CardDescription>Clasificación de la OMS: peso en kg respecto a tu altura en metros al cuadrado.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={calcular} className="grid gap-4 sm:grid-cols-2">
          <NumberField id="imc-peso" label="Peso" unit="kg" value={peso} onChange={setPeso} min={20} max={400} placeholder="75" />
          <NumberField id="imc-altura" label="Altura" unit="cm" value={altura} onChange={setAltura} min={80} max={250} placeholder="178" />
          <div className="sm:col-span-2">
            <Button type="submit" size="lg">Calcular IMC</Button>
          </div>
        </form>

        {res ? (
          <CalcResult>
            <p className="text-sm text-muted-foreground">Tu IMC</p>
            <p className="text-4xl font-bold tracking-tight">{fmt1(res.bmi)}</p>
            <div className="mt-2">
              <Badge>{res.cat}</Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Peso saludable para tu altura: <span className="font-medium text-foreground">{res.min}–{res.max} kg</span> (IMC 18,5–24,9).
            </p>
          </CalcResult>
        ) : null}

        <LimitationNote>
          Estimación de cribado (OMS): no distingue masa muscular de grasa ni distribución corporal. No es un diagnóstico.
        </LimitationNote>
      </CardContent>
    </Card>
  );
}

/* b) Calorías / TDEE ------------------------------------------------------ */

function TdeeCalc() {
  const [profile] = React.useState(() => loadProfile());
  const [sex, setSex] = React.useState<Sex>(profile?.sex ?? "hombre");
  const [age, setAge] = React.useState(profile ? String(profile.age) : "");
  const [altura, setAltura] = React.useState(profile ? String(profile.heightCm) : "");
  const [peso, setPeso] = React.useState(profile ? String(profile.weightKg) : "");
  const [activity, setActivity] = React.useState<ActivityKey>(profile?.activity ?? "moderado");
  const [grasa, setGrasa] = React.useState("");
  const [res, setRes] = React.useState<{ bmr: number; tdeeVal: number; katch: number | null } | null>(null);

  function calcular(e: React.FormEvent) {
    e.preventDefault();
    const w = toNum(peso);
    const h = toNum(altura);
    const a = toNum(age);
    const bf = grasa.trim() === "" ? null : toNum(grasa);
    if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h < 80 || h > 250 || !Number.isFinite(a) || a < 10 || a > 100) {
      errorToast("Edad (10–100), altura (80–250 cm) y peso (kg) válidos.");
      return;
    }
    if (bf !== null && (!Number.isFinite(bf) || bf < 3 || bf > 60)) {
      errorToast("El % de grasa corporal debe estar entre 3 y 60.");
      return;
    }
    const bmr = bmrMifflin(sex, w, h, a);
    setRes({
      bmr,
      tdeeVal: tdee(bmr, activity),
      katch: bf !== null ? bmrKatchMcArdle(w, bf) : null,
    });
    track("calc_use", { name: "calorias" });
  }

  function guardarPerfil() {
    const w = toNum(peso);
    const h = toNum(altura);
    const a = toNum(age);
    if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h < 80 || h > 250 || !Number.isFinite(a) || a < 10 || a > 100) {
      errorToast("Completa correctamente edad, altura y peso para guardar el perfil.");
      return;
    }
    const prev = loadProfile();
    saveProfile({
      sex,
      age: a,
      heightCm: h,
      weightKg: w,
      activity,
      goal: prev?.goal ?? "mantener",
      ...(prev?.targetKcal !== undefined ? { targetKcal: prev.targetKcal } : {}),
      updatedAt: Date.now(),
    });
    toast({ title: "Perfil guardado", description: "Las demás herramientas usarán estos datos." });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calorías diarias (BMR + TDEE)</CardTitle>
        <CardDescription>
          Metabolismo basal con Mifflin-St Jeor (1990) y gasto total (BMR × factor de actividad).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={calcular} className="grid gap-4 sm:grid-cols-2">
          <SexField id="tdee-sex" value={sex} onChange={setSex} />
          <NumberField id="tdee-edad" label="Edad" unit="años" value={age} onChange={setAge} min={10} max={100} placeholder="30" />
          <NumberField id="tdee-altura" label="Altura" unit="cm" value={altura} onChange={setAltura} min={80} max={250} placeholder="178" />
          <NumberField id="tdee-peso" label="Peso" unit="kg" value={peso} onChange={setPeso} min={20} max={400} placeholder="75" />
          <NumberField
            id="tdee-grasa"
            label="% grasa corporal (opcional)"
            unit="%"
            value={grasa}
            onChange={setGrasa}
            min={3}
            max={60}
            placeholder="p. ej. 20"
          />
          <ActivityField id="tdee-actividad" value={activity} onChange={setActivity} />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" size="lg">Calcular</Button>
            <Button type="button" variant="secondary" size="lg" onClick={guardarPerfil}>
              Usar en las demás herramientas
            </Button>
          </div>
        </form>

        {res ? (
          <CalcResult>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">BMR — Mifflin-St Jeor</p>
                <p className="text-3xl font-bold tracking-tight">
                  {res.bmr} <span className="text-sm font-normal text-muted-foreground">kcal/día</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">TDEE — BMR × actividad</p>
                <p className="text-3xl font-bold tracking-tight text-primary">
                  {res.tdeeVal} <span className="text-sm font-normal text-muted-foreground">kcal/día</span>
                </p>
              </div>
            </div>
            {res.katch !== null ? (
              <p className="mt-4 rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                Comparativa Katch-McArdle (con tu % grasa):{" "}
                <span className="font-medium text-foreground">{res.katch} kcal/día</span> de BMR.
              </p>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">
                Añade tu % de grasa corporal para ver también la estimación Katch-McArdle (basada en masa magra).
              </p>
            )}
          </CalcResult>
        ) : null}

        <LimitationNote>
          Estimación orientativa con fórmulas poblacionales (Mifflin-St Jeor, 1990; Katch-McArdle si indicas % grasa). No
          sustituye una valoración profesional ni un diagnóstico.
        </LimitationNote>
      </CardContent>
    </Card>
  );
}

/* c) Macros ---------------------------------------------------------------- */

function MacrosCalc() {
  const [profile] = React.useState(() => loadProfile());
  const [sex, setSex] = React.useState<Sex>(profile?.sex ?? "hombre");
  const [age, setAge] = React.useState(profile ? String(profile.age) : "");
  const [altura, setAltura] = React.useState(profile ? String(profile.heightCm) : "");
  const [peso, setPeso] = React.useState(profile ? String(profile.weightKg) : "");
  const [activity, setActivity] = React.useState<ActivityKey>(profile?.activity ?? "moderado");
  const [goal, setGoal] = React.useState<MacroGoal>(profile?.goal ?? "mantener");
  const [res, setRes] = React.useState<{ kcal: number; proteinG: number; fatG: number; carbG: number } | null>(null);

  function calcular(e: React.FormEvent) {
    e.preventDefault();
    const w = toNum(peso);
    const h = toNum(altura);
    const a = toNum(age);
    if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h < 80 || h > 250 || !Number.isFinite(a) || a < 10 || a > 100) {
      errorToast("Edad, altura y peso válidos (o guarda tu perfil en la calculadora de calorías).");
      return;
    }
    const kcalBase = tdee(bmrMifflin(sex, w, h, a), activity);
    setRes(macroSplit(kcalBase, goal, w));
    track("calc_use", { name: "macros" });
  }

  const cards = res
    ? [
        { label: "Proteína", g: res.proteinG, kcal: res.proteinG * 4, bar: "bg-primary" },
        { label: "Grasa", g: res.fatG, kcal: res.fatG * 9, bar: "bg-accent" },
        { label: "Carbohidratos", g: res.carbG, kcal: res.carbG * 4, bar: "bg-secondary" },
      ]
    : [];
  const totKcal = cards.reduce((acc, c) => acc + c.kcal, 0) || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reparto de macronutrientes</CardTitle>
        <CardDescription>
          Parte de tu TDEE (Mifflin-St Jeor × actividad) y ajusta según el objetivo: proteína por kg, grasa en % y el resto en
          carbos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={calcular} className="grid gap-4 sm:grid-cols-2">
          <SexField id="mac-sex" value={sex} onChange={setSex} />
          <NumberField id="mac-edad" label="Edad" unit="años" value={age} onChange={setAge} min={10} max={100} placeholder="30" />
          <NumberField id="mac-altura" label="Altura" unit="cm" value={altura} onChange={setAltura} min={80} max={250} placeholder="178" />
          <NumberField id="mac-peso" label="Peso" unit="kg" value={peso} onChange={setPeso} min={20} max={400} placeholder="75" />
          <ActivityField id="mac-actividad" value={activity} onChange={setActivity} />
          <div className="space-y-1.5">
            <Label htmlFor="mac-goal">Objetivo</Label>
            <Select id="mac-goal" value={goal} onChange={(e) => setGoal(e.target.value as MacroGoal)} className="h-11">
              <option value="perder">Perder grasa (−400 kcal)</option>
              <option value="mantener">Mantener peso</option>
              <option value="ganar">Ganar músculo (+300 kcal)</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" size="lg">Calcular macros</Button>
          </div>
        </form>

        {res ? (
          <CalcResult>
            <p className="text-sm text-muted-foreground">Objetivo calórico</p>
            <p className="text-3xl font-bold tracking-tight">
              {res.kcal} <span className="text-sm font-normal text-muted-foreground">kcal/día</span>
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {cards.map((c) => (
                <div key={c.label} className="rounded-lg border border-border/70 bg-background/40 p-3">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className={cn("size-2.5 rounded-full", c.bar)} />
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</p>
                  </div>
                  <p className="mt-1 text-2xl font-bold">
                    {c.g} <span className="text-sm font-normal text-muted-foreground">g</span>
                  </p>
                  <p className="text-xs text-muted-foreground">≈ {c.kcal} kcal</p>
                </div>
              ))}
            </div>
            <div
              className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`Reparto calórico: proteína ${Math.round((cards[0].kcal / totKcal) * 100)}%, grasa ${Math.round(
                (cards[1].kcal / totKcal) * 100,
              )}%, carbohidratos ${Math.round((cards[2].kcal / totKcal) * 100)}%`}
            >
              {cards.map((c) => (
                <div key={c.label} className={c.bar} style={{ width: `${(c.kcal / totKcal) * 100}%` }} />
              ))}
            </div>
          </CalcResult>
        ) : null}

        <LimitationNote>
          Estimación de referencia (proteína 1,6–2 g/kg según objetivo, grasa 25–27% de las kcal): ajusta según tu respuesta y
          tolerancia. No es una prescripción dietética.
        </LimitationNote>
      </CardContent>
    </Card>
  );
}

/* d) 1RM ------------------------------------------------------------------- */

function OneRmCalc() {
  const [profile] = React.useState(() => loadProfile());
  const [peso, setPeso] = React.useState(profile ? String(profile.weightKg) : "");
  const [reps, setReps] = React.useState("");
  const [res, setRes] = React.useState<{ epley: number; brzycki: number; average: number } | null>(null);

  function calcular(e: React.FormEvent) {
    e.preventDefault();
    const w = toNum(peso);
    const r = toNum(reps);
    if (!Number.isFinite(w) || w <= 0 || !Number.isInteger(r) || r < 1 || r > 12) {
      errorToast("Peso levantado en kg y repeticiones entre 1 y 12.");
      return;
    }
    setRes(oneRepMax(w, r));
    track("calc_use", { name: "1rm" });
  }

  const PCTS = [95, 90, 85, 80, 75];

  return (
    <Card>
      <CardHeader>
        <CardTitle>1RM — repetición máxima estimada</CardTitle>
        <CardDescription>Media de las fórmulas de Epley (1985) y Brzycki (1993) a partir de un set submáximo.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={calcular} className="grid gap-4 sm:grid-cols-2">
          <NumberField id="rm-peso" label="Peso levantado" unit="kg" value={peso} onChange={setPeso} min={1} max={500} placeholder="100" />
          <NumberField id="rm-reps" label="Repeticiones realizadas" unit="1–12" value={reps} onChange={setReps} min={1} max={12} step="1" placeholder="5" />
          <div className="sm:col-span-2">
            <Button type="submit" size="lg">Calcular 1RM</Button>
          </div>
        </form>

        {res ? (
          <CalcResult>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Epley (1985)</p>
                <p className="mt-1 text-2xl font-bold">{fmt1(res.epley)} kg</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Brzycki (1993)</p>
                <p className="mt-1 text-2xl font-bold">{fmt1(res.brzycki)} kg</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Media</p>
                <p className="mt-1 text-2xl font-bold text-primary">{fmt1(res.average)} kg</p>
              </div>
            </div>
            <div className="mt-5 overflow-hidden rounded-lg border border-border/70">
              <table className="w-full text-sm">
                <caption className="sr-only">Cargas de entrenamiento como porcentaje de tu 1RM estimado</caption>
                <thead>
                  <tr className="border-b border-border/70 bg-background/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-3 py-2">% del 1RM</th>
                    <th scope="col" className="px-3 py-2">Carga</th>
                  </tr>
                </thead>
                <tbody>
                  {PCTS.map((p) => (
                    <tr key={p} className="border-b border-border/50 last:border-0">
                      <td className="px-3 py-2 font-medium">{p}%</td>
                      <td className="px-3 py-2 text-muted-foreground">{fmt1((res.average * p) / 100)} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CalcResult>
        ) : null}

        <LimitationNote>
          Estimación balística: cuanto mayor sea el número de repeticiones usado, mayor es el margen de error. Nunca testees tu
          1RM real sin técnica consolidada y supervisión.
        </LimitationNote>
      </CardContent>
    </Card>
  );
}

/* e) Grasa corporal -------------------------------------------------------- */

function BodyFatCalc() {
  const [metodo, setMetodo] = React.useState<"navy" | "deurenberg">("navy");

  const [profile] = React.useState(() => loadProfile());
  const [sex, setSex] = React.useState<Sex>(profile?.sex ?? "hombre");
  const [altura, setAltura] = React.useState(profile ? String(profile.heightCm) : "");
  const [cuello, setCuello] = React.useState("");
  const [cintura, setCintura] = React.useState("");
  const [cadera, setCadera] = React.useState("");

  // Deurenberg
  const [peso, setPeso] = React.useState(profile ? String(profile.weightKg) : "");
  const [alturaD, setAlturaD] = React.useState(profile ? String(profile.heightCm) : "");
  const [edad, setEdad] = React.useState(profile ? String(profile.age) : "");

  const [res, setRes] = React.useState<{ navy: number | null; deu: number | null } | null>(null);

  function calcular(e: React.FormEvent) {
    e.preventDefault();
    let navyVal: number | null = null;
    let deuVal: number | null = null;

    const h = toNum(altura);
    const neck = toNum(cuello);
    const waist = toNum(cintura);
    const hip = sex === "mujer" ? toNum(cadera) : undefined;
    if (Number.isFinite(h) && h > 0 && Number.isFinite(neck) && neck > 0 && Number.isFinite(waist) && waist > 0) {
      const v = bodyFatNavy(sex, h, neck, waist, hip && Number.isFinite(hip) ? hip : undefined);
      if (Number.isFinite(v) && v > 1 && v < 70) navyVal = Math.round(v * 10) / 10;
    }

    const w = toNum(peso);
    const hD = toNum(alturaD);
    const a = toNum(edad);
    if (Number.isFinite(w) && w > 0 && Number.isFinite(hD) && hD > 0 && Number.isFinite(a) && a >= 10 && a <= 100) {
      const v = bodyFatDeurenberg(imc(w, hD), a, sex);
      if (Number.isFinite(v) && v > 1 && v < 70) deuVal = Math.round(v * 10) / 10;
    }

    if (navyVal === null && deuVal === null) {
      errorToast("Completa los datos de al menos un método con medidas válidas.");
      return;
    }
    setRes({ navy: navyVal, deu: deuVal });
    track("calc_use", { name: "grasa" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grasa corporal estimada</CardTitle>
        <CardDescription>Dos métodos contrastados: circunferencias US Navy (1984) y estimación desde IMC de Deurenberg (1991).</CardDescription>
      </CardHeader>
      <CardContent>
        <div role="tablist" aria-label="Método de grasa corporal" className="mb-4 flex gap-2">
          {(
            [
              { id: "navy", label: "US Navy (cinta)" },
              { id: "deurenberg", label: "Deurenberg (IMC)" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={metodo === t.id}
              onClick={() => setMetodo(t.id)}
              className={cn(
                "h-10 rounded-full border px-4 text-sm font-medium transition-colors",
                metodo === t.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={calcular} className="grid gap-4 sm:grid-cols-2">
          {metodo === "navy" ? (
            <>
              <SexField id="bf-sex" value={sex} onChange={setSex} />
              <NumberField id="bf-altura" label="Altura" unit="cm" value={altura} onChange={setAltura} min={80} max={250} placeholder="178" />
              <NumberField id="bf-cuello" label="Cuello" unit="cm" value={cuello} onChange={setCuello} min={20} max={70} placeholder="38" />
              <NumberField id="bf-cintura" label="Cintura" unit="cm" value={cintura} onChange={setCintura} min={40} max={200} placeholder="85" />
              {sex === "mujer" ? (
                <NumberField id="bf-cadera" label="Cadera (mujeres)" unit="cm" value={cadera} onChange={setCadera} min={50} max={220} placeholder="98" />
              ) : null}
            </>
          ) : (
            <>
              <SexField id="bf-sex" value={sex} onChange={setSex} />
              <NumberField id="bf-edad" label="Edad" unit="años" value={edad} onChange={setEdad} min={10} max={100} placeholder="30" />
              <NumberField id="bf-peso" label="Peso" unit="kg" value={peso} onChange={setPeso} min={20} max={400} placeholder="75" />
              <NumberField id="bf-altura-d" label="Altura" unit="cm" value={alturaD} onChange={setAlturaD} min={80} max={250} placeholder="178" />
            </>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" size="lg">Calcular grasa estimada</Button>
          </div>
        </form>

        {res ? (
          <CalcResult>
            <div className="grid gap-4 sm:grid-cols-2">
              {res.navy !== null ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">US Navy (Hodgdon &amp; Beckett, 1984)</p>
                  <p className="mt-1 text-3xl font-bold">{fmt1(res.navy)} %</p>
                </div>
              ) : null}
              {res.deu !== null ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Deurenberg (1991, desde IMC)</p>
                  <p className="mt-1 text-3xl font-bold">{fmt1(res.deu)} %</p>
                </div>
              ) : null}
            </div>
            {res.navy === null || res.deu === null ? (
              <p className="mt-3 text-xs text-muted-foreground">
                El otro método se mostrará aquí cuando tengas sus datos: la comparación entre ambos da una idea del margen de error.
              </p>
            ) : null}
          </CalcResult>
        ) : null}

        <LimitationNote>
          Estimaciones estadísticas: la cinta de medir tiene margen de error y Deurenberg solo criba a partir del IMC. Ninguna es
          un análisis de composición corporal (DEXA, plicometría profesional).
        </LimitationNote>
      </CardContent>
    </Card>
  );
}

/* f) Agua ------------------------------------------------------------------ */

function WaterCalc() {
  const [profile] = React.useState(() => loadProfile());
  const [peso, setPeso] = React.useState(profile ? String(profile.weightKg) : "");
  const [activity, setActivity] = React.useState<ActivityKey>(profile?.activity ?? "moderado");
  const [res, setRes] = React.useState<{ liters: number; glasses: number } | null>(null);

  function calcular(e: React.FormEvent) {
    e.preventDefault();
    const w = toNum(peso);
    if (!Number.isFinite(w) || w <= 0) {
      errorToast("Introduce un peso válido en kg.");
      return;
    }
    const liters = waterLiters(w, activity);
    setRes({ liters, glasses: Math.round(liters / 0.25) });
    track("calc_use", { name: "agua" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hidratación diaria</CardTitle>
        <CardDescription>Aproximación EFSA: 30–35 ml por kg de peso, con extra según tu nivel de actividad.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={calcular} className="grid gap-4 sm:grid-cols-2">
          <NumberField id="agua-peso" label="Peso" unit="kg" value={peso} onChange={setPeso} min={20} max={400} placeholder="75" />
          <ActivityField id="agua-actividad" value={activity} onChange={setActivity} />
          <div className="sm:col-span-2">
            <Button type="submit" size="lg">Calcular agua</Button>
          </div>
        </form>

        {res ? (
          <CalcResult>
            <p className="text-sm text-muted-foreground">Consumo orientativo</p>
            <p className="text-3xl font-bold tracking-tight">
              {fmt1(res.liters)} <span className="text-sm font-normal text-muted-foreground">litros/día</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              ≈ <span className="font-medium text-foreground">{res.glasses} vasos</span> de 250 ml repartidos a lo largo del día.
            </p>
          </CalcResult>
        ) : null}

        <LimitationNote>
          Estimación general: aumenta en calor, altitud o sudor abundante y guíate por tu sed. No aplica si tienes restricción
          hídrica médica.
        </LimitationNote>
      </CardContent>
    </Card>
  );
}

/* g) Peso ideal ------------------------------------------------------------ */

function IdealWeightCalc() {
  const [profile] = React.useState(() => loadProfile());
  const [altura, setAltura] = React.useState(profile ? String(profile.heightCm) : "");
  const [sex, setSex] = React.useState<Sex>(profile?.sex ?? "hombre");
  const [res, setRes] = React.useState<{ min: number; max: number; devine: number } | null>(null);

  function calcular(e: React.FormEvent) {
    e.preventDefault();
    const h = toNum(altura);
    if (!Number.isFinite(h) || h < 80 || h > 250) {
      errorToast("Introduce una altura válida en cm.");
      return;
    }
    setRes({ ...idealWeightRange(h), devine: idealWeightDevine(sex, h) });
    track("calc_use", { name: "peso_ideal" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Peso ideal estimado</CardTitle>
        <CardDescription>Rango de IMC saludable (18,5–24,9) aplicado a tu altura, más la fórmula clásica de Devine (1974).</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={calcular} className="grid gap-4 sm:grid-cols-2">
          <NumberField id="ideal-altura" label="Altura" unit="cm" value={altura} onChange={setAltura} min={80} max={250} placeholder="178" />
          <SexField id="ideal-sex" value={sex} onChange={setSex} />
          <div className="sm:col-span-2">
            <Button type="submit" size="lg">Calcular peso ideal</Button>
          </div>
        </form>

        {res ? (
          <CalcResult>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Rango saludable (IMC 18,5–24,9)</p>
                <p className="text-3xl font-bold tracking-tight">
                  {res.min}–{res.max} <span className="text-sm font-normal text-muted-foreground">kg</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fórmula de Devine</p>
                <p className="text-3xl font-bold tracking-tight">
                  {fmt1(res.devine)} <span className="text-sm font-normal text-muted-foreground">kg</span>
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              El rango proviene del IMC saludable aplicado a tu altura y es la referencia más usada en cribado poblacional.
              Devine es una fórmula histórica (creada para dosificar medicamentos) y debe tomarse solo como orientación. Ninguna
              de las dos considera tu composición corporal actual.
            </p>
          </CalcResult>
        ) : null}

        <LimitationNote>
          Estimación, no diagnóstico: tu peso óptimo depende de masa muscular, estructura ósea y contexto personal. Valídalo con
          un profesional.
        </LimitationNote>
      </CardContent>
    </Card>
  );
}

/* Vista hub ---------------------------------------------------------------- */

export function CalculadorasView() {
  const [active, setActive] = React.useState<TabId>("imc");

  return (
    <>
      <PageHeader
        eyebrow="Herramientas"
        title="Calculadoras fitness"
        description="Siete calculadoras con fórmulas publicadas (Mifflin-St Jeor, Navy, Epley…). Todos los cálculos ocurren en tu navegador: no guardamos ni enviamos tus datos."
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Calculadoras" }]}
      />
      <Container className="py-8 sm:py-10">
        <div role="tablist" aria-label="Calculadoras disponibles" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`calc-tab-${t.id}`}
              aria-selected={active === t.id}
              aria-controls={`calc-panel-${t.id}`}
              onClick={() => setActive(t.id)}
              className={cn(
                "h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
                active === t.id
                  ? "border-primary bg-primary text-primary-foreground glow-volt"
                  : "border-border bg-card text-foreground hover:bg-accent",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`calc-panel-${active}`}
          aria-labelledby={`calc-tab-${active}`}
          className="mt-6"
        >
          {active === "imc" ? <ImcCalc /> : null}
          {active === "calorias" ? <TdeeCalc /> : null}
          {active === "macros" ? <MacrosCalc /> : null}
          {active === "rm" ? <OneRmCalc /> : null}
          {active === "grasa" ? <BodyFatCalc /> : null}
          {active === "agua" ? <WaterCalc /> : null}
          {active === "ideal" ? <IdealWeightCalc /> : null}
        </div>
      </Container>
    </>
  );
}
