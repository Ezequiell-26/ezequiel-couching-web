import type { NextConfig } from "next";

/**
 * Configuración de seguridad optimizada para Next.js
 * Incluye headers de seguridad, optimización de imágenes y configuración de producción
 */

const securityHeaders = [
  // Prevenir MIME type sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Prevenir clickjacking
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // Habilitar XSS filter en navegadores antiguos
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  // Controlar información de referrer
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Restringir permisos del navegador
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
  },
  // Content Security Policy - restringir fuentes de contenido
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://vercel.live https://analytics.vercel.com https://*.z-ai.space",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  // Prevenir leaks de DNS
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  // Controlar caché para páginas sensibles
  {
    key: "Cache-Control",
    value: "public, max-age=0, must-revalidate",
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "preview-chat-c4052c27-31cc-4687-9443-1fc885b02864.space-z.ai",
    "localhost:3000",
  ],

  // Optimización de imágenes
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    contentDispositionType: "attachment",
  },

  // Headers de seguridad para todas las rutas
  async headers() {
    return [
      {
        // Aplicar a todas las rutas
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Headers específicos para API routes
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.ALLOWED_ORIGINS ?? "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-CSRF-Token",
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400",
          },
        ],
      },
      {
        // Sin caché para rutas admin
        source: "/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, must-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "-1",
          },
        ],
      },
    ];
  },

  // Redirecciones de seguridad
  async redirects() {
    return [
      // Forzar HTTPS en producción
      {
        source: "/:path*",
        has: [{ type: "header" as const, key: "x-forwarded-proto", value: "http" }],
        destination: "https://:host/:path*",
        permanent: true,
      },
    ];
  },

  // Configurar rewrites si es necesario
  async rewrites() {
    return [];
  },

  // Eliminar x-powered-by header
  poweredByHeader: false,

  // Compilación optimizada
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
