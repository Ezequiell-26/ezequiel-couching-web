"use client";

/**
 * ¿Entrenás al aire libre? (Task 34) — clima actual vía Open-Meteo (API abierta,
 * sin key) a través de las rutas propias /api/weather y /api/weather/geocode.
 * La ciudad elegida se recuerda en localStorage (ec_weather_city_v1); por
 * defecto Buenos Aires. Sin datos inventados: si la API falla, se muestra error.
 */

import * as React from "react";
import {
  CheckCircle2,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  MapPin,
  RefreshCw,
  Search,
  Sun,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { track } from "@/lib/analytics";

interface GeoResult {
  name: string;
  admin1: string | null;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
}

interface WeatherData {
  current: { temp: number; apparent: number; humidity: number; windKmh: number; code: number; precip: number };
  daily: { precipProb: number | null; tMax: number; tMin: number };
  verdict: { level: "great" | "ok" | "warn" | "bad"; label: string };
}

type Place = Pick<GeoResult, "name" | "admin1" | "country" | "lat" | "lon">;

const STORAGE_KEY = "ec_weather_city_v1";
/** Ciudad por defecto (la mayoría entrena en AMBA): primera visita con datos reales. */
const DEFAULT_PLACE: Place = {
  name: "Buenos Aires",
  admin1: null,
  country: "Argentina",
  lat: -34.61315,
  lon: -58.37723,
};

/** WMO weather code → etiqueta es + icono lucide. */
function wmoInfo(code: number): { label: string; Icon: LucideIcon } {
  if (code === 0) return { label: "Despejado", Icon: Sun };
  if (code === 1 || code === 2) return { label: "Parcialmente nublado", Icon: CloudSun };
  if (code === 3) return { label: "Nublado", Icon: Cloud };
  if (code === 45 || code === 48) return { label: "Niebla", Icon: CloudFog };
  if (code >= 51 && code <= 57) return { label: "Llovizna", Icon: CloudDrizzle };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: "Lluvia", Icon: CloudRain };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: "Nieve", Icon: CloudSnow };
  if (code >= 95) return { label: "Tormenta", Icon: CloudLightning };
  return { label: "Clima variable", Icon: Cloud };
}

const VERDICT_STYLES: Record<WeatherData["verdict"]["level"], { chip: string; Icon: LucideIcon }> = {
  great: { chip: "border-primary/50 bg-primary/15 text-primary", Icon: CheckCircle2 },
  ok: { chip: "border-border/70 bg-accent/60 text-foreground", Icon: CheckCircle2 },
  warn: { chip: "border-destructive/40 bg-destructive/10 text-destructive", Icon: TriangleAlert },
  bad: { chip: "border-destructive/50 bg-destructive/15 text-destructive", Icon: TriangleAlert },
};

function loadPlace(): Place {
  if (typeof window === "undefined") return DEFAULT_PLACE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PLACE;
    const p = JSON.parse(raw) as Place;
    if (typeof p.name === "string" && Number.isFinite(p.lat) && Number.isFinite(p.lon)) return p;
    return DEFAULT_PLACE;
  } catch {
    return DEFAULT_PLACE;
  }
}

