import * as net from "node:net";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/* Sandbox: sin ruta IPv6 y el auto-select de familia de undici (Happy
   Eyeballs) termina en ETIMEDOUT/ENETUNREACH contra upstreams externos;
   deshabilitado a nivel proceso el connect usa el primer lookup (IPv4).
   Mismo fix que /api/weather (Task 34-a). */
try {
  net.setDefaultAutoSelectFamily(false);
} catch {
  // Node sin la API: seguimos con el default.
}

/** Un gimnasio real de OpenStreetMap, listo para la UI. */
type Gym = {
  name: string;
  address: string | null;
  area: string | null;
  lat: number;
  lon: number;
  distanceKm: number;
  url: string;
};

type GymsPayload = { gyms: Gym[]; attribution: string };

/* Validación de coordenadas: strings de query → número en rango
   (mismo estilo y mensajes que /api/weather). */

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
const cache = new Map<string, { at: number; data: GymsPayload }>();

function cacheGet(key: string): GymsPayload | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet(key: string, data: GymsPayload) {
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

/* Parseo seguro de Photon (GeoJSON) ------------------------------------------ */

type PhotonProperties = {
  name?: unknown;
  street?: unknown;
  housenumber?: unknown;
  district?: unknown;
  city?: unknown;
  state?: unknown;
  osm_type?: unknown;
  osm_id?: unknown;
};

type PhotonJson = {
  features?: Array<{
    geometry?: { coordinates?: unknown };
    properties?: PhotonProperties;
  }>;
};

/** String no vacío (trim) o null. */
function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

/** Distancia gran-círculo en km (haversine, radio medio 6371 km). */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Clave de deduplicación por identidad OSM (type+id); sin ids, nombre+coords. */
function dedupeKey(props: PhotonProperties, lat: number, lon: number, name: string): string {
  const osmType = str(props.osm_type);
  const osmId = str(props.osm_id);
  return osmType && osmId
    ? `${osmType}:${osmId}`
    : `${name}|${lat.toFixed(5)}|${lon.toFixed(5)}`;
}

/** Feature Photon → Gym (null si no tiene nombre usable o coordenadas inválidas). */
function gymFromFeature(
  feature: NonNullable<PhotonJson["features"]>[number],
  originLat: number,
  originLon: number,
): Gym | null {
  const props = feature.properties ?? {};
  const name = str(props.name);
  if (!name) return null;

  const coords = feature.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lon = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const street = str(props.street);
  const housenumber = str(props.housenumber);
  // Dirección a la argentina: calle + altura ("Av. Las Heras 2923").
  const address = [street, housenumber].filter(Boolean).join(" ") || null;
  const area = str(props.district) ?? str(props.city) ?? str(props.state);

  return {
    name,
    address,
    area,
    lat,
    lon,
    distanceKm: Math.round(haversineKm(originLat, originLon, lat, lon) * 10) / 10,
    url: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`,
  };
}

/** Merge de una o más respuestas Photon → gyms con nombre, sin duplicados. */
function gymsFromResponses(
  responses: PhotonJson[],
  originLat: number,
  originLon: number,
): Gym[] {
  const gyms: Gym[] = [];
  const seen = new Set<string>();
  for (const json of responses) {
    for (const feature of json.features ?? []) {
      const gym = gymFromFeature(feature, originLat, originLon);
      if (!gym) continue;
      const key = dedupeKey(feature.properties ?? {}, gym.lat, gym.lon, gym.name);
      if (seen.has(key)) continue;
      seen.add(key);
      gyms.push(gym);
    }
  }
  return gyms;
}

const ATTRIBUTION = "Datos de OpenStreetMap (ODbL) vía Photon";

/** Una búsqueda Photon (q variable, mismo tag/bbox). Rechaza si falla. */
async function searchPhoton(
  q: string,
  lat: number,
  lon: number,
  bbox: string,
): Promise<PhotonJson> {
  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}` +
    `&lat=${lat}&lon=${lon}&limit=12` +
    `&osm_tag=leisure:fitness_centre&bbox=${bbox}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "FITSYNC/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Photon → HTTP ${res.status}`);
  return (await res.json()) as PhotonJson;
}

export async function GET(req: Request) {
  const rl = rateLimit(clientKey(req, "gyms"), 30, 60_000);
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
  // Mismos 2 decimales que la clave de caché (≈1 km: sobrado para un radio
  // de búsqueda de ±5 km y hace consistente cada entrada con su clave).
  const lat2 = lat.toFixed(2);
  const lon2 = lon.toFixed(2);
  const key = `${lat2},${lon2}`;
  const cached = cacheGet(key);
  if (cached) return NextResponse.json(cached);

  // Bbox de ~±5 km alrededor del usuario, clampeado a rangos válidos.
  // Orden Photon/OpenStreetMap: minLon,minLat,maxLon,maxLat.
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const minLon = clamp(lon - 0.045, -180, 180);
  const maxLon = clamp(lon + 0.045, -180, 180);
  const minLat = clamp(lat - 0.03, -90, 90);
  const maxLat = clamp(lat + 0.03, -90, 90);
  const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;
  const originLat = Number(lat2);
  const originLon = Number(lon2);

  try {
    // Búsqueda principal en español.
    const primary = await searchPhoton("gimnasio", originLat, originLon, bbox);
    let gyms = gymsFromResponses([primary], originLat, originLon);

    // Pocos resultados → segunda pasada con "gym" (mismo tag/bbox) y merge
    // deduplicando por identidad OSM. Si esa segunda pasada falla, seguimos
    // con lo que dio la primera (degradación honesta, error logueado).
    if (gyms.length < 3) {
      try {
        const secondary = await searchPhoton("gym", originLat, originLon, bbox);
        gyms = gymsFromResponses([primary, secondary], originLat, originLon);
      } catch (error) {
        console.error("[api/gyms] segunda pasada (gym) falló:", error);
      }
    }

    const payload: GymsPayload = {
      gyms: gyms.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 8),
      attribution: ATTRIBUTION,
    };
    cacheSet(key, payload);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api/gyms]", error);
    return NextResponse.json(
      { error: "No se pudieron cargar los gimnasios cercanos. Intentá de nuevo en un momento." },
      { status: 502 },
    );
  }
}
