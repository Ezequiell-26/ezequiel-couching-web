"use client";

import { cn } from "@/lib/utils";

/**
 * Gráficos SVG propios de Mi Zona (Task 24-d): sin dependencias externas,
 * accesibles (role="img" + aria-label) y consistentes con el tema
 * (línea/barras en volt vía clase stroke-primary/fill-primary).
 * Cada punto/barra viene pre-formateado por el llamador: los componentes solo
 * dibujan y etiquetan ejes con min/max.
 */

export interface ChartDatum {
  label: string;
  value: number;
}

const W = 320;
const H = 150;
const PAD = { l: 38, r: 16, t: 18, b: 24 };
const innerW = W - PAD.l - PAD.r;
const innerH = H - PAD.t - PAD.b;

const axisFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

function scaleDomain(values: number[]): { lo: number; hi: number } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return { lo: min - 1, hi: max + 1 };
  const span = max - min;
  return { lo: min - span * 0.1, hi: max + span * 0.1 };
}

/* ── LineChart: curva de evolución (peso corporal) ─────────────────────────── */

export function LineChart({
  data,
  ariaLabel,
  className,
}: {
  data: ChartDatum[];
  ariaLabel: string;
  className?: string;
}) {
  if (data.length === 0) return null;

  const { lo, hi } = scaleDomain(data.map((d) => d.value));
  const n = data.length;
  const x = (i: number) => (n === 1 ? PAD.l + innerW / 2 : PAD.l + (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * innerH;

  const polyline = data.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const last = data[n - 1];
  const lastX = x(n - 1);
  const lastY = y(last.value);
  // La etiqueta del último valor no debe salirse del lienzo.
  const valueAnchor = lastX > W - 46 ? "end" : "start";
  const valueX = valueAnchor === "end" ? lastX - 8 : lastX + 8;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("w-full", className)} role="img" aria-label={ariaLabel}>
      {/* rejilla base */}
      <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t} y2={PAD.t} className="stroke-border" strokeWidth="1" strokeDasharray="3 4" />
      <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} className="stroke-border" strokeWidth="1" />
      {/* eje Y: max y min */}
      <text x={PAD.l - 6} y={PAD.t + 4} textAnchor="end" className="fill-muted-foreground text-[9px]">
        {axisFmt.format(hi)}
      </text>
      <text x={PAD.l - 6} y={H - PAD.b} textAnchor="end" className="fill-muted-foreground text-[9px]">
        {axisFmt.format(lo)}
      </text>
      {/* eje X: primera y última etiqueta */}
      <text x={PAD.l} y={H - 7} textAnchor="start" className="fill-muted-foreground text-[9px]">
        {data[0].label}
      </text>
      <text x={W - PAD.r} y={H - 7} textAnchor="end" className="fill-muted-foreground text-[9px]">
        {last.label}
      </text>
      {/* línea */}
      {n > 1 ? (
        <polyline
          points={polyline}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-primary"
        />
      ) : null}
      {/* puntos */}
      {data.map((d, i) => (
        <circle
          key={`${d.label}-${i}`}
          cx={x(i)}
          cy={y(d.value)}
          r={i === n - 1 ? 4.5 : 3}
          className={i === n - 1 ? "fill-primary" : "fill-primary/70"}
        />
      ))}
      {/* último valor destacado */}
      <text x={valueX} y={lastY + 3.5} textAnchor={valueAnchor} className="fill-foreground text-[11px] font-bold">
        {axisFmt.format(last.value)}
      </text>
    </svg>
  );
}

/* ── BarChart: volumen por semana ──────────────────────────────────────────── */

export function BarChart({
  data,
  ariaLabel,
  className,
}: {
  data: ChartDatum[];
  ariaLabel: string;
  className?: string;
}) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value), 1);
  const n = data.length;
  const slot = innerW / n;
  const bw = Math.min(slot * 0.62, 34);
  const baseline = H - PAD.b;
  // Con muchas barras se muestran etiquetas alternadas para no encimar.
  const labelStep = n > 9 ? 2 : 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("w-full", className)} role="img" aria-label={ariaLabel}>
      {/* eje Y: max */}
      <text x={PAD.l - 6} y={PAD.t + 4} textAnchor="end" className="fill-muted-foreground text-[9px]">
        {axisFmt.format(max)}
      </text>
      <text x={PAD.l - 6} y={baseline} textAnchor="end" className="fill-muted-foreground text-[9px]">
        0
      </text>
      <line x1={PAD.l} x2={W - PAD.r} y1={baseline} y2={baseline} className="stroke-border" strokeWidth="1" />
      {data.map((d, i) => {
        const h = (d.value / max) * innerH;
        const x = PAD.l + i * slot + (slot - bw) / 2;
        return (
          <g key={`${d.label}-${i}`}>
            <rect
              x={x}
              y={baseline - h}
              width={bw}
              height={d.value > 0 ? Math.max(h, 3) : 0}
              rx="3"
              className="fill-primary"
              opacity={d.value > 0 ? 0.9 : 0}
            />
            {d.value > 0 ? (
              <text x={x + bw / 2} y={baseline - h - 4} textAnchor="middle" className="fill-foreground text-[8.5px] font-semibold">
                {axisFmt.format(d.value)}
              </text>
            ) : null}
            {i % labelStep === 0 ? (
              <text x={x + bw / 2} y={H - 7} textAnchor="middle" className="fill-muted-foreground text-[9px]">
                {d.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
