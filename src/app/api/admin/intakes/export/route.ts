import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Escapa una celda CSV (comillas dobles y saltos de línea). */
function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * GET /api/admin/intakes/export — descarga CSV con todos los cuestionarios
 * (ordenados de más reciente a más antiguo).
 */
export async function GET() {
  const authed = await isAdminRequest();
  if (!authed) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });

  try {
    const intakes = await db.intake.findMany({ orderBy: { createdAt: "desc" } });

    const header = [
      "id",
      "fecha",
      "nombre",
      "email",
      "edad",
      "altura_cm",
      "peso_kg",
      "objetivo",
      "experiencia",
      "lesiones",
      "mensaje",
      "estado",
    ];

    const rows = intakes.map((i) =>
      [
        i.id,
        i.createdAt.toISOString(),
        i.name,
        i.email,
        i.age,
        i.heightCm,
        i.weightKg,
        i.goal,
        i.experience,
        i.injuries,
        i.message,
        i.status,
      ]
        .map(csvCell)
        .join(","),
    );

    // BOM inicial para que Excel respete acentos y eñes.
    const csv = "\uFEFF" + [header.map(csvCell).join(","), ...rows].join("\r\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="intakes.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[api/admin/intakes/export]", error);
    return NextResponse.json({ ok: false, error: "Error interno." }, { status: 500 });
  }
}
