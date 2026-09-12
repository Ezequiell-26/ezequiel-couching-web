import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { ClientProfile } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Sesión de cliente de la Zona de entrenamiento.
 *
 * A diferencia del admin (token HMAC stateless), aquí el token es aleatorio y
 * se persiste en BD (ClientProfile.sessionToken): permite invalidar la sesión
 * anterior al iniciar sesión de nuevo y revocarla al cerrar sesión.
 * El PIN nunca se guarda en claro (scrypt con salt aleatorio) ni se devuelve
 * ni se loguea en ninguna respuesta.
 */

export const ZONA_COOKIE = "ec_zona_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

/** Hashea un PIN con scrypt: "salt:hash" (salt hex de 16 bytes, clave de 64 bytes). */
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Verifica un PIN contra el hash almacenado. Formato inválido → false. */
export function verifyPin(pin: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const [salt, hash] = parts;
  try {
    const derived = scryptSync(pin, salt, 64);
    const expected = Buffer.from(hash, "hex");
    if (expected.length !== derived.length) return false;
    return timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

/** Crea una sesión de cliente: token aleatorio persistido (invalida el anterior). */
export async function createClientSession(profileId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + SESSION_TTL_MS);
  await db.clientProfile.update({
    where: { id: profileId },
    data: { sessionToken: token, sessionExpiry: expiry },
  });
  return token;
}

/** Destruye la sesión del cliente (token y expiración a null). */
export async function destroyClientSession(profileId: number): Promise<void> {
  await db.clientProfile
    .update({
      where: { id: profileId },
      data: { sessionToken: null, sessionExpiry: null },
    })
    .catch(() => {
      // El perfil pudo desaparecer: nada que revocar.
    });
}

/** Perfil autenticado por cookie de sesión, o null si no hay sesión válida. */
export async function getZonaProfile(): Promise<ClientProfile | null> {
  const store = await cookies();
  const token = store.get(ZONA_COOKIE)?.value;
  if (!token) return null;
  const profile = await db.clientProfile.findUnique({ where: { sessionToken: token } });
  if (!profile) return null;
  if (!profile.sessionExpiry || profile.sessionExpiry.getTime() <= Date.now()) return null;
  return profile;
}

/** Verifica y devuelve la sesión del cliente (alias para consistencia con admin-auth). */
export async function verifyClientSession(): Promise<ClientProfile | null> {
  return getZonaProfile();
}

/** Igual que getZonaProfile: la route decide la respuesta 401. */
export async function requireZonaProfile(): Promise<ClientProfile | null> {
  return getZonaProfile();
}

/** Respuesta estándar 401 para rutas de zona (mismo texto en todas). */
export function zonaUnauthorized(): NextResponse {
  return NextResponse.json({ error: "Iniciá sesión para continuar." }, { status: 401 });
}

/** Espejo de sessionCookieOptions del admin, con TTL de 30 días. */
export function zonaCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

/** Datos públicos del perfil: jamás exponer pinHash, sessionToken ni sessionExpiry. */
export function publicProfile(profile: ClientProfile): { id: number; name: string } {
  return { id: profile.id, name: profile.name };
}
