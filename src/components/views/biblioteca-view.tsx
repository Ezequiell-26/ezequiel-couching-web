"use client";

/**
 * Biblioteca de ejercicios (#/ejercicios, Task 24-b; filtro por músculo en Task 26-c).
 * Búsqueda + filtros por grupo/equipo/nivel/músculo primario sobre el dataset
 * estático de src/lib/content/exercises.ts (todo client-side, sin API). Cada
 * tarjeta abre un diálogo con músculos, ejecución paso a paso, consejos y CTA a Mi Zona.
 */

import { useMemo, useState } from "react";
import Image from "next/image";
import { Dumbbell, Lightbulb, Search } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { EmptyState } from "@/components/site/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { useRouter } from "@/lib/router";
import { track } from "@/lib/analytics";
import {
  EXERCISES,
  EXERCISE_EQUIPMENT,
  EXERCISE_GROUPS,
  EXERCISE_LEVELS,
  filterExercises,
  type Exercise,
  type ExerciseEquipment,
  type ExerciseGroup,
  type ExerciseLevel,
} from "@/lib/content/exercises";

/**
 * Portada por grupo muscular (Task 25-d): ilustraciones flat/vector con la
 * identidad de la marca (fondo carbón #0b0b0e + acento verde lima #bdef27),
 * generadas por IA y servidas desde /public/images/ejercicios.
 */
const GROUP_IMAGES: Record<ExerciseGroup, string> = {
  pecho: "/images/ejercicios/pecho-v2.jpg",
  espalda: "/images/ejercicios/espalda-v2.jpg",
  piernas: "/images/ejercicios/piernas-v2.jpg",
  hombros: "/images/ejercicios/hombros-v2.jpg",
  brazos: "/images/ejercicios/brazos-v2.jpg",
  core: "/images/ejercicios/core-v2.jpg",
  "full-body": "/images/ejercicios/full-body-v2.jpg",
};

const ANY_GROUP = "todos-los-grupos";
const ANY_EQUIPMENT = "todo-el-equipo";
const ANY_LEVEL = "todos-los-niveles";
const ANY_MUSCLE = "todos-los-musculos";

const groupLabel = (id: ExerciseGroup) =>
  EXERCISE_GROUPS.find((g) => g.id === id)?.label ?? id;
const levelLabel = (id: ExerciseLevel) =>
  EXERCISE_LEVELS.find((l) => l.id === id)?.label ?? id;
const equipmentLabel = (id: ExerciseEquipment) =>
  EXERCISE_EQUIPMENT.find((e) => e.id === id)?.label ?? id;

/** Variante del badge de nivel: volt solo para avanzado (acento con moderación). */
const levelBadgeVariant = (level: ExerciseLevel) =>
  level === "avanzado" ? "default" : level === "intermedio" ? "secondary" : "outline";

