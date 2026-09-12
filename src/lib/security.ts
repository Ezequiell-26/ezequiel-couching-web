import { z } from "zod";

/**
 * Sanitiza input de usuario para prevenir XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Valida email
 */
export const emailSchema = z.string().email("Email inválido");

/**
 * Valida password seguro
 */
export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[A-Z]/, "Debe incluir mayúscula")
  .regex(/[a-z]/, "Debe incluir minúscula")
  .regex(/[0-9]/, "Debe incluir número");

/**
 * Valida teléfono español
 */
export const phoneSchema = z.string().regex(/^(\+34|0034|34)?[6789]\d{8}$/, "Teléfono inválido");

/**
 * Previene SQL injection escapando caracteres especiales
 */
export function escapeSql(value: string): string {
  return value.replace(/['"\\;]/g, (match) => `\\${match}`);
}

/**
 * Genera token CSRF seguro
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Valida token CSRF
 */
export function validateCSRFToken(token: string): boolean {
  return /^[0-9a-f]{64}$/.test(token);
}

/**
 * Headers de seguridad para respuestas
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
  };
}

/**
 * Rate limiting key por IP + user agent
 */
export function getRateLimitKey(ip: string, userAgent?: string | null): string {
  const ua = userAgent ? userAgent.slice(0, 50) : "unknown";
  return `${ip}:${ua}`;
}
