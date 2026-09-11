import { NextResponse } from "next/server";
import { z } from "zod";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { EXERCISES, getExerciseById } from "@/lib/content/exercises";
import type { ExerciseEquipment, ExerciseLevel } from "@/lib/content/exercises";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { requireZonaProfile, zonaUnauthorized } from "@/lib/zona-auth";
import { serializeRoutine } from "@/lib/zona-utils";

export const dynamic = "force-dynamic";

const GOALS = ["general", "hipertrofia", "fuerza", "perder-grasa", "resistencia"] as const;
const LEVELS = ["principiante", "intermedio", "avanzado"] as const;
const EQUIPMENT = ["gimnasio", "mancuernas", "casa", "peso-corporal"] as const;

const schema = z.object({
  goal: z.enum(GOALS),
  level: z.enum(LEVELS),
  daysPerWeek: z.number().int().min(1).max(6),
  equipment: z.enum(EQUIPMENT),
});

const TIMEOUT_MS = 60_000;

const SYSTEM = `Eres el entrenador titular de EZEQUIEL COACHING. Diseña una rutina de entrenamiento personalizada.
Responde ÚNICAMENTE con un JSON válido, sin texto adicional antes ni después, con esta forma exacta:
{"name":string,"days":[{"day":1,"exercises":[{"exerciseId":string,"sets":int,"reps":"8-12","restSec":int}]}]}
Reglas obligatorias:
- Usa ÚNICAMENTE exerciseId de la lista "ejerciciosDisponibles" del usuario.
- Crea exactamente daysPerWeek días, numerados 1..daysPerWeek.
- Entre 4 y 6 ejercicios por día, combinando grupos musculares de forma coherente.
- Series, repeticiones y descansos sensatos según el objetivo (goal) y el nivel (level).
- "name" es un nombre breve y motivador para la rutina (en español).`;

/** Mapea el equipment del request a los equipment compatibles de los ejercicios. */
function allowedEquipment(equipment: (typeof EQUIPMENT)[number]): ExerciseEquipment[] {
  switch (equipment) {
    case "gimnasio":
      return ["barra", "mancuernas", "maquinas", "poleas", "peso-corporal", "kettlebell", "banda"];
    case "mancuernas":
      return ["mancuernas", "peso-corporal", "banda", "kettlebell"];
    case "casa":
      return ["peso-corporal", "banda", "kettlebell", "mancuernas"];
    case "peso-corporal":
      return ["peso-corporal", "banda"];
  }
}

/** Principiante → ejercicios principiante+intermedio; intermedio/avanzado → todos. */
function allowedLevels(level: (typeof LEVELS)[number]): ExerciseLevel[] {
  return level === "principiante" ? ["principiante", "intermedio"] : ["principiante", "intermedio", "avanzado"];
}

/** Extrae el primer objeto JSON del texto (tolera fences ```json). */
function extractJson(text: string): string | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return candidate.slice(start, end + 1);
}

/** Repara los defectos JSON más comunes de los LLM (comas colgantes, comillas tipográficas). */
function repairJson(input: string): string {
  return input
    .replace(/[“”„]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
}

/** Intenta JSON.parse con reparación; devuelve null si sigue inválido. */
function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(repairJson(raw));
    } catch {
      return null;
    }
  }
}

