"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { LoadingState } from "@/components/site/states";
import {
  loadDiary,
  saveDiary,
  entriesForDate,
  dayTotals,
  todayKey,
  type DiaryEntry,
  type FoodDiaryData,
} from "@/lib/food-diary-store";
import { loadProfile } from "@/lib/calc-profile";
import { FOOD_DB } from "@/lib/nutrition";
import { useRouter } from "@/lib/router";
import { track } from "@/lib/analytics";
import { formatDate } from "@/lib/utils";

/**
 * Contador de calorías — diario de comidas 100% local (localStorage,
 * ec_food_diary_v1). Sin cuentas: borrar datos lo borra todo.
 */

type MealKey = DiaryEntry["meal"];

const MEALS: { id: MealKey; label: string }[] = [
  { id: "desayuno", label: "Desayuno" },
  { id: "almuerzo", label: "Almuerzo" },
  { id: "cena", label: "Cena" },
  { id: "snack", label: "Snack" },
];

function shiftDate(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + days);
  return todayKey(d);
}

function fmt1(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(n);
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* Anillo de progreso kcal vs objetivo ------------------------------------- */

function KcalRing({ value, target }: { value: number; target: number }) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const over = value > target;
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <svg viewBox="0 0 140 140" className="size-36 shrink-0" role="img" aria-label={`${value} de ${target} kcal consumidas`}>
      <circle cx="70" cy="70" r={R} fill="none" strokeWidth="10" className="stroke-muted" />
      <circle
        cx="70"
        cy="70"
        r={R}
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${(C * pct).toFixed(1)} ${C.toFixed(1)}`}
        transform="rotate(-90 70 70)"
        className={over ? "stroke-destructive" : "stroke-primary"}
      />
      <text x="70" y="68" textAnchor="middle" className="fill-foreground text-[26px] font-bold">
        {value}
      </text>
      <text x="70" y="88" textAnchor="middle" className="fill-muted-foreground text-[10px]">
        de {target} kcal
      </text>
    </svg>
  );
}

/* Gráfico de barras de los últimos 7 días (SVG manual, sin librerías) ------ */

function WeekBars({ data, target }: { data: FoodDiaryData; target: number }) {
  const days = React.useMemo(() => {
    const fmtDay = new Intl.DateTimeFormat("es-ES", { weekday: "short" });
    const out: { key: string; label: string; kcal: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const key = shiftDate(todayKey(), -i);
      out.push({
        key,
        label: fmtDay.format(new Date(`${key}T12:00:00`)).replace(".", ""),
        kcal: Math.round(dayTotals(entriesForDate(data, key)).kcal),
      });
    }
    return out;
  }, [data]);

  const max = Math.max(...days.map((d) => d.kcal), target, 1);
  const allZero = days.every((d) => d.kcal === 0);
  const W = 322;
  const H = 128;
  const baseY = 100;
  const chartH = 78;
  const bw = 30;
  const targetY = baseY - (target / max) * chartH;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Kcal consumidas en los últimos 7 días">
        <line x1="0" x2={W} y1={targetY} y2={targetY} strokeWidth="1" strokeDasharray="4 4" className="stroke-muted-foreground" />
        <text x={W} y={targetY - 5} textAnchor="end" className="fill-muted-foreground text-[9px]">
          objetivo {target} kcal
        </text>
        {days.map((d, i) => {
          const x = 10 + i * 45;
          const h = (d.kcal / max) * chartH;
          return (
            <g key={d.key}>
              <rect
                x={x}
                y={baseY - h}
                width={bw}
                height={d.kcal > 0 ? Math.max(h, 3) : 0}
                rx="3"
                opacity={d.kcal > 0 ? 0.9 : 0}
                className={d.kcal > target ? "fill-destructive" : "fill-primary"}
              />
              <text x={x + bw / 2} y={baseY + 14} textAnchor="middle" className="fill-muted-foreground text-[9px]">
                {d.label}
              </text>
              {d.kcal > 0 ? (
                <text x={x + bw / 2} y={baseY - h - 4} textAnchor="middle" className="fill-foreground text-[9px] font-semibold">
                  {d.kcal}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {allZero ? <p className="mt-1 text-center text-xs text-muted-foreground">Aún no hay registros en los últimos 7 días.</p> : null}
    </div>
  );
}

/* Vista -------------------------------------------------------------------- */

export function ContadorView() {
  const navigate = useRouter((s) => s.navigate);
  // Carga inicial perezosa desde localStorage (vistas client-only: window existe).
  const [data, setData] = React.useState<FoodDiaryData | null>(() => loadDiary());
  const [date, setDate] = React.useState<string>(() => todayKey());
  const [profileTarget] = React.useState<number | null>(() => {
    const p = loadProfile();
    return p?.targetKcal && p.targetKcal > 0 ? p.targetKcal : null;
  });
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  if (!data) {
    return <LoadingState label="Cargando tu registro…" className="min-h-[50vh]" />;
  }

  const target = profileTarget ?? 2000;
  const entries = entriesForDate(data, date);
  const totals = dayTotals(entries);
  const kcal = Math.round(totals.kcal);
  const isToday = date === todayKey();

  function persist(next: FoodDiaryData) {
    setData(next);
    saveDiary(next);
  }

  function removeEntry(id: string) {
    persist({ ...data!, entries: data!.entries.filter((e) => e.id !== id) });
    toast({ title: "Alimento eliminado" });
  }

  function borrarTodo() {
    try {
      window.localStorage.removeItem("ec_food_diary_v1");
    } catch {
      /* almacenamiento no disponible */
    }
    setData({ entries: [], customFoods: [] });
    setConfirmOpen(false);
    toast({ title: "Datos borrados", description: "Se ha eliminado todo tu registro local del contador." });
  }

  return (
    <>
      <PageHeader
        eyebrow="Herramientas"
        title="Contador de calorías"
        description="Registra lo que comas y compara tus kcal con tu objetivo diario. El registro vive solo en este navegador (localStorage), sin cuentas."
        breadcrumb={[{ label: "Inicio", href: "#/" }, { label: "Contador" }]}
      />

      <Container className="space-y-6 py-8 sm:py-10">
        {/* Navegación de fecha + anillo + totales */}
        <Card>
          <CardHeader className="gap-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Día anterior"
                onClick={() => setDate(shiftDate(date, -1))}
              >
                <ChevronLeft aria-hidden />
              </Button>
              <div className="text-center">
                <p className="font-semibold">{formatDate(`${date}T12:00:00`)}</p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  {isToday ? <Badge>Hoy</Badge> : null}
                  <button
                    type="button"
                    onClick={() => setDate(todayKey())}
                    className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                  >
                    Ir a hoy
                  </button>
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                aria-label="Día siguiente"
                disabled={date >= todayKey()}
                onClick={() => setDate(shiftDate(date, 1))}
              >
                <ChevronRight aria-hidden />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
            <KcalRing value={kcal} target={target} />
            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div className="flex flex-wrap justify-center gap-2 sm:justify-start" aria-label="Macros del día">
                <Badge variant="secondary">Proteína {fmt1(totals.protein)} g</Badge>
                <Badge variant="secondary">Carbos {fmt1(totals.carbs)} g</Badge>
                <Badge variant="secondary">Grasa {fmt1(totals.fat)} g</Badge>
              </div>
              {profileTarget !== null ? (
                <p className="text-sm text-muted-foreground">
                  Objetivo diario: <span className="font-medium text-foreground">{target} kcal</span> (desde tu perfil guardado).
                </p>
              ) : (
                <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                  Objetivo por defecto de 2000 kcal. Configura tu objetivo en Calculadoras → Calorías y guárdalo con «Usar en las
                  demás herramientas».{" "}
                  <button
                    type="button"
                    onClick={() => navigate("calculadoras", {}, { source: "contador" })}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Ir a calculadoras
                  </button>
                </div>
              )}
              {kcal > 0 && kcal > target ? (
                <p className="text-sm text-destructive">Has superado tu objetivo en {kcal - target} kcal.</p>
              ) : null}
              {kcal > 0 && kcal <= target ? (
                <p className="text-sm text-muted-foreground">Te quedan {target - kcal} kcal para tu objetivo.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Comidas del día */}
        <div className="grid gap-4 md:grid-cols-2">
          {MEALS.map((m) => {
            const mealEntries = entries.filter((e) => e.meal === m.id);
            const mealKcal = Math.round(dayTotals(mealEntries).kcal);
            return (
              <Card key={m.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{m.label}</span>
                    <span className="text-sm font-normal text-muted-foreground">{mealKcal} kcal</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-2">
                  {mealEntries.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">
                      Sin alimentos registrados.
                    </p>
                  ) : (
                    mealEntries.map((en) => (
                      <div
                        key={en.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/40 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{en.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {fmt1(en.grams)} g · P {fmt1(en.protein)} · C {fmt1(en.carbs)} · G {fmt1(en.fat)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="text-sm font-semibold">{Math.round(en.kcal)}</span>
                          <button
                            type="button"
                            aria-label={`Eliminar ${en.name} de ${m.label}`}
                            onClick={() => removeEntry(en.id)}
                            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  <Button
                    variant="outline"
                    className="mt-auto w-full"
                    onClick={() => {
                      setDialogOpen(true);
                    }}
                  >
                    <Plus aria-hidden /> Añadir alimento
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Últimos 7 días */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos 7 días</CardTitle>
            <CardDescription>Kcal totales por día frente a tu objetivo.</CardDescription>
          </CardHeader>
          <CardContent>
            <WeekBars data={data} target={target} />
          </CardContent>
        </Card>

        {/* Zona de datos */}
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-border/70 bg-card/50 p-4 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            Tus registros se guardan solo en este navegador. Puedes borrarlos cuando quieras.
          </p>
          <Button variant="ghost" onClick={() => setConfirmOpen(true)} className="shrink-0 text-destructive hover:text-destructive">
            <Trash2 aria-hidden /> Borrar mis datos
          </Button>
        </div>
      </Container>

      <AddFoodDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        date={date}
        onAdd={(entry) => {
          persist({ ...data, entries: [...data.entries, entry] });
          toast({ title: "Alimento añadido", description: `${entry.name} · ${Math.round(entry.kcal)} kcal` });
          track("diary_add_food", { meal: entry.meal });
        }}
      />

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title="¿Borrar todos tus datos?">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Se eliminará todo tu registro del contador guardado en este navegador (todas las fechas y comidas). Esta acción no se
          puede deshacer.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={borrarTodo}>
            Sí, borrar todo
          </Button>
        </div>
      </Dialog>
    </>
  );
}

/* Diálogo añadir alimento -------------------------------------------------- */

function AddFoodDialog({
  open,
  onClose,
  date,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  onAdd: (entry: DiaryEntry) => void;
}) {
  const [foodId, setFoodId] = React.useState("");
  const [customName, setCustomName] = React.useState("");
  const [cKcal, setCKcal] = React.useState("");
  const [cProtein, setCProtein] = React.useState("");
  const [cCarbs, setCCarbs] = React.useState("");
  const [cFat, setCFat] = React.useState("");
  const [grams, setGrams] = React.useState("100");
  const [meal, setMeal] = React.useState<MealKey>("desayuno");

  // Al (re)abrir el diálogo se restablecen los campos: ajuste durante el render,
  // sin effect (patrón "estado previo" de la documentación de React).
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setFoodId("");
      setCustomName("");
      setCKcal("");
      setCProtein("");
      setCCarbs("");
      setCFat("");
      setGrams("100");
      setMeal("desayuno");
    }
  }

  const selected = foodId.startsWith("db:") ? FOOD_DB.find((f) => `db:${f.id}` === foodId) ?? null : null;
  const isCustom = foodId === "custom";

  function num(v: string): number {
    const n = Number(String(v).trim().replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const g = num(grams);
    if (!Number.isFinite(g) || g <= 0 || g > 5000) {
      toast({ title: "Revisa los gramos", description: "Introduce un peso consumido válido.", variant: "error" });
      return;
    }

    let entry: DiaryEntry;
    if (selected) {
      const f = g / selected.per;
      entry = {
        id: newId(),
        date,
        meal,
        name: selected.name,
        grams: g,
        kcal: Math.round(selected.kcal * f),
        protein: Math.round(selected.protein * f * 10) / 10,
        carbs: Math.round(selected.carbs * f * 10) / 10,
        fat: Math.round(selected.fat * f * 10) / 10,
      };
    } else if (isCustom) {
      const name = customName.trim();
      const k = num(cKcal);
      const p = num(cProtein);
      const c = num(cCarbs);
      const f = num(cFat);
      if (name.length < 2 || !Number.isFinite(k) || k < 0 || !Number.isFinite(p) || p < 0 || !Number.isFinite(c) || c < 0 || !Number.isFinite(f) || f < 0) {
        toast({
          title: "Revisa los datos",
          description: "Nombre del alimento y kcal/macros por 100 g válidos.",
          variant: "error",
        });
        return;
      }
      const factor = g / 100;
      entry = {
        id: newId(),
        date,
        meal,
        name,
        grams: g,
        kcal: Math.round(k * factor),
        protein: Math.round(p * factor * 10) / 10,
        carbs: Math.round(c * factor * 10) / 10,
        fat: Math.round(f * factor * 10) / 10,
      };
    } else {
      toast({ title: "Elige un alimento", description: "Selecciona uno de la base de datos o «Otro» para introducirlo a mano.", variant: "error" });
      return;
    }

    onAdd(entry);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title="Añadir alimento">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="diary-meal">Comida</Label>
          <Select id="diary-meal" value={meal} onChange={(e) => setMeal(e.target.value as MealKey)} className="h-11">
            {MEALS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="diary-food">Alimento</Label>
          <Select id="diary-food" value={foodId} onChange={(e) => setFoodId(e.target.value)} className="h-11">
            <option value="">Elige de la base de datos…</option>
            {FOOD_DB.map((f) => (
              <option key={f.id} value={`db:${f.id}`}>
                {f.name}
              </option>
            ))}
            <option value="custom">Otro (introducir a mano)…</option>
          </Select>
          {selected ? (
            <p className="text-xs text-muted-foreground">
              {selected.kcal} kcal · P {selected.protein} · C {selected.carbs} · G {selected.fat} por 100 g
            </p>
          ) : null}
        </div>

        {isCustom ? (
          <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Alimento personalizado (por 100 g)</p>
            <div className="space-y-1.5">
              <Label htmlFor="diary-custom-name">Nombre</Label>
              <Input
                id="diary-custom-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="p. ej. Lasaña de la abuela"
                className="h-10"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="diary-custom-kcal">kcal</Label>
                <Input id="diary-custom-kcal" type="number" inputMode="decimal" min={0} value={cKcal} onChange={(e) => setCKcal(e.target.value)} placeholder="250" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="diary-custom-protein">Proteína (g)</Label>
                <Input id="diary-custom-protein" type="number" inputMode="decimal" min={0} value={cProtein} onChange={(e) => setCProtein(e.target.value)} placeholder="15" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="diary-custom-carbs">Carbos (g)</Label>
                <Input id="diary-custom-carbs" type="number" inputMode="decimal" min={0} value={cCarbs} onChange={(e) => setCCarbs(e.target.value)} placeholder="30" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="diary-custom-fat">Grasa (g)</Label>
                <Input id="diary-custom-fat" type="number" inputMode="decimal" min={0} value={cFat} onChange={(e) => setCFat(e.target.value)} placeholder="8" className="h-10" />
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="diary-grams">Gramos consumidos</Label>
          <Input
            id="diary-grams"
            type="number"
            inputMode="decimal"
            min={1}
            max={5000}
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            className="h-11"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Añadir al registro</Button>
        </div>
      </form>
    </Dialog>
  );
}
