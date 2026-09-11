/**
 * Semilla de catálogo — CONTENIDO DE EJEMPLO EDITABLE/BORRABLE desde el panel
 * de administración. NO son datos reales del negocio: sirven para que la
 * tienda, los planes y el blog funcionen desde el primer día y para verificar
 * los flujos. Sin pedidos, sin usuarios, sin mensajes inventados.
 * Ejecutar: bun run db:seed
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const products = [
    {
      slug: "guia-fundamentos",
      title: "Guía de fundamentos de entrenamiento",
      description:
        "PDF de inicio: estructura semanal, selección de ejercicios y progresión básica para empezar con orden.",
      category: "guía",
      priceCents: 0,
    },
    {
      slug: "plan-fuerza-8-semanas",
      title: "Plan de fuerza 8 semanas",
      description:
        "Programa de 8 semanas centrado en patrones básicos de fuerza con progresión de cargas y registro de series.",
      category: "programa",
      priceCents: 2900,
    },
    {
      slug: "plan-casa-6-semanas",
      title: "Plan en casa 6 semanas",
      description:
        "Seis semanas con material mínimo: bandas y peso corporal, tres sesiones semanales de 40 minutos.",
      category: "programa",
      priceCents: 1900,
    },
  ];

  const plans = [
    {
      slug: "iniciacion-8",
      title: "Iniciación 8 semanas",
      level: "iniciacion",
      weeks: 8,
      summary:
        "Para empezar desde cero: técnica, hábito y base aeróbica. Tres sesiones semanales progresivas.",
      priceCents: 3900,
    },
    {
      slug: "hipertrofia-12",
      title: "Hipertrofia 12 semanas",
      level: "intermedio",
      weeks: 12,
      summary:
        "Volumen estructurado por bloques con deload incluido. Para quien ya entrena con consistencia.",
      priceCents: 5900,
    },
  ];

  const posts = [
    {
      slug: "como-empezar-a-entrenar",
      title: "Cómo empezar a entrenar (y no abandonar en 3 semanas)",
      excerpt:
        "El problema no es el plan: es el tamaño del primer paso. Cómo diseñar semanas que puedas sostener.",
      body:
        "Empezar a entrenar suele fallar por exceso de entusiasmo y falta de estructura.\n\nEn esta guía verás: cómo definir tu punto de partida real, cómo elegir el volumen de tus primeras semanas y cómo registrar el progreso sin obsesionarte con la báscula.\n\nLa regla básica: elige el plan que puedas cumplir incluso en tu peor semana.",
      category: "entrenamiento",
    },
    {
      slug: "proteina-cuanto-necesitas",
      title: "¿Cuánta proteína necesitas realmente?",
      excerpt:
        "Rangos prácticos según objetivo y peso corporal, con ejemplos de día completo.",
      body:
        "La proteína es el macronutriente con mayor evidencia para preservar y construir masa muscular.\n\nRango práctico: 1,6–2,2 g/kg para la mayoría de personas que entrenan fuerza. La calculadora de macros de esta web aplica exactamente estos rangos.\n\nLo importante no es el suplemento: es la distribución a lo largo del día.",
      category: "nutrición",
    },
  ];

  for (const p of products) {
    await db.product.upsert({ where: { slug: p.slug }, update: {}, create: p });
  }
  for (const pl of plans) {
    await db.plan.upsert({ where: { slug: pl.slug }, update: {}, create: pl });
  }
  for (const po of posts) {
    await db.post.upsert({ where: { slug: po.slug }, update: {}, create: po });
  }

  console.log("✔ Semilla de catálogo aplicada (contenido de ejemplo editable).");
  console.log("  Datos NO creados: pedidos, leads, mensajes, intakes (empiezan vacíos).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