export function WeatherCard() {
  const [place, setPlace] = React.useState<Place>(() => loadPlace());
  const [data, setData] = React.useState<WeatherData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Búsqueda de ciudad (geocoding) con debounce.
  const [picking, setPicking] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<GeoResult[]>([]);

  const fetchWeather = React.useCallback(async (p: Place) => {
    // Sin setState síncrono: el llamador (evento) marca loading=true cuando
    // corresponde; acá todo corre después del primer await.
    try {
      const res = await fetch(`/api/weather?lat=${p.lat}&lon=${p.lon}`);
      const json = (await res.json()) as WeatherData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "No se pudo consultar el clima.");
      setData({ current: json.current, daily: json.daily, verdict: json.verdict });
      setError(null);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "No se pudo consultar el clima.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Primera carga (y recarga al cambiar de ciudad): diferida a un timer para
  // mantener el cuerpo del effect libre de llamadas síncronas que setean estado.
  React.useEffect(() => {
    const t = setTimeout(() => {
      void (async () => {
        await fetchWeather(place);
      })();
    }, 0);
    return () => clearTimeout(t);
  }, [place, fetchWeather]);

  // Debounce del geocoding mientras se escribe: el setState ocurre siempre
  // después de un await (nunca síncrono dentro del effect) con flag de cancelación.
  React.useEffect(() => {
    const q = query.trim();
    if (!picking || q.length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/weather/geocode?name=${encodeURIComponent(q)}`);
          const json = (await res.json()) as { results?: GeoResult[] };
          if (!cancelled) setSuggestions(res.ok ? (json.results ?? []) : []);
        } catch {
          if (!cancelled) setSuggestions([]);
        }
      })();
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, picking]);

  /** Sugerencias visibles: solo con query válida (deriva, sin estado extra). */
  const visibleSuggestions = picking && query.trim().length >= 2 ? suggestions : [];

  function chooseCity(g: GeoResult) {
    const next: Place = { name: g.name, admin1: g.admin1, country: g.country, lat: g.lat, lon: g.lon };
    setLoading(true);
    setPlace(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* almacenamiento no disponible */
    }
    setPicking(false);
    setQuery("");
    setSuggestions([]);
    track("zona_weather_city", { city: g.name, country: g.countryCode });
  }

  function changeCity() {
    setPicking(true);
    setQuery("");
    setSuggestions([]);
  }

  function retry() {
    setLoading(true);
    void fetchWeather(place);
  }

  const wmo = data ? wmoInfo(data.current.code) : null;
  const verdict = data ? VERDICT_STYLES[data.verdict.level] : null;
  const placeLabel = place.admin1 ? `${place.name}, ${place.admin1}` : place.name;

  return (
    <Card>
      <CardHeader className="gap-1 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin aria-hidden className="size-4 shrink-0 text-primary" />
              ¿Entrenás al aire libre?
            </CardTitle>
            <CardDescription className="truncate">Clima de hoy en {placeLabel}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 text-muted-foreground"
            onClick={picking ? () => setPicking(false) : changeCity}
          >
            {picking ? "Cancelar" : "Cambiar ciudad"}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {picking ? (
          <div>
            <Label htmlFor="weather-city">Buscar ciudad</Label>
            <div className="relative mt-2">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="weather-city"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ej.: Córdoba, Rosario, Montevideo…"
                autoComplete="off"
                className="pl-9"
              />
            </div>
            {visibleSuggestions.length > 0 ? (
              <ul aria-label="Ciudades encontradas" className="mt-2 max-h-60 space-y-1 overflow-y-auto">
                {visibleSuggestions.map((g, i) => (
                  <li key={`${g.name}-${g.lat}-${g.lon}-${i}`}>
                    <button
                      type="button"
                      onClick={() => chooseCity(g)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
                    >
                      <span className="min-w-0 truncate font-medium">{g.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {[g.admin1, g.country].filter(Boolean).join(", ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : query.trim().length >= 2 ? (
              <p aria-live="polite" className="mt-2 text-sm text-muted-foreground">
                Sin resultados para «{query.trim()}».
              </p>
            ) : null}
          </div>
        ) : loading ? (
          <p aria-busy="true" className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <RefreshCw aria-hidden className="size-4 animate-spin" /> Consultando el clima…
          </p>
        ) : error || !data || !wmo || !verdict ? (
          <div aria-live="polite" className="flex flex-col items-start gap-2 py-2">
            <p className="text-sm text-destructive">{error ?? "No se pudo consultar el clima."}</p>
            <Button variant="outline" size="sm" onClick={retry}>
              <RefreshCw aria-hidden /> Reintentar
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <wmo.Icon aria-hidden className="size-10 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-3xl font-bold tabular-nums">{data.current.temp}°</p>
                <p className="truncate text-sm text-muted-foreground">
                  {wmo.label} · Sensación {data.current.apparent}°
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto size-8 shrink-0 text-muted-foreground"
                aria-label="Actualizar clima"
                onClick={retry}
              >
                <RefreshCw aria-hidden className="size-4" />
              </Button>
            </div>

            <p aria-live="polite" className="mt-4">
              <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium ${verdict.chip}`}>
                <verdict.Icon aria-hidden className="size-4 shrink-0" />
                {data.verdict.label}
              </span>
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Detalle del clima">
              <Badge variant="secondary">Lluvia {data.daily.precipProb ?? "—"}%</Badge>
              <Badge variant="secondary">Viento {data.current.windKmh} km/h</Badge>
              <Badge variant="secondary">Humedad {data.current.humidity}%</Badge>
              <Badge variant="secondary">
                Máx {data.daily.tMax}° / Mín {data.daily.tMin}°
              </Badge>
            </div>
          </>
        )}

        <p className="mt-4 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
          Datos: Open-Meteo (API abierta). El veredicto es orientativo: siempre priorizá tu seguridad.
        </p>
      </CardContent>
    </Card>
  );
}
