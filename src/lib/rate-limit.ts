/**
 * Rate limiting robusto con soporte para memoria local + headers estándar
 * Compatible con Next.js middleware y API routes
 */

type Bucket = { count: number; resetAt: number; blocked: boolean };

const buckets = new Map<string, Bucket>();

// Configuración por defecto por tipo de endpoint
const DEFAULT_LIMITS = {
  api: { limit: 100, windowMs: 60_000 }, // 100 req/min por IP para APIs generales
  auth: { limit: 5, windowMs: 300_000 }, // 5 intentos/5min para login
  contact: { limit: 10, windowMs: 60_000 }, // 10 mensajes/hora
  upload: { limit: 20, windowMs: 60_000 }, // 20 uploads/hora
  comment: { limit: 30, windowMs: 60_000 }, // 30 comentarios/hora
} as const;

export type RateLimitScope = keyof typeof DEFAULT_LIMITS;

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
  limit: number;
  remaining: number;
  resetAt: number;
}

export function rateLimit(key: string, scope: RateLimitScope = "api"): RateLimitResult {
  const { limit, windowMs } = DEFAULT_LIMITS[scope];
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    // Nuevo bucket o bucket expirado
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt, blocked: false });
    return {
      ok: true,
      retryAfterSec: 0,
      limit,
      remaining: limit - 1,
      resetAt,
    };
  }

  // Bucket existente
  if (bucket.blocked) {
    // Ya está bloqueado
    return {
      ok: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
      limit,
      remaining: 0,
      resetAt: bucket.resetAt,
    };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    bucket.blocked = true;
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
    return {
      ok: false,
      retryAfterSec,
      limit,
      remaining: 0,
      resetAt: bucket.resetAt,
    };
  }

  return {
    ok: true,
    retryAfterSec: 0,
    limit,
    remaining: limit - bucket.count,
    resetAt: bucket.resetAt,
  };
}

export function clientKey(req: Request, scope: string = "api"): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const ip = fwd.split(",")[0]?.trim() ?? "127.0.0.1";
  const ua = req.headers.get("user-agent") ?? "unknown";
  // Hash simple para evitar keys muy largas
  const uaHash = simpleHash(ua.slice(0, 50));
  return `${scope}:${ip}:${uaHash}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Limpieza periódica de buckets expirados (cada 5 min)
let cleanupInterval: NodeJS.Timeout | null = null;

export function startCleanupInterval(intervalMs = 300_000): void {
  if (cleanupInterval) clearInterval(cleanupInterval);
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }, intervalMs);
}

// Detener limpieza (para tests)
export function stopCleanupInterval(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// Helper para crear response de rate limit
export function createRateLimitResponse(retryAfterSec: number): Response {
  return new Response(
    JSON.stringify({
      error: "Too Many Requests",
      message: `Rate limit exceeded. Try again in ${retryAfterSec} seconds.`,
      retryAfter: retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfterSec.toString(),
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}
