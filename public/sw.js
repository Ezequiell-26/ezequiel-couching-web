/**
 * Service worker offline — EZEQUIEL COACHING (PWA) · versión ec-offline-v1
 *
 * Estrategia de cacheo:
 * - La app es una SPA por hash (#/...): con "/" precacheada, todo el shell
 *   queda disponible offline y cualquier navegación #/... funciona sin red.
 * - Navegaciones (request.mode === "navigate"): network-first → contenido
 *   fresco cuando hay red; fallback al shell cacheado; si no hay nada,
 *   respuesta mínima "Sin conexión".
 * - /_next/static/, /brand/, /images/: cache-first (assets estáticos).
 * - /api/*: NUNCA se intercepta (passthrough directo, sin cachear APIs
 *   dinámicas ni respuestas autenticadas).
 * - Resto de GET same-origin: passthrough sin cachear.
 *
 * Actualización de versión: SIN skipWaiting en install (actualización natural:
 * el SW nuevo espera a que no queden pestañas controladas por la versión
 * anterior, evitando mezclar versiones del shell en sesiones en curso).
 * En activate se hace clients.claim() para controlar pestañas ya abiertas
 * una vez activado, junto con la limpieza de caches viejas.
 *
 * Solo se cachean respuestas same-origin de tipo "basic" con status 200
 * (nunca respuestas opacas ni errores).
 */

const VERSION = "ec-offline-v1";
const PRECACHE_URLS = ["/"];

const OFFLINE_HTML = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sin conexión — Ezequiel Coaching</title>
    <style>
      body {
        font-family: system-ui, sans-serif;
        background: #0b0b0e;
        color: #e5e7eb;
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        text-align: center;
        padding: 1rem;
      }
      main { max-width: 24rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #9ca3af; margin: 0; }
    </style>
  </head>
  <body>
    <main>
      <h1>Sin conexión</h1>
      <p>Revisá tu conexión e intentá de nuevo.</p>
    </main>
  </body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      // addAll falla en bloque si algún pedido falla: el catch evita que un
      // "/" no disponible rompa el install (actualización natural, sin
      // skipWaiting: el SW nuevo espera su turno).
      await cache.addAll(PRECACHE_URLS).catch(() => {});
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== VERSION)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 1) Solo GET.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Solo same-origin (cross-origin: passthrough).
  if (url.origin !== self.location.origin) return;

  // 2) APIs: jamás se interceptan (sin cacheo ni fallback offline).
  if (url.pathname.startsWith("/api/")) return;

  // 3) Navegaciones: network-first con fallback offline.
  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  // 4) Assets estáticos: cache-first.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/images/")
  ) {
    event.respondWith(handleStaticAsset(request));
  }

  // 5) Resto de GET same-origin: passthrough sin cachear (sin respondWith).
});

/** Solo cachea respuestas same-origin "basic" con status 200 (nunca opacas). */
function isCacheable(response) {
  return Boolean(response) && response.type === "basic" && response.status === 200;
}

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      const cache = await caches.open(VERSION);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Sin red: shell cacheado ("/" sirve toda la SPA por hash).
    const cache = await caches.open(VERSION);
    const cached = (await cache.match("/", { ignoreVary: true })) || (await cache.match(request, { ignoreVary: true }));
    if (cached) return cached;
    return new Response(OFFLINE_HTML, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

async function handleStaticAsset(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (isCacheable(response)) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Sin caché y sin red: 504 mínimo (sin cuerpo cacheable).
    return new Response("", { status: 504, statusText: "Sin conexión" });
  }
}
