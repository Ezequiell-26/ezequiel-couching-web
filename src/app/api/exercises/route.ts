import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/exercises - Busca ejercicios de la ExerciseDB API
 * Proxy para evitar CORS y rate limiting
 */
const EXERCISE_DB_BASE = "https://exercisedb.p.rapidapi.com";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = "exercisedb.p.rapidapi.com";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const targetMuscle = searchParams.get("muscle") || "";
    const equipment = searchParams.get("equipment") || "";
    const limit = searchParams.get("limit") || "20";

    // Construir URL de ExerciseDB
    let url = `${EXERCISE_DB_BASE}/exercises?limit=${limit}`;
    
    if (query) {
      url += `&name=${encodeURIComponent(query)}`;
    }
    if (targetMuscle) {
      url += `&targetMuscle=${encodeURIComponent(targetMuscle)}`;
    }
    if (equipment) {
      url += `&equipment=${encodeURIComponent(equipment)}`;
    }

    const headers: HeadersInit = {
      "x-rapidapi-key": RAPIDAPI_KEY || "",
      "x-rapidapi-host": RAPIDAPI_HOST || "",
    };

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      // Si no hay API key o falla, retornar ejercicios locales
      return NextResponse.json({ 
        source: "local",
        exercises: [],
        message: "ExerciseDB no disponible, usando datos locales"
      });
    }

    const exercises = await response.json();
    return NextResponse.json({ source: "exercisedb", exercises });
  } catch (error) {
    console.error("Error fetching exercises:", error);
    // Fallback a ejercicios locales
    return NextResponse.json({ 
      source: "local",
      exercises: [],
      message: "Error al cargar ejercicios externos"
    }, { status: 500 });
  }
}
