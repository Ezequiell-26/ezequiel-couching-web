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

/** Veredicto determinista de entrenabilidad al aire libre. */
type Verdict = { level: "great" | "ok" | "warn" | "bad"; label: string };

/** Banda OMS del índice UV (escala pública) + etiqueta es-AR. */
type UvBand = { band: string; label: string };

/** Calidad del aire actual (EAQI europeo + PM) o null si la sub-llamada falló. */
type AirQuality = {
  euAqi: number;
  usAqi: number | null;
  pm25: number | null;
  pm10: number | null;
  band: string;
  bandLabel: string;
};

type WeatherPayload = {
  current: {
    temp: number;
    apparent: number;
    humidity: number;
    windKmh: number;
    code: number;
    precip: number;
    uv: number | null;
    uvBand: UvBand | null;
  };
  daily: {
    precipProb: number | null;
    tMax: number;
    tMin: number;
    sunrise: string | null;
    sunset: string | null;
    uvMax: number | null;
  };
  verdict: Verdict;
  airQuality: AirQuality | null;
};

/* Validación de coordenadas: strings de query → número en rango. */

function numParam(name: string, min: number, max: number) {
  return z
    .string()
    .trim()
    .min(1, `Falta el parámetro ${name}.`)
    .refine((s) => Number.isFinite(Number(s)), `El parámetro ${name} debe ser un número.`)
    .refine(
      (s) => Number(s) >= min && Number(s) <= max,
      `El parámetro ${name} debe estar entre ${min} y ${max}.`,
    )
    .transform((s) => Number(s));
}

const coordsSchema = z.object({
  lat: numParam("lat", -90, 90),
  lon: numParam("lon", -180, 180),
});

/* Caché en memoria del proceso: clave = "lat,lon" a 2 decimales, TTL 15 min. */

const CACHE_TTL_MS = 15 * 60_000;
const CACHE_MAX = 100;
const cache = new Map<string, { at: number; data: WeatherPayload }>();

function cacheGet(key: string): WeatherPayload | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet(key: string, data: WeatherPayload) {
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

/* Parseo seguro de Open-Meteo Forecast ------------------------------------- */

/** Número finito o NaN (nunca lanza). */
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

const roundInt = (n: number) => Math.round(n);
const round1 = (n: number) => Math.round(n * 10) / 10;

type ForecastJson = {
  current?: {
    temperature_2m?: unknown;
    relative_humidity_2m?: unknown;
    apparent_temperature?: unknown;
    precipitation?: unknown;
    weather_code?: unknown;
    wind_speed_10m?: unknown;
    uv_index?: unknown;
  };
  daily?: {
    precipitation_probability_max?: unknown;
    temperature_2m_max?: unknown;
    temperature_2m_min?: unknown;
    sunrise?: unknown;
    sunset?: unknown;
    uv_index_max?: unknown;
  };
};

/** Primer elemento numérico de una serie daily (o null si viene null/ausente). */
function firstDaily(v: unknown): number | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const n = num(v[0]);
  return Number.isFinite(n) ? n : null;
}

/** Primer elemento string de una serie daily (o null si falta/no es string). */
function firstDailyStr(v: unknown): string | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  return typeof v[0] === "string" ? v[0] : null;
}

