import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * Sesión de administración con cookie firmada (HMAC-SHA256, httpOnly).
 *
 * CONFIGURACIÓN: definir ADMIN_PASSWORD en .env. Si no está definida, el login
 * está DESHABILITADO (no hay contraseña por defecto: nunca se fabrica acceso).
 */

export const ADMIN_COOKIE = "ec_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 h

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "ec-dev-secret";
}

export function adminPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length >= 8);
}

export function verifyPassword(input: string): boolean {
  if (!adminPasswordConfigured()) return false;
  const expected = Buffer.from(process.env.ADMIN_PASSWORD as string);
  const given = Buffer.from(input);
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createSessionToken(): string {
  const payload = `admin.${Date.now() + SESSION_TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, expires, mac] = parts;
  if (role !== "admin") return false;
  const exp = Number(expires);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = sign(`${role}.${expires}`);
  if (expected.length !== mac.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(mac));
}

export async function isAdminRequest(): Promise<boolean> {
  const store = await cookies();
  return isValidSessionToken(store.get(ADMIN_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}
