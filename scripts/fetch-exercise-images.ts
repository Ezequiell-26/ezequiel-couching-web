/**
 * Task 33 — Descarga imágenes reales de ejercicios desde free-exercise-db
 * (https://github.com/yuhonas/free-exercise-db, Unlicense / dominio público).
 *
 * Para cada ejercicio español del dataset local mapeado a un ejercicio del
 * dataset externo (por nombre exacto, con candidatos en orden de preferencia),
 * descarga la primera imagen demo, la reescala con sharp (640px, JPEG q72) y
 * la guarda en public/images/ejercicios/db/<id>.jpg.
 *
 * Al terminar escribe src/lib/content/exercise-images.ts con el mapa
 * EXERCISE_IMAGES (solo los descargados con éxito, ordenado por id).
 *
 * Uso: bun scripts/fetch-exercise-images.ts
 * Idempotente: re-corridas sobreescriben y regeneran el mapa.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DB_JSON_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const DB_IMG_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

const OUT_DIR = path.resolve("public/images/ejercicios/db");
const MAP_OUT = path.resolve("src/lib/content/exercise-images.ts");

/** id español → nombre(s) exactos en free-exercise-db (primer candidato existente). */
const MAPPING: Record<string, string[]> = {
  // ── Pecho ───────────────────────────────────────────────────────────────
  "press-banca": ["Barbell Bench Press - Medium Grip"],
  "press-banca-mancuernas": ["Dumbbell Bench Press"],
  "press-inclinado-barra": ["Barbell Incline Bench Press - Medium Grip"],
  "press-inclinado-mancuernas": ["Incline Dumbbell Press"],
  "press-declinado-barra": ["Decline Barbell Bench Press"],
  "press-maquina-pecho": ["Machine Bench Press"],
  flexiones: ["Pushups"],
  "flexiones-diamante": ["Push-Ups - Close Triceps Position"],
  "fondos-paralelas": ["Dips - Chest Version"],
  "aperturas-mancuernas": ["Dumbbell Flyes"],
  "aperturas-polea": ["Flat Bench Cable Flyes"],
  "cruzamiento-poleas": ["Cable Crossover"],
  "aperturas-maquina": ["Butterfly"],
  "flexiones-inclinadas": ["Incline Push-Up"],
  "flexiones-declinadas": ["Push-Ups With Feet Elevated"],
  "flexiones-palmada": ["Plyo Push-up"],
  "press-banca-multipower": ["Smith Machine Bench Press"],
  "press-suelo-mancuernas": ["Dumbbell Floor Press"],

  // ── Espalda ─────────────────────────────────────────────────────────────
  dominadas: ["Pullups"],
  "dominadas-asistidas-banda": ["Band Assisted Pull-Up"],
  "dominadas-supinas": ["Chin-Up"],
  "remo-barra": ["Bent Over Barbell Row"],
  "remo-mancuerna": ["One-Arm Dumbbell Row"],
  "jalon-polea": ["Wide-Grip Lat Pulldown"],
  "jalon-agarre-neutro": ["Close-Grip Front Lat Pulldown"],
  "jalon-polea-unilateral": ["One Arm Lat Pulldown"],
  "remo-polea-baja": ["Seated Cable Rows"],
  "remo-invertido": ["Inverted Row"],
  "pullover-polea": ["Rope Straight-Arm Pulldown"],
  "face-pull": ["Face Pull"],
  "encogimiento-trapecio": ["Barbell Shrug"],
  "encogimiento-barra": ["Barbell Shrug"],
  hiperextensiones: ["Hyperextensions (Back Extensions)"],
  "buenos-dias": ["Good Morning"],
  superman: ["Superman"],
  "muscle-up-barra": ["Muscle Up"],
  "remo-menton": ["Barbell Upright Row", "Standing Dumbbell Upright Row"],

  // ── Piernas ─────────────────────────────────────────────────────────────
  "sentadilla-barra": ["Barbell Squat"],
  "sentadilla-goblet": ["Goblet Squat"],
  "sentadilla-frontal": ["Front Squat (Clean Grip)"],
  "sentadilla-hack": ["Barbell Hack Squat", "Hack Squat"],
  "prensa-piernas": ["Leg Press"],
  "zancadas-mancuernas": ["Dumbbell Lunges"],
  "peso-muerto": ["Barbell Deadlift"],
  "peso-muerto-rumano": ["Romanian Deadlift"],
  "peso-muerto-sumo": ["Sumo Deadlift"],
  "hip-thrust": ["Barbell Hip Thrust"],
  "puente-gluteo": ["Butt Lift (Bridge)"],
  "puente-gluteo-unilateral": ["Single Leg Glute Bridge"],
  "step-up": ["Dumbbell Step Ups"],
  "extension-cuadriceps": ["Leg Extensions"],
  "curl-femoral-tumbado": ["Lying Leg Curls"],
  "curl-femoral-sentado": ["Seated Leg Curl"],
  "gemelos-pie": ["Standing Calf Raises"],
  "gemelos-sentado": ["Seated Calf Raise"],
  "gemelos-prensa": ["Calf Press On The Leg Press Machine"],
  "aduccion-cadera": ["Adductor"],
  "zancadas-caminando": [
    "Dumbbell Walking Lunge",
    "Barbell Walking Lunge",
    "Bodyweight Walking Lunge",
  ],
  "sentadilla-con-salto": ["Freehand Jump Squat"],
  "sentadilla-multipower": ["Smith Machine Squat"],
  "zancada-trasera": ["Dumbbell Rear Lunge"],
  "salto-al-cajon": ["Box Jump (Multiple Response)"],
  "salto-horizontal": ["Standing Long Jump"],

  // ── Hombros ─────────────────────────────────────────────────────────────
  "press-militar": ["Barbell Shoulder Press"],
  "press-mancuernas-hombros": ["Dumbbell Shoulder Press"],
  "press-arnold": ["Arnold Dumbbell Press"],
  "press-hombros-maquina": ["Machine Shoulder (Military) Press"],
  "elevaciones-laterales": ["Side Lateral Raise"],
  "elevaciones-frontales": ["Front Dumbbell Raise"],
  "pajaros-mancuernas": ["Reverse Flyes"],
  "apertura-inversa-polea": ["Cable Rear Delt Fly"],
  "apertura-inversa-maquina": ["Reverse Machine Flyes"],
  "apertura-inversa-banda": ["Back Flyes - With Bands"],
  "press-mancuernas-de-pie": ["Standing Dumbbell Press"],
  "elevacion-lateral-polea": ["Cable Seated Lateral Raise"],
  "press-vertical": ["Handstand Push-Ups"],
  "molino-kettlebell": ["Kettlebell Windmill"],

  // ── Brazos ──────────────────────────────────────────────────────────────
  "curl-barra": ["Barbell Curl"],
  "curl-mancuernas": ["Dumbbell Bicep Curl"],
  "curl-inclinado": ["Incline Dumbbell Curl"],
  "curl-martillo": ["Hammer Curls"],
  "curl-polea": ["Standing Biceps Cable Curl", "High Cable Curls"],
  "curl-predicador": ["Preacher Curl"],
  "extension-triceps-polea": ["Triceps Pushdown"],
  "press-frances": [
    "EZ-Bar Skullcrusher",
    "Lying Close-Grip Barbell Triceps Press To Chin",
  ],
  "fondos-banco": ["Bench Dips"],
  "extension-triceps-sobrecabeza": ["Cable Rope Overhead Triceps Extension"],
  "patada-triceps": ["Tricep Dumbbell Kickback"],
  "extension-triceps-maquina": ["Machine Triceps Extension"],
  "press-cerrado-banca": ["Close-Grip Barbell Bench Press"],
  "curl-scott-barra": ["Close-Grip EZ Bar Curl"],
  "curl-muneca": ["Palms-Up Barbell Wrist Curl Over A Bench"],
  "extension-muneca": ["Palms-Down Wrist Curl Over A Bench"],
  "curl-barra-z": ["EZ-Bar Curl"],
  "curl-arana": ["Spider Curl"],
  "curl-zottman": ["Zottman Curl"],
  "curl-arrastrado": ["Drag Curl"],
  "curl-martillo-polea": ["Cable Hammer Curls - Rope Attachment"],
  "extension-triceps-cuerda": ["Triceps Pushdown - Rope Attachment"],

  // ── Core ────────────────────────────────────────────────────────────────
  plancha: ["Plank"],
  "plancha-lateral": ["Side Bridge"],
  crunch: ["Crunches"],
  "crunch-polea": ["Cable Crunch"],
  "crunch-maquina": ["Ab Crunch Machine"],
  "crunch-oblicuo": ["Oblique Crunches"],
  "crunch-invertido": ["Reverse Crunch"],
  "elevacion-piernas-tumbado": ["Flat Bench Lying Leg Raise"],
  "elevacion-rodillas-colgado": ["Bent-Knee Hip Raise"],
  "elevacion-piernas-colgado": ["Hanging Leg Raise"],
  "elevacion-piernas-paralelas": ["Knee/Hip Raise On Parallel Bars"],
  "rueda-abdominal": ["Ab Roller"],
  "russian-twist": ["Russian Twist"],
  "dead-bug": ["Dead Bug"],
  "bird-dog": ["Bird Dog"],
  "sit-up": ["Sit-Up"],
  "tijeras-verticales": ["Flutter Kicks"],
  "lenador-polea": ["Standing Cable Wood Chop"],
  "flexion-lateral-tronco": ["Dumbbell Side Bend"],
  "pallof-press": ["Pallof Press"],
  "rotaciones-landmine": ["Landmine 180's"],

  // ── Cuerpo completo ─────────────────────────────────────────────────────
  thruster: ["Kettlebell Thruster"],
  "push-press": ["Push Press"],
  "swing-kettlebell": ["Kettlebell Swings", "One-Arm Kettlebell Swings"],
  "clean-press-kettlebell": ["Clean and Press", "One-Arm Kettlebell Clean and Jerk"],
  "snatch-kettlebell": ["One-Arm Kettlebell Snatch"],
  "turkish-get-up": ["Kettlebell Turkish Get-Up (Lunge style)"],
  "farmer-walk": ["Farmer's Walk"],
  "mountain-climbers": ["Mountain Climbers"],
  "remo-renegado": ["Alternating Renegade Row"],
  "clean-mancuernas": ["Dumbbell Clean"],
  "clean-barra": ["Power Clean"],
  oruga: ["Inchworm"],
  "arranque-barra": ["Snatch"],
  envion: ["Split Jerk"],
};

