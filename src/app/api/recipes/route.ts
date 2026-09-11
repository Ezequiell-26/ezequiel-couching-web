import net from "node:net";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/* Sandbox: sin ruta IPv6 y el auto-select de familia de undici (Happy
   Eyeballs) termina en ETIMEDOUT contra hosts externos (mismo fix que
   /api/weather); deshabilitado a nivel proceso el connect usa IPv4. */
try {
  net.setDefaultAutoSelectFamily(false);
} catch {
  // Node sin la API: seguimos con el default.
}

/* Tipos normalizados ------------------------------------------------------ */

type MealSummary = {
  id: number;
  name: string;
  category: string | null;
  thumb: string | null;
};

type MealIngredient = { name: string; measure: string };

type MealDetail = {
  id: number;
  name: string;
  category: string | null;
  area: string | null;
  thumb: string | null;
  tags: string[];
  youtube: string | null;
  source: string | null;
  instructions: string;
  ingredients: MealIngredient[];
};

/* Validación: un solo modo por request (q | category | id | mode) ---------- */

const querySchema = z
  .object({
    q: z
      .string()
      .trim()
      .min(2, "Escribí al menos 2 caracteres.")
      .max(60, "Máximo 60 caracteres.")
      .optional(),
    category: z
      .string()
      .trim()
      .min(2, "Elegí una categoría de la lista.")
      .max(40, "Máximo 40 caracteres.")
      .optional(),
    id: z
      .string()
      .trim()
      .regex(/^\d+$/, "El parámetro id debe ser un número.")
      .optional(),
    mode: z
      .enum(["categories", "random"], {
        message: "El parámetro mode solo admite los valores categories o random.",
      })
      .optional(),
  })
  .superRefine((val, ctx) => {
    const chosen = ["q", "category", "id", "mode"].filter(
      (k) => val[k as keyof typeof val] !== undefined,
    );
    if (chosen.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Usá un solo modo: texto (q), categoría, id o mode (categories o random).",
      });
    }
  });

/** searchParam ausente o vacío → undefined (así zod no lo valida). */
function opt(v: string | null): string | undefined {
  const t = v?.trim() ?? "";
  return t === "" ? undefined : t;
}

/* Cachés en memoria del proceso ------------------------------------------- */

// Datos (búsqueda/categoría/lookup): TTL 30 min, máx 100 entradas.
const CACHE_TTL_MS = 30 * 60_000;
const CACHE_MAX = 100;
const cache = new Map<string, { at: number; data: unknown }>();

function cacheGet(key: string): unknown | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet(key: string, data: unknown) {
  if (cache.size >= CACHE_MAX) {
    // Evicción: borrar la entrada más vieja.
    let oldestKey = "";
    let oldestAt = Infinity;
    for (const [k, v] of cache) {
      if (v.at < oldestAt) {
        oldestAt = v.at;
        oldestKey = k;
      }
    }
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, { at: Date.now(), data });
}

// Lista de categorías: TTL 24 h (sirve mode=categories y valida ?category=).
const CATEGORIES_TTL_MS = 24 * 60 * 60_000;
let categoriesCache: { at: number; categories: string[] } | null = null;

/* Upstream: TheMealDB (API pública, test key "1") -------------------------- */

const THE_MEAL_DB = "https://www.themealdb.com/api/json/v1/1";

// Última receta random servida (id): dedupe best-effort de repeticiones
// consecutivas (solo contra la respuesta inmediatamente anterior, con un
// reintento; NO reemplaza a la aleatoriedad del upstream). Variable módulo:
// válida por proceso, sin persistencia.
let lastRandomMealId: number | null = null;

