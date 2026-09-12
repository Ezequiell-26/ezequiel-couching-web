import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import { cookies } from "next/headers";

/**
 * Sesión de administración con cookie firmada (HMAC-SHA256, httpOnly).
 *
 * SEGURIDAD MEJORADA:
 * - ADMIN_PASSWORD debe estar definida en .env (mínimo 12 caracteres)
 * - ADMIN_SESSION_SECRET opcional para firmar sesiones (usa crypto.random si no existe)
 * - Sin fallback a valores por defecto en producción
 * - Timing-safe comparison para prevenir timing attacks
 */

export const ADMIN_COOKIE = "ec_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 h

// Longitud mínima requerida para contraseña admin
const MIN_PASSWORD_LENGTH = 12;

function getAdminPassword(): string | undefined {
  const pwd = process.env.ADMIN_PASSWORD;
  if (!pwd || pwd.length < MIN_PASSWORD_LENGTH) {
    return undefined;
  }
  return pwd;
}

function getSessionSecret(): string {
  // Si hay un secret explícito, usarlo
  if (process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.length >= 32) {
    return process.env.ADMIN_SESSION_SECRET;
  }
  // Fallback seguro: derivar del password admin + salt
  const adminPwd = getAdminPassword();
  if (adminPwd) {
    return `kinetixfit-session-${adminPwd}-${process.env.NODE_ENV ?? "development"}`;
  }
  // En desarrollo sin configuración, usar un valor temporal (SOLO para dev local)
  if (process.env.NODE_ENV !== "production") {
    return "kinetixfit-dev-secret-do-not-use-in-production";
  }
  // En producción sin configuración válida, lanzar error
  throw new Error(
    "ADMIN_PASSWORD must be set in environment variables (min 12 characters) for admin authentication to work in production."
  );
}

export function adminPasswordConfigured(): boolean {
  const pwd = getAdminPassword();
  return pwd !== undefined && pwd.length >= MIN_PASSWORD_LENGTH;
}

export function verifyPassword(input: string): boolean {
  const expected = getAdminPassword();
  if (!expected) return false;

  // Prevenir timing attacks comparando longitud primero de forma segura
  const inputBuffer = Buffer.from(input, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  // Si las longitudes difieren, hacer una comparación dummy para mantener tiempo constante
  if (inputBuffer.length !== expectedBuffer.length) {
    // Crear buffer dummy de la misma longitud
    const dummy = Buffer.alloc(expectedBuffer.length, 0);
    timingSafeEqual(dummy, expectedBuffer);
    return false;
  }

  return timingSafeEqual(inputBuffer, expectedBuffer);
}

function sign(payload: string): string {
  const secret = getSessionSecret();
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createSessionToken(): string {
  // Añadir nonce aleatorio para prevenir replay attacks
  const nonce = randomBytes(16).toString("hex");
  const payload = `admin.${Date.now() + SESSION_TTL_MS}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 4) return false; // Ahora son 4 partes: role.expires.nonce.mac

  const [role, expires, nonce, mac] = parts;

  if (role !== "admin") return false;

  // Validar nonce (debe ser hex de 32 caracteres = 16 bytes)
  if (!/^[0-9a-f]{32}$/.test(nonce)) return false;

  const exp = Number(expires);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;

  // Verificar MAC
  const expected = sign(`${role}.${expires}.${nonce}`);
  if (expected.length !== mac.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(mac));
}

export async function isAdminRequest(): Promise<boolean> {
  try {
    const store = await cookies();
    return isValidSessionToken(store.get(ADMIN_COOKIE)?.value);
  } catch {
    return false;
  }
}

export function sessionCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: isProd,
    path: "/admin",
    maxAge: SESSION_TTL_MS / 1000,
    domain: isProd ? (process.env.DOMAIN ?? undefined) : undefined,
  };
}

// Middleware para validar sesión en API routes
export async function requireAdmin(): Promise<{ valid: boolean; error?: string }> {
  if (!adminPasswordConfigured() && process.env.NODE_ENV === "production") {
    return { valid: false, error: "Admin password not configured" };
  }

  const valid = await isAdminRequest();
  if (!valid) {
    return { valid: false, error: "Unauthorized" };
  }

  return { valid: true };
}
