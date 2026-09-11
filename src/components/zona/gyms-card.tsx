"use client";

/**
 * Gimnasios cerca (Task 37-a) — POIs leisure:fitness_centre de OpenStreetMap
 * vía Photon (komoot) a través de /api/gyms. Reusa EXACTAMENTE la misma fuente
 * de coordenadas que la card de clima: localStorage ec_weather_city_v1, sin
 * default propio. Sin ciudad elegida muestra una línea que invita a buscarla
 * en el clima; cuando la ciudad cambia, la card de clima lo avisa con el
 * evento WEATHER_CITY_EVENT (misma pestaña) y llega también por "storage"
 * (otras pestañas). Sin datos inventados: si la API falla, error honesto.
 */

import * as React from "react";
import { Loader2, MapPin, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { WEATHER_CITY_EVENT } from "@/components/zona/weather-card";

interface Gym {
  name: string;
  address: string | null;
  area: string | null;
  lat: number;
  lon: number;
  distanceKm: number;
  url: string;
}

interface GymsData {
  gyms: Gym[];
  attribution: string;
}

/** Misma forma que Place en weather-card (persistido en el mismo key). */
type Place = { name: string; admin1: string | null; country: string; lat: number; lon: number };

const WEATHER_STORAGE_KEY = "ec_weather_city_v1";

/** Lugar elegido en el clima, o null si todavía no se buscó una zona. */
function readPlace(): Place | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WEATHER_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Place>;
    const lat = typeof p.lat === "number" ? p.lat : NaN;
    const lon = typeof p.lon === "number" ? p.lon : NaN;
    if (typeof p.name === "string" && Number.isFinite(lat) && Number.isFinite(lon)) {
      return {
        name: p.name,
        admin1: typeof p.admin1 === "string" ? p.admin1 : null,
        country: typeof p.country === "string" ? p.country : "",
        lat,
        lon,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function samePlace(a: Place | null, b: Place | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.lat === b.lat && a.lon === b.lon && a.name === b.name;
}

/** Mensaje es-AR para fallos sin respuesta del servidor (red caída, etc.). */
const NETWORK_ERROR = "No se pudieron cargar los gimnasios cercanos. Intentá de nuevo en un momento.";

export function GymsCard() {
  const [place, setPlace] = React.useState<Place | null>(() => readPlace());
  const [data, setData] = React.useState<GymsData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Refs para sincronizar con la card de clima sin cierres obsoletos y para
  // descartar respuestas que llegan después de un cambio de ciudad.
  const placeRef = React.useRef<Place | null>(place);
  const reqIdRef = React.useRef(0);

  React.useEffect(() => {
    const sync = () => {
      const next = readPlace();
      const changed = !samePlace(placeRef.current, next);
      placeRef.current = next;
      if (!changed) return;
      // Ciudad nueva: invalida la respuesta en vuelo y limpia resultados.
      reqIdRef.current += 1;
      setPlace(next);
      setData(null);
      setError(null);
      setLoading(false);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === WEATHER_STORAGE_KEY || e.key === null) sync();
    };
    window.addEventListener(WEATHER_CITY_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(WEATHER_CITY_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  async function loadGyms() {
    if (loading) return;
    const p = readPlace(); // coordenadas frescas al momento del click
    if (!p) return;
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gyms?lat=${p.lat}&lon=${p.lon}`);
      const json = (await res.json()) as GymsData & { error?: string };
      if (reqId !== reqIdRef.current) return; // respuesta obsoleta
      if (!res.ok) {
        throw new Error(json.error ?? NETWORK_ERROR);
      }
      setData({ gyms: json.gyms, attribution: json.attribution });
      setError(null);
      track("zona_gyms", { count: json.gyms.length });
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      setData(null);
      // TypeError = fallo de red sin respuesta (fetch): mensaje propio es-AR;
      // el resto son errores con mensaje del servidor (400/429/502).
      setError(err instanceof TypeError ? NETWORK_ERROR : err instanceof Error ? err.message : NETWORK_ERROR);
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }

  const placeLabel = place ? (place.admin1 ? `${place.name}, ${place.admin1}` : place.name) : null;

  return (
    <Card>
      <CardHeader className="gap-1 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin aria-hidden className="size-4 shrink-0 text-primary" />
          Gimnasios cerca
        </CardTitle>
        {placeLabel ? <CardDescription className="truncate">Cerca de {placeLabel}</CardDescription> : null}
      </CardHeader>

      <CardContent>
        {!place ? (
          <p className="text-sm text-muted-foreground">
            Buscá tu zona en el clima para ver gimnasios cerca.
          </p>
        ) : loading ? (
          <p aria-busy="true" className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 aria-hidden className="size-4 animate-spin" /> Buscando…
          </p>
        ) : error ? (
          <div aria-live="polite" className="flex flex-col items-start gap-2 py-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="min-h-11" onClick={() => void loadGyms()}>
              <RefreshCw aria-hidden /> Reintentar
            </Button>
          </div>
        ) : data ? (
          data.gyms.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-4 text-center text-sm text-muted-foreground">
              No encontramos gimnasios cerca de esa ubicación.
            </p>
          ) : (
            <>
              <ul aria-label="Gimnasios cercanos" className="max-h-96 space-y-1 overflow-y-auto pr-1">
                {data.gyms.map((gym, i) => (
                  <li key={`${gym.name}-${gym.lat}-${gym.lon}-${i}`}>
                    <a
                      href={gym.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50"
                    >
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate text-sm font-medium">{gym.name}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {gym.distanceKm.toLocaleString("es-AR")} km
                        </span>
                      </span>
                      {gym.address || gym.area ? (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {[gym.address, gym.area].filter(Boolean).join(" · ")}
                        </span>
                      ) : null}
                    </a>
                  </li>
                ))}
              </ul>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 min-h-11 text-muted-foreground"
                onClick={() => void loadGyms()}
              >
                <RefreshCw aria-hidden /> Actualizar
              </Button>
            </>
          )
        ) : (
          <Button variant="outline" className="min-h-11" onClick={() => void loadGyms()}>
            <MapPin aria-hidden /> Ver gimnasios cerca
          </Button>
        )}

        <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          Datos de OpenStreetMap (ODbL) vía Photon. La información puede estar incompleta.
        </p>
      </CardContent>
    </Card>
  );
}
