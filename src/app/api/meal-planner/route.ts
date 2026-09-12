import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyClientSession } from "@/lib/zona-auth";

/**
 * GET /api/meal-planner - Obtiene planes de comidas del perfil
 * POST /api/meal-planner - Crea nuevo plan de comidas
 */
export async function GET(req: NextRequest) {
  try {
    const session = await verifyClientSession(req);
    if (!session?.profileId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const plans = await db.mealPlan.findMany({
      where: { profileId: session.profileId },
      include: {
        meals: {
          orderBy: { orderIdx: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("Error fetching meal plans:", error);
    return NextResponse.json({ error: "Error al cargar planes de comidas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyClientSession(req);
    if (!session?.profileId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { name, calories, protein, carbs, fats, meals } = body;

    const plan = await db.mealPlan.create({
      data: {
        profileId: session.profileId,
        name,
        calories: calories ? parseInt(calories) : null,
        protein: protein ? parseInt(protein) : null,
        carbs: carbs ? parseInt(carbs) : null,
        fats: fats ? parseInt(fats) : null,
        meals: meals
          ? {
              create: meals.map((meal: any, idx: number) => ({
                name: meal.name,
                type: meal.type, // desayuno | almuerzo | cena | snack
                calories: meal.calories ? parseInt(meal.calories) : null,
                protein: meal.protein ? parseInt(meal.protein) : null,
                carbs: meal.carbs ? parseInt(meal.carbs) : null,
                fats: meal.fats ? parseInt(meal.fats) : null,
                recipe: meal.recipe || null,
                ingredients: meal.ingredients || null,
                orderIdx: idx,
              })),
            }
          : undefined,
      },
      include: {
        meals: true,
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Error creating meal plan:", error);
    return NextResponse.json({ error: "Error al crear plan de comidas" }, { status: 500 });
  }
}
