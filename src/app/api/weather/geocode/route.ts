import net from "node:net";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/* Sandbox: sin ruta IPv6 y el auto-select de familia de undici (Happy
   Eyeballs) termina en ETIMEDOUT contra open-meteo; deshabilitado a nivel
   proceso el connect usa el primer lookup (IPv4) y funciona. */
try {
  net.setDefaultAutoSelectFamily(false);
} catch {
  // Node sin la API: seguimos con el default.
}

/** Lugar normalizado que devuelve el geocodificador. */
type GeoResult = {
  name: string;
  admin1: string | null;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
};

const querySchema = z
  .string()
  .trim()
  .min(2, "Escribí al menos 2 caracteres.")
  .max(60, "Máximo 60 caracteres.");

/* Caché en memoria del proceso: clave = nombre normalizado, TTL 60 min. */

const CACHE_TTL_MS = 60 * 60_000;
const CACHE_MAX = 100;
const cache = new Map<string, { at: number; data: GeoResult[] }>();

function cacheGet(key: string): GeoResult[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet(key: string, data: GeoResult[]) {
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

/* Parseo seguro de Open-Meteo Geocoding ----------------------------------- */

/** Número finito o NaN (nunca lanza). */
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

type GeoItem = {
  name?: unknown;
  admin1?: unknown;
  country?: unknown;
  country_code?: unknown;
  latitude?: unknown;
  longitude?: unknown;
};

export async function GET(req: Request) {
  const rl = rateLimit(clientKey(req, "geo-weather"), 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Demasiadas consultas. Probá de nuevo en ${rl.retryAfterSec} segundos.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const raw = new URL(req.url).searchParams.get("name") ?? "";
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

  try {
    const qEnc = encodeURIComponent(parsed.data);
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${qEnc}&count=5&language=es&format=json`,
      {
        headers: { "User-Agent": "KinetixFitt/1.0" },
        signal: AbortSignal.timeout(7000),
      },
    );
    if (!res.ok) throw new Error(`Open-Meteo geocoding → HTTP ${res.status}`);

    const json = (await res.json()) as { results?: GeoItem[] };
    const items = Array.isArray(json.results) ? json.results : [];

    // Descartar items sin nombre usable o sin coordenadas finitas.
    const results: GeoResult[] = [];
    for (const it of items) {
      const name = typeof it.name === "string" ? it.name.trim() : "";
      const lat = num(it.latitude);
      const lon = num(it.longitude);
      if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;

      results.push({
        name,
        admin1: typeof it.admin1 === "string" && it.admin1.trim() !== "" ? it.admin1 : null,
        country: typeof it.country === "string" ? it.country : "",
        countryCode: typeof it.country_code === "string" ? it.country_code : "",
        lat,
        lon,
      });
      if (results.length >= 5) break;
    }

    cacheSet(norm, results);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("[api/weather/geocode]", error);
    return NextResponse.json(
      { error: "No se pudo consultar el geocodificador. Intentá de nuevo en un momento." },
      { status: 502 },
    );
  }
}
