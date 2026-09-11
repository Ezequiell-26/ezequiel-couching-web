import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Resultado normalizado de la búsqueda (valores por 100 g). */
type FoodSearchResult = {
  id: string;
  name: string;
  brand: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "off" | "fruityvice";
};

const querySchema = z
  .string()
  .trim()
  .min(2, "Escribí al menos 2 caracteres.")
  .max(60, "Máximo 60 caracteres.");

/* Caché en memoria del proceso: clave = query normalizada, TTL 10 min. */

const CACHE_TTL_MS = 10 * 60_000;
const CACHE_MAX = 120;
const cache = new Map<string, { at: number; data: FoodSearchResult[] }>();

function cacheGet(key: string): FoodSearchResult[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet(key: string, data: FoodSearchResult[]) {
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

/* Parseo seguro de Open Food Facts --------------------------------------- */

/** Número finito o NaN (nunca lanza). */
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/** Primer valor de una lista "a, b, c" o string vacío. */
function firstBrand(brands: unknown): string {
  if (typeof brands !== "string") return "";
  return brands.split(",")[0]?.trim() ?? "";
}

type OffProduct = {
  code?: unknown;
  product_name?: unknown;
  product_name_es?: unknown;
  brands?: unknown;
  nutriments?: unknown;
};

/* Fallback FruityVice (datos reales por 100 g) ------------------------------ */

/**
 * Mapa es → en armado SOLO con frutas verificadas en la lista real de
 * https://www.fruityvice.com/api/fruit/all (49 frutas, consultada con curl):
 * todas las claves existen ahí con ese nombre exacto. Sinónimos es-AR
 * (frutilla/fresa, ananá/piña, banana/plátano) apuntan al mismo nombre EN.
 */
const FRUITYVICE_FRUITS: Record<string, { en: string; es: string }> = {
  banana: { en: "Banana", es: "Banana" },
  platano: { en: "Banana", es: "Plátano" },
  manzana: { en: "Apple", es: "Manzana" },
  naranja: { en: "Orange", es: "Naranja" },
  pera: { en: "Pear", es: "Pera" },
  frutilla: { en: "Strawberry", es: "Frutilla" },
  fresa: { en: "Strawberry", es: "Fresa" },
  durazno: { en: "Peach", es: "Durazno" },
  uva: { en: "Grape", es: "Uva" },
  sandia: { en: "Watermelon", es: "Sandía" },
  melon: { en: "Melon", es: "Melón" },
  kiwi: { en: "Kiwi", es: "Kiwi" },
  anana: { en: "Pineapple", es: "Ananá" },
  pina: { en: "Pineapple", es: "Piña" },
  limon: { en: "Lemon", es: "Limón" },
  lima: { en: "Lime", es: "Lima" },
  cereza: { en: "Cherry", es: "Cereza" },
  mango: { en: "Mango", es: "Mango" },
  papaya: { en: "Papaya", es: "Papaya" },
  frambuesa: { en: "Raspberry", es: "Frambuesa" },
  arandano: { en: "Blueberry", es: "Arándano" },
  pomelo: { en: "Pomelo", es: "Pomelo" },
  granada: { en: "Pomegranate", es: "Granada" },
  damasco: { en: "Apricot", es: "Damasco" },
  ciruela: { en: "Plum", es: "Ciruela" },
};

/** lowercase + sin acentos (para matchear «ananá», «FRUTILLA», «Sandía»…). */
function normalizeQuery(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type FruityViceJson = {
  name?: unknown;
  nutritions?: {
    calories?: unknown;
    protein?: unknown;
    fat?: unknown;
    carbohydrates?: unknown;
  };
};

/** Busca la fruta en FruityVice; null si no responde o trae datos inutilizables. */
async function fetchFruityVice(fruit: { en: string; es: string }): Promise<FoodSearchResult | null> {
  try {
    const res = await fetch(`https://www.fruityvice.com/api/fruit/${encodeURIComponent(fruit.en.toLowerCase())}`, {
      headers: { "User-Agent": "KinetixFitt/1.0" },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) {
      console.error(`[api/food-search] FruityVice → HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as FruityViceJson;
    const name = typeof json.name === "string" ? json.name.trim() : "";
    const nut = json.nutritions ?? {};
    // Sin calories numérico la fruta no sirve como resultado.
    const calories = num(nut.calories);
    if (!name || !Number.isFinite(calories) || calories < 0) {
      console.error("[api/food-search] FruityVice devolvió datos incompletos");
      return null;
    }
    const macro = (v: unknown) => {
      const n = num(v);
      return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0;
    };
    return {
      id: `fv:${name}`,
      name: fruit.es,
      brand: "FruityVice",
      kcal: Math.round(calories),
      protein: macro(nut.protein),
      carbs: macro(nut.carbohydrates),
      fat: macro(nut.fat),
      source: "fruityvice",
    };
  } catch (error) {
    console.error("[api/food-search] FruityVice falló", error);
    return null;
  }
}

export async function GET(req: Request) {
  const rl = rateLimit(clientKey(req, "food-search"), 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Demasiadas búsquedas. Probá de nuevo en ${rl.retryAfterSec} segundos.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const raw = new URL(req.url).searchParams.get("q") ?? "";
  const parsed = querySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Búsqueda no válida." },
      { status: 400 },
    );
  }

  const norm = parsed.data.trim().toLowerCase();
  const cached = cacheGet(norm);
  if (cached) return NextResponse.json({ results: cached });

  // OFF sufre 503s y degradaciones intermitentes (a veces v2 ignora search_terms
  // y devuelve la base completa): cadena v2 → v1 CGI → reintento v1.
  const qEnc = encodeURIComponent(parsed.data);
  const OFF_FIELDS = "code,product_name,product_name_es,brands,nutriments";
  const OFF_UA = { "User-Agent": "KinetixFitt/1.0 (web fitness; contacto via kinetixfitt form)" };
  const attempts = [
    `https://world.openfoodfacts.org/api/v2/search?search_terms=${qEnc}&page_size=24&fields=${OFF_FIELDS}`,
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${qEnc}&json=1&page_size=24&fields=${OFF_FIELDS}`,
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${qEnc}&json=1&page_size=24&fields=${OFF_FIELDS}`,
  ];

  try {
    let json: { products?: OffProduct[]; count?: unknown } | null = null;
    for (let i = 0; i < attempts.length; i++) {
      if (i > 0) await new Promise((ok) => setTimeout(ok, 500));
      try {
        const res = await fetch(attempts[i], { headers: OFF_UA, signal: AbortSignal.timeout(7000) });
        if (!res.ok) {
          console.error(`[api/food-search] intento ${i} → HTTP ${res.status}`);
          continue;
        }
        const data = (await res.json()) as { products?: OffProduct[]; count?: unknown };
        // Degradación conocida: count ≈ base completa = search_terms ignorado.
        if (typeof data.count === "number" && data.count > 1_000_000) {
          console.error(`[api/food-search] intento ${i} → search degradado (count ${data.count})`);
          continue;
        }
        json = data;
        break;
      } catch (attemptError) {
        console.error(`[api/food-search] intento ${i} falló`, attemptError);
      }
    }
    // OFF sin respuesta utilizable: se decide más abajo (502 solo si además el
    // fallback de frutas no da resultado).
    let results: FoodSearchResult[] = [];
    if (!json) {
      console.error("[api/food-search] Open Food Facts no respondió en ningún intento");
    } else {
      const products = Array.isArray(json.products) ? json.products : [];

      // Normalizar y deduplicar por (nombre + marca) en minúsculas.
      const seen = new Set<string>();
      const ranked: { hasEs: boolean; item: FoodSearchResult }[] = [];

      for (const p of products) {
        const nameEs = typeof p.product_name_es === "string" ? p.product_name_es.trim() : "";
        const name = nameEs || (typeof p.product_name === "string" ? p.product_name.trim() : "");
        const nut = (p.nutriments ?? {}) as Record<string, unknown>;
        const kcal = num(nut["energy-kcal_100g"]);
        // Descartar productos sin nombre usable o sin kcal por 100 g.
        if (!name || !Number.isFinite(kcal) || kcal < 0) continue;

        const brand = firstBrand(p.brands);
        const dedupeKey = `${name.toLowerCase()}|${brand.toLowerCase()}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const protein = num(nut["proteins_100g"]);
        const carbs = num(nut["carbohydrates_100g"]);
        const fat = num(nut["fat_100g"]);

        ranked.push({
          hasEs: nameEs !== "",
          item: {
            id: `off:${typeof p.code === "string" ? p.code : ""}`,
            name,
            brand,
            kcal: Math.round(kcal),
            protein: Number.isFinite(protein) ? Math.round(protein * 10) / 10 : 0,
            carbs: Number.isFinite(carbs) ? Math.round(carbs * 10) / 10 : 0,
            fat: Number.isFinite(fat) ? Math.round(fat * 10) / 10 : 0,
            source: "off",
          },
        });
      }

      // Orden: primero con nombre en español, luego alfabético ("es").
      ranked.sort((a, b) => {
        if (a.hasEs !== b.hasEs) return a.hasEs ? -1 : 1;
        return a.item.name.localeCompare(b.item.name, "es");
      });

      results = ranked.slice(0, 12).map((r) => r.item);
    }

    // Fallback FruityVice: OFF falló por completo o no encontró nada y el query
    // matchea una fruta del mapa → un único resultado con datos reales por 100 g.
    if (results.length === 0) {
      const fruit = FRUITYVICE_FRUITS[normalizeQuery(norm)];
      if (fruit) {
        const fv = await fetchFruityVice(fruit);
        if (fv) results = [fv];
      }
    }

    // OFF respondió (aunque con 0 resultados) o el fallback dio fruta → 200.
    if (json || results.length > 0) {
      cacheSet(norm, results);
      return NextResponse.json({ results });
    }

    // Todo falló: OFF caído y el query no es una fruta (o FruityVice tampoco respondió).
    throw new Error("Open Food Facts no respondió en ningún intento");
  } catch (error) {
    console.error("[api/food-search]", error);
    return NextResponse.json(
      { error: "No se pudo consultar Open Food Facts. Intentá de nuevo en un momento." },
      { status: 502 },
    );
  }
}