interface DbExercise {
  name: string;
  images: string[];
}

async function main(): Promise<void> {
  console.log("Descargando dataset free-exercise-db…");
  const res = await fetch(DB_JSON_URL, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Dataset HTTP ${res.status}`);
  const db = (await res.json()) as DbExercise[];
  const byName = new Map(db.map((e) => [e.name.toLowerCase(), e]));
  console.log(`Dataset: ${db.length} ejercicios.`);

  await mkdir(OUT_DIR, { recursive: true });

  const okIds: string[] = [];
  const missing: string[] = [];

  for (const [id, candidates] of Object.entries(MAPPING)) {
    const match = candidates
      .map((c) => byName.get(c.toLowerCase()))
      .find((e) => e !== undefined);
    if (!match || match.images.length === 0) {
      missing.push(id);
      continue;
    }
    const imgPath = match.images[0];
    const url = DB_IMG_BASE + imgPath;
    try {
      const imgRes = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      const out = await sharp(buf)
        .resize({ width: 640, withoutEnlargement: true })
        .jpeg({ quality: 72, mozjpeg: true })
        .toBuffer();
      await writeFile(path.join(OUT_DIR, `${id}.jpg`), out);
      okIds.push(id);
      console.log(`OK   ${id}  ←  ${imgPath}`);
    } catch (err) {
      missing.push(id);
      console.warn(`FALLÓ ${id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  okIds.sort();
  const entries = okIds.map((id) => `  "${id}": "/images/ejercicios/db/${id}.jpg",`);

  const ts = `/**
 * Imágenes demo por ejercicio (Task 33) — generadas por
 * scripts/fetch-exercise-images.ts, NO editar a mano: re-correr el script.
 *
 * Origen: free-exercise-db (https://github.com/yuhonas/free-exercise-db),
 * licencia Unlicense (dominio público). Descargadas, reescaladas a 640px
 * (sharp, JPEG q72) y servidas localmente desde /public/images/ejercicios/db.
 *
 * Consumido por la biblioteca (#/ejercicios): si el ejercicio no está en este
 * mapa se cae a la portada del grupo (GROUP_IMAGES en biblioteca-view).
 */

export const EXERCISE_IMAGES: Record<string, string> = {
${entries.join("\n")}
};

export function exerciseImage(id: string): string | undefined {
  return EXERCISE_IMAGES[id];
}
`;

  await writeFile(MAP_OUT, ts, "utf8");

  console.log(`\nListo: ${okIds.length} imágenes descargadas.`);
  if (missing.length > 0) {
    console.log(`Sin imagen (${missing.length}): ${missing.join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