function ExerciseDialogBody({
  exercise,
  onGoZone,
}: {
  exercise: Exercise;
  onGoZone: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="relative aspect-[21/9] overflow-hidden rounded-lg border border-border">
        <Image
          src={GROUP_IMAGES[exercise.group]}
          alt={`Ilustración de ejercicios de ${groupLabel(exercise.group)}`}
          fill
          sizes="(max-width: 640px) 100vw, 512px"
          className="object-cover"
        />
      </div>

      <div className="flex flex-wrap gap-1.5" aria-label="Músculos implicados">
        {exercise.primaryMuscles.map((m) => (
          <Badge key={m} variant="default">
            {m}
          </Badge>
        ))}
        {exercise.secondaryMuscles.map((m) => (
          <Badge key={m} variant="muted">
            {m}
          </Badge>
        ))}
      </div>

      <section aria-label="Ejecución paso a paso">
        <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Ejecución
        </h3>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
          {exercise.instructions.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      <section aria-label="Consejos de técnica">
        <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Consejos
        </h3>
        <ul className="space-y-2">
          {exercise.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-sm leading-relaxed">
              <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button onClick={onGoZone} className="w-full sm:w-auto">
          Ir a Mi Zona
        </Button>
      </div>
    </div>
  );
}

export function BibliotecaView() {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<ExerciseGroup | typeof ANY_GROUP>(ANY_GROUP);
  const [equipment, setEquipment] = useState<ExerciseEquipment | typeof ANY_EQUIPMENT>(ANY_EQUIPMENT);
  const [level, setLevel] = useState<ExerciseLevel | typeof ANY_LEVEL>(ANY_LEVEL);
  const [muscle, setMuscle] = useState<string | typeof ANY_MUSCLE>(ANY_MUSCLE);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const navigate = useRouter((s) => s.navigate);

  /**
   * Opciones del filtro por músculo derivadas de los primaryMuscles REALES del
   * dataset (unique + sort): nunca hardcodeado, escala si el dataset crece.
   */
  const muscleOptions = useMemo(
    () =>
      [...new Set(EXERCISES.flatMap((e) => e.primaryMuscles))].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [],
  );

  const results = useMemo(() => {
    const base = filterExercises({
      q,
      group: group === ANY_GROUP ? undefined : group,
      equipment: equipment === ANY_EQUIPMENT ? undefined : equipment,
      level: level === ANY_LEVEL ? undefined : level,
    });
    // El filtro por músculo primario se aplica encima del helper (aditivo, sin tocar exercises.ts).
    return muscle === ANY_MUSCLE ? base : base.filter((e) => e.primaryMuscles.includes(muscle));
  }, [q, group, equipment, level, muscle]);

  const hasFilters =
    q.trim() !== "" ||
    group !== ANY_GROUP ||
    equipment !== ANY_EQUIPMENT ||
    level !== ANY_LEVEL ||
    muscle !== ANY_MUSCLE;

  const onFilter = (next: {
    q?: string;
    group?: string;
    equipment?: string;
    level?: string;
    muscle?: string;
  }) => {
    track("biblioteca_filter", {
      q: next.q ?? q,
      group: next.group ?? group,
      equipment: next.equipment ?? equipment,
      level: next.level ?? level,
      muscle: next.muscle ?? muscle,
    });
  };

  const openExercise = (exercise: Exercise) => {
    setSelected(exercise);
    track("biblioteca_open", { id: exercise.id, group: exercise.group });
  };

  const goZone = () => {
    track("cta_click", { label: "ir-a-mi-zona", source: "biblioteca" });
    setSelected(null);
    navigate("zona", {}, { source: "biblioteca" });
  };

  return (
    <>
      <PageHeader
        eyebrow="Recursos"
        title="Biblioteca de ejercicios"
        description="Más de 200 ejercicios con ejecución paso a paso, músculos implicados y consejos de técnica. Filtra por grupo muscular, músculo, material disponible o nivel y aprende a entrenar bien."
      >
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {EXERCISES.length} ejercicios · {EXERCISE_GROUPS.length} grupos musculares
        </p>
      </PageHeader>

      <Container className="pb-16 pt-8 sm:pb-20">
        {/* Buscador + filtros */}
        <Card className="p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="search" aria-label="Buscar ejercicios">
            <div className="sm:col-span-2">
              <Label htmlFor="biblioteca-q">Buscar ejercicio o músculo</Label>
              <div className="relative mt-2">
                <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="biblioteca-q"
                  type="search"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    onFilter({ q: e.target.value });
                  }}
                  placeholder="Ej.: banca, dorsal, plancha…"
                  autoComplete="off"
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="biblioteca-grupo">Grupo muscular</Label>
              <Select
                id="biblioteca-grupo"
                value={group}
                onChange={(e) => {
                  setGroup(e.target.value as ExerciseGroup | typeof ANY_GROUP);
                  onFilter({ group: e.target.value });
                }}
                className="mt-2"
              >
                <option value={ANY_GROUP}>Todos los grupos</option>
                {EXERCISE_GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="biblioteca-equipo">Equipo</Label>
              <Select
                id="biblioteca-equipo"
                value={equipment}
                onChange={(e) => {
                  setEquipment(e.target.value as ExerciseEquipment | typeof ANY_EQUIPMENT);
                  onFilter({ equipment: e.target.value });
                }}
                className="mt-2"
              >
                <option value={ANY_EQUIPMENT}>Cualquier equipo</option>
                {EXERCISE_EQUIPMENT.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="biblioteca-nivel">Nivel</Label>
              <Select
                id="biblioteca-nivel"
                value={level}
                onChange={(e) => {
                  setLevel(e.target.value as ExerciseLevel | typeof ANY_LEVEL);
                  onFilter({ level: e.target.value });
                }}
                className="mt-2"
              >
                <option value={ANY_LEVEL}>Todos los niveles</option>
                {EXERCISE_LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="biblioteca-musculo">Músculo primario</Label>
              <Select
                id="biblioteca-musculo"
                value={muscle}
                onChange={(e) => {
                  setMuscle(e.target.value);
                  onFilter({ muscle: e.target.value });
                }}
                className="mt-2"
              >
                <option value={ANY_MUSCLE}>Cualquier músculo</option>
                {muscleOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Card>

        {/* Contador de resultados */}
        <p aria-live="polite" className="mt-6 text-sm text-muted-foreground">
          {results.length === 1
            ? "1 ejercicio encontrado"
            : `${results.length} ejercicios encontrados`}
        </p>

        {/* Grid de tarjetas */}
        {results.length > 0 ? (
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((exercise) => (
              <li key={exercise.id}>
                <Card className="h-full transition-all duration-200 hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_oklch(0_0_0/0.5)]">
                  <button
                    type="button"
                    onClick={() => openExercise(exercise)}
                    aria-haspopup="dialog"
                    className="group flex h-full w-full flex-col gap-3 rounded-xl p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <div className="relative -mx-5 -mt-5 mb-1 aspect-[4/3] overflow-hidden rounded-t-xl border-b border-border bg-muted">
                      <Image
                        src={GROUP_IMAGES[exercise.group]}
                        alt={`Ilustración de ejercicios de ${groupLabel(exercise.group)}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                        className="object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
                      />
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-balance font-semibold leading-snug tracking-tight">
                        {exercise.name}
                      </h2>
                      <Dumbbell aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline">{groupLabel(exercise.group)}</Badge>
                      <Badge variant={levelBadgeVariant(exercise.level)}>
                        {levelLabel(exercise.level)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {exercise.equipment.map((eq) => (
                        <Badge key={eq} variant="muted" className="text-[11px] font-medium">
                          {equipmentLabel(eq)}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-auto text-sm text-muted-foreground">
                      <span className="font-medium text-foreground/80">Trabaja:</span>{" "}
                      {exercise.primaryMuscles.join(", ")}
                    </p>
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="No hay ejercicios con esos criterios"
              hint="Prueba con otros filtros o limpia la búsqueda: la biblioteca tiene ejercicios para cada grupo muscular, material y nivel."
              action={
                hasFilters ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQ("");
                      setGroup(ANY_GROUP);
                      setEquipment(ANY_EQUIPMENT);
                      setLevel(ANY_LEVEL);
                      setMuscle(ANY_MUSCLE);
                    }}
                  >
                    Limpiar filtros
                  </Button>
                ) : undefined
              }
            />
          </div>
        )}
      </Container>

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ""}
      >
        {selected ? <ExerciseDialogBody exercise={selected} onGoZone={goZone} /> : null}
      </Dialog>
    </>
  );
}