function aiMessageContent(completion: unknown): string {
  const obj = completion as
    | { choices?: Array<{ message?: { content?: unknown }; text?: unknown }>; content?: unknown }
    | null
    | undefined;
  const c = obj?.choices?.[0]?.message?.content ?? obj?.choices?.[0]?.text ?? obj?.content;
  return typeof c === "string" ? c : "";
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/** POST /api/zona/routines/generate — genera una rutina con IA sobre la biblioteca real. */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "zona-generate"), 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Demasiadas generaciones. Reintenta en ${rl.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  try {
    const profile = await requireZonaProfile();
    if (!profile) return zonaUnauthorized();

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos no válidos." },
        { status: 400 },
      );
    }
    const { goal, level, daysPerWeek, equipment } = parsed.data;

    // Candidatos reales de la biblioteca, filtrados por material y nivel (máx. 60).
    const candidates = EXERCISES.filter(
      (e) =>
        allowedEquipment(equipment).some((eq) => e.equipment.includes(eq)) &&
        allowedLevels(level).includes(e.level),
    ).slice(0, 60);

    // Sin biblioteca no hay generación posible (estado vacío honesto).
    if (candidates.length === 0) {
      return NextResponse.json(
        {
          error:
            "El generador IA no está disponible en este momento. Inténtalo de nuevo en unos minutos.",
        },
        { status: 503 },
      );
    }

    const zai = await ZAI.create();

    const shapeSchema = z.object({
      name: z.string().trim().min(1).max(60).catch("Rutina con IA"),
      days: z
        .array(
          z.object({
            day: z.number().int().min(1).max(6),
            exercises: z
              .array(
                z.object({
                  exerciseId: z.string(),
                  sets: z.number().int().min(1).max(10),
                  reps: z.string().min(1).max(12),
                  restSec: z.number().int().min(0).max(600),
                }),
              )
              .max(12),
          }),
        )
        .max(6),
    });

    // Hasta 2 intentos: el 2.º avisa al modelo de que su JSON previo fue inválido.
    const userInput = JSON.stringify({
      goal,
      level,
      daysPerWeek,
      equipment,
      ejerciciosDisponibles: candidates.map((e) => ({ id: e.id, name: e.name, group: e.group })),
    });

    type RoutineShape = z.infer<typeof shapeSchema>;
    let shape: RoutineShape | null = null;
    for (let attempt = 1; attempt <= 2 && !shape; attempt++) {
      try {
        const completion = await withTimeout(
          zai.chat.completions.create({
            messages: [
              { role: "assistant", content: SYSTEM },
              {
                role: "user",
                content:
                  attempt === 1
                    ? userInput
                    : `${userInput}\n\nIMPORTANTE: tu respuesta anterior NO era JSON válido. Responde ÚNICAMENTE con el objeto JSON, sin comentarios ni texto extra.`,
              },
            ],
            thinking: { type: "disabled" },
          }),
          TIMEOUT_MS,
        );

        const raw = extractJson(aiMessageContent(completion));
        if (!raw) {
          console.error(`[api/zona/routines/generate] intento ${attempt}: respuesta sin JSON`);
          continue;
        }
        const data = tryParseJson(raw);
        if (data === null) {
          console.error(
            `[api/zona/routines/generate] intento ${attempt}: JSON inválido tras reparación: ${raw.slice(0, 160)}`,
          );
          continue;
        }
        const parsedShape = shapeSchema.safeParse(data);
        if (!parsedShape.success) {
          console.error(
            `[api/zona/routines/generate] intento ${attempt}: shape inválido:`,
            parsedShape.error.issues[0]?.message,
          );
          continue;
        }
        shape = parsedShape.data;
      } catch (attemptError) {
        console.error(`[api/zona/routines/generate] intento ${attempt}: error SDK/timeout`, attemptError);
      }
    }

    if (!shape) {
      return NextResponse.json(
        {
          error:
            "El generador IA no está disponible en este momento. Inténtalo de nuevo en unos minutos.",
        },
        { status: 503 },
      );
    }

    // ── Validación de contenido: solo ids reales, días con ≥3 ejercicios ──
    const validDays = shape.days
      .slice(0, daysPerWeek)
      .map((d) => ({
        ...d,
        exercises: d.exercises.filter((ex) => Boolean(getExerciseById(ex.exerciseId))),
      }))
      .filter((d) => d.exercises.length >= 3);

    if (validDays.length === 0) {
      return NextResponse.json(
        { error: "La IA generó una rutina inválida. Probá de nuevo." },
        { status: 502 },
      );
    }

    // Reindexar días 1..N y ordenar ejercicios.
    const itemData = validDays.map((d, dayIdx) =>
      d.exercises.map((ex, exIdx) => ({
        day: dayIdx + 1,
        orderIdx: exIdx,
        exerciseId: ex.exerciseId,
        sets: ex.sets,
        reps: ex.reps,
        restSec: ex.restSec,
        notes: null as string | null,
      })),
    ).flat();

    const routine = await db.routine.create({
      data: {
        profileId: profile.id,
        name: shape.name,
        goal,
        level,
        daysPerWeek: validDays.length,
        equipment,
        source: "ia",
        notes: `Rutina generada con IA el ${new Date().toISOString().slice(0, 10)}.`,
        items: { create: itemData },
      },
      include: { items: true },
    });

    return NextResponse.json(serializeRoutine(routine), { status: 201 });
  } catch (error) {
    // Nunca filtrar el error real del SDK al cliente.
    console.error("[api/zona/routines/generate]", error);
    return NextResponse.json(
      {
        error:
          "El generador IA no está disponible en este momento. Inténtalo de nuevo en unos minutos.",
      },
      { status: 503 },
    );
  }
}
