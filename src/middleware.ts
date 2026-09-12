import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit, clientKey, createRateLimitResponse } from "@/lib/rate-limit";
import { getSecurityHeaders } from "@/lib/security";

/**
 * Middleware de seguridad para todas las rutas
 * - Aplica rate limiting según el tipo de endpoint
 * - Añade headers de seguridad
 * - Previene ataques de fuerza bruta y DoS
 */

// Rutas que requieren rate limiting estricto
const STRICT_LIMIT_ROUTES = [
  "/api/admin",
  "/api/auth",
  "/api/login",
  "/api/contact",
  "/api/intake",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Solo aplicar a API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Determinar tipo de rate limit según la ruta
  let scope: "auth" | "contact" | "api" = "api";

  if (STRICT_LIMIT_ROUTES.some((route) => pathname.startsWith(route))) {
    scope =
      pathname.includes("admin") || pathname.includes("auth") || pathname.includes("login")
        ? "auth"
        : "contact";
  }

  // Aplicar rate limiting
  const key = clientKey(request, scope);
  const result = rateLimit(key, scope);

  // Construir respuesta con headers de seguridad
  const securityHeaders = new Headers(getSecurityHeaders());

  // Añadir headers de rate limit
  securityHeaders.set("X-RateLimit-Limit", String(result.limit));
  securityHeaders.set("X-RateLimit-Remaining", String(result.remaining));
  securityHeaders.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)));

  if (!result.ok) {
    securityHeaders.set("Retry-After", String(result.retryAfterSec));

    // Log para monitoring (en producción se podría enviar a un servicio externo)
    console.warn(`[rate-limit] Bloqueado: ${key}, retry after ${result.retryAfterSec}s`);

    return createRateLimitResponse(result.retryAfterSec);
  }

  // Continuar con la request si está dentro del límite
  const response = NextResponse.next();

  // Añadir todos los headers de seguridad
  Object.entries(Object.fromEntries(securityHeaders)).forEach(([key, value]) => {
    if (value) response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match todas las rutas API excepto:
     * - assets (imágenes, fuentes, etc.)
     * - _next/static (archivos estáticos de Next.js)
     */
    "/api/:path*",
  ],
};