/** "HH:mm" (24 h) desde el ISO local de Open-Meteo ("2026-09-11T07:12") o null. */
function hhmm(v: string | null): string | null {
  if (v === null) return null;
  const m = /^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})/.exec(v.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${m[1]}:${m[2]}`;
}

/* Parseo seguro de Open-Meteo Air Quality ---------------------------------- */

type AirQualityJson = {
  current?: {
    european_aqi?: unknown;
    us_aqi?: unknown;
    pm2_5?: unknown;
    pm10?: unknown;
  };
};

/** Banda pública EEA del AQI europeo: 0–20 Buena … >100 Extremadamente mala. */
function aqiBand(euAqi: number): { band: string; bandLabel: string } {
  if (euAqi <= 20) return { band: "good", bandLabel: "Buena" };
  if (euAqi <= 40) return { band: "fair", bandLabel: "Razonable" };
  if (euAqi <= 60) return { band: "moderate", bandLabel: "Moderada" };
  if (euAqi <= 80) return { band: "poor", bandLabel: "Mala" };
  if (euAqi <= 100) return { band: "very-poor", bandLabel: "Muy mala" };
  return { band: "extremely-poor", bandLabel: "Extremadamente mala" };
}

/** Escala OMS del índice UV (estándar público): 0–2 Bajo … ≥11 Extremo. */
function uvBand(v: number | null): UvBand | null {
  if (v === null) return null;
  if (v <= 2) return { band: "low", label: "Bajo" };
  if (v <= 5) return { band: "moderate", label: "Moderado" };
  if (v <= 7) return { band: "high", label: "Alto" };
  if (v <= 10) return { band: "very-high", label: "Muy alto" };
  return { band: "extreme", label: "Extremo" };
}

/** AirQuality desde el JSON upstream, o null sin EAQI numérico (nunca lanza). */
function airQualityFrom(json: AirQualityJson): AirQuality | null {
  const cur = json.current ?? {};
  const euAqiRaw = num(cur.european_aqi);
  if (!Number.isFinite(euAqiRaw)) return null;
  const euAqi = roundInt(euAqiRaw);
  const usAqi = num(cur.us_aqi);
  const pm25 = num(cur.pm2_5);
  const pm10 = num(cur.pm10);
  return {
    euAqi,
    usAqi: Number.isFinite(usAqi) ? roundInt(usAqi) : null,
    pm25: Number.isFinite(pm25) ? round1(pm25) : null,
    pm10: Number.isFinite(pm10) ? round1(pm10) : null,
    ...aqiBand(euAqi),
  };
}

/** Veredicto determinista, evaluado en este orden exacto. */
function verdictFor(precip: number, precipProbRaw: number | null, apparent: number): Verdict {
  const precipProb = precipProbRaw ?? 0;
  if (precip > 0.4 || precipProb >= 60) {
    return { level: "bad", label: "Probable lluvia: mejor entrenar bajo techo" };
  }
  if (apparent >= 33) {
    return { level: "warn", label: "Calor intenso: si salís, hacelo temprano y con agua" };
  }
  if (apparent <= 4) {
    return { level: "warn", label: "Mucho frío: calentá adentro y abrigate bien" };
  }
  if (precipProb <= 35 && apparent >= 14 && apparent <= 28) {
    return { level: "great", label: "Ideal para entrenar al aire libre" };
  }
  return { level: "ok", label: "Se puede entrenar afuera, ojo al clima" };
}

export async function GET(req: Request) {
  const rl = rateLimit(clientKey(req, "weather"), 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Demasiadas consultas. Probá de nuevo en ${rl.retryAfterSec} segundos.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const params = new URL(req.url).searchParams;
  const parsed = coordsSchema.safeParse({
    lat: params.get("lat") ?? "",
    lon: params.get("lon") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Coordenadas no válidas." },
      { status: 400 },
    );
  }

  const { lat, lon } = parsed.data;
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = cacheGet(key);
  if (cached) return NextResponse.json(cached);

  try {
    // Mismos 2 decimales que la clave de caché (≈1 km, sobrado para clima).
    const lat2 = key.split(",")[0];
    const lon2 = key.split(",")[1];
    const forecastUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat2}` +
      `&longitude=${lon2}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,uv_index` +
      `&daily=precipitation_probability_max,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max` +
      `&forecast_days=1&timezone=auto`;
    const airUrl =
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat2}` +
      `&longitude=${lon2}` +
      `&current=european_aqi,pm2_5,pm10,us_aqi&timezone=auto`;

    // Forecast y aire en paralelo: el aire NUNCA tumba al clima (allSettled).
    const [fRes, aRes] = await Promise.allSettled([
      fetch(forecastUrl, {
        headers: { "User-Agent": "FITSYNC/1.0" },
        signal: AbortSignal.timeout(7000),
      }),
      fetch(airUrl, {
        headers: { "User-Agent": "FITSYNC/1.0" },
        signal: AbortSignal.timeout(7000),
      }),
    ]);

    if (fRes.status === "rejected") throw fRes.reason;
    const res = fRes.value;
    if (!res.ok) throw new Error(`Open-Meteo forecast → HTTP ${res.status}`);

    const json = (await res.json()) as ForecastJson;
    const cur = json.current ?? {};
    const daily = json.daily ?? {};

    const temp = num(cur.temperature_2m);
    const apparent = num(cur.apparent_temperature);
    const humidity = num(cur.relative_humidity_2m);
    const windKmh = num(cur.wind_speed_10m);
    const code = num(cur.weather_code);
    const precip = num(cur.precipitation);

    const precipProb = firstDaily(daily.precipitation_probability_max);
    const tMax = firstDaily(daily.temperature_2m_max);
    const tMin = firstDaily(daily.temperature_2m_min);

    // UV y sol con degradación pieza a pieza: si un campo nuevo no viene o
    // viene inválido queda null (nunca afecta al 502 de datos esenciales).
    const uvRaw = num(cur.uv_index);
    const uv = Number.isFinite(uvRaw) ? roundInt(uvRaw) : null;
    const uvMaxRaw = firstDaily(daily.uv_index_max);
    const uvMax = uvMaxRaw === null ? null : roundInt(uvMaxRaw);
    const sunrise = hhmm(firstDailyStr(daily.sunrise));
    const sunset = hhmm(firstDailyStr(daily.sunset));

    // Datos esenciales ausentes = respuesta upstream inutilizable → 502 honesto.
    if (
      !Number.isFinite(temp) ||
      !Number.isFinite(apparent) ||
      !Number.isFinite(humidity) ||
      !Number.isFinite(windKmh) ||
      !Number.isFinite(code) ||
      !Number.isFinite(precip) ||
      tMax === null ||
      tMin === null
    ) {
      throw new Error("Open-Meteo forecast devolvió datos incompletos");
    }

    // Aire con degradación honesta: si la sub-llamada falla o no trae un
    // european_aqi numérico, airQuality queda null y el clima sigue 200.
    let airQuality: AirQuality | null = null;
    if (aRes.status === "fulfilled") {
      const airRes = aRes.value;
      if (airRes.ok) {
        try {
          airQuality = airQualityFrom((await airRes.json()) as AirQualityJson);
        } catch {
          // Cuerpo ilegible: seguimos sin aire.
        }
      }
      if (airQuality === null) {
        console.error(
          "[api/weather] air-quality degradada:",
          airRes.ok ? "respuesta sin european_aqi numérico" : `HTTP ${airRes.status}`,
        );
      }
    } else {
      console.error("[api/weather] air-quality degradada:", aRes.reason);
    }

    const payload: WeatherPayload = {
      current: {
        temp: roundInt(temp),
        apparent: roundInt(apparent),
        humidity: roundInt(humidity),
        windKmh: roundInt(windKmh),
        code: roundInt(code),
        precip: round1(precip),
        uv,
        uvBand: uvBand(uv),
      },
      daily: {
        precipProb,
        tMax: roundInt(tMax),
        tMin: roundInt(tMin),
        sunrise,
        sunset,
        uvMax,
      },
      verdict: verdictFor(round1(precip), precipProb, roundInt(apparent)),
      airQuality,
    };

    cacheSet(key, payload);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api/weather]", error);
    return NextResponse.json(
      { error: "No se pudo consultar el clima. Intentá de nuevo en un momento." },
      { status: 502 },
    );
  }
}