async function fetchTheMealDB(path: string): Promise<unknown> {
  const res = await fetch(`${THE_MEAL_DB}/${path}`, {
    headers: { "User-Agent": "KinetixFitt/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`TheMealDB ${path} → HTTP ${res.status}`);
  return res.json();
}

/** Lista real de categorías (cacheada 24 h). Falla → throw → 502. */
async function getCategories(): Promise<string[]> {
  if (categoriesCache && Date.now() - categoriesCache.at <= CATEGORIES_TTL_MS) {
    return categoriesCache.categories;
  }
  const json = (await fetchTheMealDB("list.php?c=list")) as {
    meals?: { strCategory?: unknown }[] | null;
  };
  const categories = (Array.isArray(json.meals) ? json.meals : [])
    .map((m) => (typeof m.strCategory === "string" ? m.strCategory.trim() : ""))
    .filter(Boolean);
  categoriesCache = { at: Date.now(), categories };
  return categories;
}

/* Parseo seguro de TheMealDB ---------------------------------------------- */

/** String trimmeado o null (nunca lanza). */
function str(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

function mealSummary(raw: unknown, forcedCategory: string | null): MealSummary | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const name = str(r.strMeal);
  const id = Number(r.idMeal);
  // Descartar entradas sin nombre o sin id usable (no se puede abrir detalle).
  if (!name || !Number.isFinite(id)) return null;
  return {
    id,
    name,
    category: forcedCategory ?? str(r.strCategory),
    thumb: str(r.strMealThumb),
  };
}

function mealDetail(raw: unknown): MealDetail | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const name = str(r.strMeal);
  const id = Number(r.idMeal);
  if (!name || !Number.isFinite(id)) return null;

  const tags =
    typeof r.strTags === "string" && r.strTags.trim() !== ""
      ? r.strTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

  // strIngredient1..20 + strMeasure1..20: descartar ingredientes vacíos/null.
  const ingredients: MealIngredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const ing = str(r[`strIngredient${i}`]);
    if (!ing) continue;
    ingredients.push({ name: ing, measure: str(r[`strMeasure${i}`]) ?? "" });
  }

  return {
    id,
    name,
    category: str(r.strCategory),
    area: str(r.strArea),
    thumb: str(r.strMealThumb),
    tags,
    youtube: str(r.strYoutube),
    source: str(r.strSource),
    instructions: typeof r.strInstructions === "string" ? r.strInstructions.trim() : "",
    ingredients,
  };
}

/** meals[] de upstream (o null) → summaries sin entradas inválidas. */
function toSummaries(json: unknown, forcedCategory: string | null): MealSummary[] {
  const meals = (json as { meals?: unknown[] | null } | null)?.meals;
  if (!Array.isArray(meals)) return [];
  return meals
    .map((m) => mealSummary(m, forcedCategory))
    .filter((m): m is MealSummary => m !== null);
}

export async function GET(req: Request) {
  const rl = rateLimit(clientKey(req, "recipes"), 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Demasiadas consultas. Probá de nuevo en ${rl.retryAfterSec} segundos.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const params = new URL(req.url).searchParams;
  const parsed = querySchema.safeParse({
    q: opt(params.get("q")),
    category: opt(params.get("category")),
    id: opt(params.get("id")),
    mode: opt(params.get("mode")),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Consulta no válida." },
      { status: 400 },
    );
  }
  const { q, category, id, mode } = parsed.data;

  /* Modo categories: lista real cacheada 24 h. */
  if (mode === "categories") {
    try {
      const categories = await getCategories();
      return NextResponse.json({ categories });
    } catch (error) {
      console.error("[api/recipes]", error);
      return NextResponse.json(
        { error: "El servicio de recetas no está disponible ahora." },
        { status: 502 },
      );
    }
  }

  /* Modo random: receta aleatoria de TheMealDB. Sin caché a propósito
     (cada pedido debe poder devolver una receta distinta) y con el mismo
     mapper de detalle que el lookup por id, para que el frontend reutilice
     su diálogo sin cambios. Upstream sin resultados → { meals: [] } (200). */
  if (mode === "random") {
    try {
      const fetchOne = async () => {
        const json = (await fetchTheMealDB("random.php")) as {
          meals?: unknown[] | null;
        };
        return mealDetail(Array.isArray(json.meals) ? json.meals[0] : null);
      };
      let meal = await fetchOne();
      // Reintento único si repite la última servida; si vuelve a repetir, se
      // acepta (el upstream es aleatorio y no hay más garantías).
      if (meal && meal.id === lastRandomMealId) meal = await fetchOne();
      if (meal) lastRandomMealId = meal.id;
      return NextResponse.json({ meals: meal ? [meal] : [] });
    } catch (error) {
      console.error("[api/recipes]", error);
      return NextResponse.json(
        { error: "El servicio de recetas no está disponible ahora." },
        { status: 502 },
      );
    }
  }

  /* Modo lookup: detalle por id (404 honesto si no existe). */
  if (id !== undefined) {
    const key = `i:${id}`;
    const cached = cacheGet(key);
    if (cached) return NextResponse.json(cached as { meal: MealDetail });

    try {
      const json = (await fetchTheMealDB(`lookup.php?i=${id}`)) as {
        meals?: unknown[] | null;
      };
      const meal = mealDetail(Array.isArray(json.meals) ? json.meals[0] : null);
      if (!meal) {
        return NextResponse.json({ error: "No encontramos esa receta." }, { status: 404 });
      }
      const payload = { meal };
      cacheSet(key, payload);
      return NextResponse.json(payload);
    } catch (error) {
      console.error("[api/recipes]", error);
      return NextResponse.json(
        { error: "El servicio de recetas no está disponible ahora." },
        { status: 502 },
      );
    }
  }

  /* Modos búsqueda (q) y categoría, con caché de 30 min. */
  try {
    if (q !== undefined) {
      const key = `q:${q.toLowerCase()}`;
      const cached = cacheGet(key);
      if (cached) return NextResponse.json(cached as { meals: MealSummary[] });

      const json = await fetchTheMealDB(`search.php?s=${encodeURIComponent(q)}`);
      const payload = { meals: toSummaries(json, null) };
      cacheSet(key, payload);
      return NextResponse.json(payload);
    }

    if (category !== undefined) {
      // Validar contra la lista real y usar el nombre canónico (case-insensitive).
      const categories = await getCategories();
      const canonical = categories.find((c) => c.toLowerCase() === category.toLowerCase());
      if (!canonical) {
        return NextResponse.json(
          { error: "Esa categoría no existe. Elegí una de la lista." },
          { status: 400 },
        );
      }

      const key = `c:${canonical.toLowerCase()}`;
      const cached = cacheGet(key);
      if (cached) return NextResponse.json(cached as { meals: MealSummary[] });

      const json = await fetchTheMealDB(`filter.php?c=${encodeURIComponent(canonical)}`);
      const payload = { meals: toSummaries(json, canonical) };
      cacheSet(key, payload);
      return NextResponse.json(payload);
    }

    // Sin ningún modo → 400 (nunca responder vacío como si fuera OK).
    return NextResponse.json(
      { error: "Indicá qué querés buscar: texto (q), categoría, id o mode=categories." },
      { status: 400 },
    );
  } catch (error) {
    console.error("[api/recipes]", error);
    return NextResponse.json(
      { error: "El servicio de recetas no está disponible ahora." },
      { status: 502 },
    );
  }
}
