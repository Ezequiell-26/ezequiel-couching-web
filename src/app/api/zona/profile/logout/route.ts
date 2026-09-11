import { NextResponse } from "next/server";
import { ZONA_COOKIE, destroyClientSession, getZonaProfile, zonaCookieOptions } from "@/lib/zona-auth";

export const dynamic = "force-dynamic";

/** POST /api/zona/profile/logout — revoca el token en BD y borra la cookie. */
export async function POST() {
  try {
    const profile = await getZonaProfile();
    if (profile) {
      await destroyClientSession(profile.id);
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ZONA_COOKIE, "", { ...zonaCookieOptions(), maxAge: 0 });
    return res;
  } catch (error) {
    console.error("[api/zona/profile/logout]", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
