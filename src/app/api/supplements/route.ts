/**
 * API de Suplementos y Nutrición Avanzada
 * Proporciona información sobre suplementos, dosis y timing
 */

import { NextRequest, NextResponse } from 'next/server';

const NINJASCIPI_API = 'https://ninjasciapi.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';

// Base de datos de suplementos
const supplementsDB = [
  {
    id: '1',
    name: 'Proteína Whey',
    category: 'protein',
    benefits: ['Construcción muscular', 'Recuperación', 'Saciedad'],
    dosage: '20-30g post-entreno',
    timing: 'Post-workout o entre comidas',
    sideEffects: ['Malestar digestivo en intolerantes a lactosa'],
    scientificEvidence: 'high',
    priceRange: '$$'
  },
  {
    id: '2',
    name: 'Creatina Monohidrato',
    category: 'performance',
    benefits: ['Fuerza', 'Potencia', 'Volumen muscular'],
    dosage: '5g diarios',
    timing: 'Cualquier momento del día',
    sideEffects: ['Retención de agua intramuscular'],
    scientificEvidence: 'very high',
    priceRange: '$'
  },
  {
    id: '3',
    name: 'Cafeína',
    category: 'stimulant',
    benefits: ['Energía', 'Enfoque', 'Rendimiento'],
    dosage: '100-300mg',
    timing: '30 min pre-entreno',
    sideEffects: ['Insomnio', 'Ansiedad', 'Taquicardia'],
    scientificEvidence: 'high',
    priceRange: '$'
  },
  {
    id: '4',
    name: 'Beta-Alanina',
    category: 'performance',
    benefits: ['Resistencia muscular', 'Buffer de ácido láctico'],
    dosage: '3-6g diarios',
    timing: 'Dividido en 2-3 tomas',
    sideEffects: ['Parestesia (hormigueo)'],
    scientificEvidence: 'high',
    priceRange: '$$'
  },
  {
    id: '5',
    name: 'Omega-3',
    category: 'health',
    benefits: ['Salud cardiovascular', 'Anti-inflamatorio', 'Cerebro'],
    dosage: '1-3g EPA+DHA',
    timing: 'Con comidas',
    sideEffects: ['Sabor a pescado', 'Malestar digestivo'],
    scientificEvidence: 'high',
    priceRange: '$$'
  },
  {
    id: '6',
    name: 'Vitamina D3',
    category: 'vitamin',
    benefits: ['Salud ósea', 'Sistema inmune', 'Estado de ánimo'],
    dosage: '1000-4000 UI',
    timing: 'Mañana con comida grasa',
    sideEffects: ['Raros en dosis normales'],
    scientificEvidence: 'high',
    priceRange: '$'
  },
  {
    id: '7',
    name: 'Magnesio',
    category: 'mineral',
    benefits: ['Relajación muscular', 'Sueño', 'Recuperación'],
    dosage: '200-400mg',
    timing: 'Antes de dormir',
    sideEffects: ['Diarrhea en dosis altas'],
    scientificEvidence: 'moderate',
    priceRange: '$'
  },
  {
    id: '8',
    name: 'BCAAs',
    category: 'amino acids',
    benefits: ['Recuperación', 'Prevención catabolismo'],
    dosage: '5-10g',
    timing: 'Intra-entreno o entre comidas',
    sideEffects: ['Sabor amargo'],
    scientificEvidence: 'moderate',
    priceRange: '$$'
  },
  {
    id: '9',
    name: 'Citrulina Malato',
    category: 'performance',
    benefits: ['Bombéo muscular', 'Resistencia', 'Flujo sanguíneo'],
    dosage: '6-8g',
    timing: '30-60 min pre-entreno',
    sideEffects: ['Malestar digestivo en dosis altas'],
    scientificEvidence: 'moderate',
    priceRange: '$$'
  },
  {
    id: '10',
    name: 'Ashwagandha',
    category: 'adaptogen',
    benefits: ['Reducción cortisol', 'Estrés', 'Testosterona'],
    dosage: '300-600mg',
    timing: 'Mañana o noche',
    sideEffects: ['Somnolencia', 'Malestar digestivo'],
    scientificEvidence: 'moderate',
    priceRange: '$$'
  }
];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const goal = searchParams.get('goal');

    let results = [...supplementsDB];

    // Filtrar por categoría
    if (category) {
      results = results.filter(s => s.category === category);
    }

    // Búsqueda por nombre
    if (search) {
      results = results.filter(s => 
        s.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Recomendar por objetivo
    if (goal) {
      const goalMapping: Record<string, string[]> = {
        muscle_gain: ['protein', 'performance', 'amino acids'],
        weight_loss: ['protein', 'stimulant', 'health'],
        endurance: ['performance', 'amino acids', 'mineral'],
        health: ['health', 'vitamin', 'mineral', 'adaptogen'],
        recovery: ['protein', 'mineral', 'amino acids']
      };

      const categories = goalMapping[goal] || [];
      if (categories.length > 0) {
        results = results.filter(s => categories.includes(s.category));
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      supplements: results,
      categories: getCategories()
    });

  } catch (error) {
    console.error('Error fetching supplements:', error);
    return NextResponse.json(
      { error: 'Error obteniendo suplementos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, supplementId, userData } = body;

    if (action === 'recommendation') {
      const recommendation = generateRecommendation(userData);
      return NextResponse.json({
        success: true,
        recommendation
      });
    }

    if (action === 'stack') {
      const stack = generateStack(userData);
      return NextResponse.json({
        success: true,
        stack
      });
    }

    return NextResponse.json(
      { error: 'Acción no válida' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error processing supplement request:', error);
    return NextResponse.json(
      { error: 'Error procesando solicitud' },
      { status: 500 }
    );
  }
}

function getCategories() {
  return [
    { id: 'protein', name: 'Proteínas', icon: '💪' },
    { id: 'performance', name: 'Rendimiento', icon: '⚡' },
    { id: 'stimulant', name: 'Estimulantes', icon: '🔥' },
    { id: 'amino acids', name: 'Aminoácidos', icon: '🧬' },
    { id: 'vitamin', name: 'Vitaminas', icon: '💊' },
    { id: 'mineral', name: 'Minerales', icon: '🦴' },
    { id: 'health', name: 'Salud General', icon: '❤️' },
    { id: 'adaptogen', name: 'Adaptógenos', icon: '🌿' }
  ];
}

function generateRecommendation(userData: any) {
  const { goal, experience, budget, dietaryRestrictions } = userData;

  let recommended: any[] = [];
  let priority: any[] = [];

  // Recomendaciones básicas por objetivo
  if (goal === 'muscle_gain') {
    priority = supplementsDB.filter(s => ['protein', 'performance'].includes(s.category));
  } else if (goal === 'weight_loss') {
    priority = supplementsDB.filter(s => ['protein', 'stimulant'].includes(s.category));
  } else if (goal === 'endurance') {
    priority = supplementsDB.filter(s => ['performance', 'amino acids'].includes(s.category));
  } else {
    priority = supplementsDB.filter(s => ['health', 'vitamin', 'mineral'].includes(s.category));
  }

  // Filtrar por presupuesto
  if (budget === 'low') {
    priority = priority.filter(s => s.priceRange === '$');
  } else if (budget === 'medium') {
    priority = priority.filter(s => ['$','$$', '$$$'].includes(s.priceRange));
  }

  // Filtrar por restricciones dietéticas
  if (dietaryRestrictions?.includes('vegan')) {
    priority = priority.filter(s => !s.name.includes('Whey'));
  }

  // Añadir esenciales según experiencia
  if (experience === 'beginner') {
    recommended = priority.slice(0, 3);
    recommended.push({
      note: 'Como principiante, enfócate primero en: alimentación, descanso y consistencia. Los suplementos son complementos, no magia.'
    });
  } else if (experience === 'intermediate') {
    recommended = priority.slice(0, 5);
  } else {
    recommended = priority;
  }

  return {
    supplements: recommended,
    timing: createTimingSchedule(recommended),
    warnings: getWarnings(recommended),
    disclaimer: 'Consulta con un profesional de la salud antes de comenzar cualquier suplementación.'
  };
}

function generateStack(userData: any) {
  const { goal, trainingTime, sleepQuality } = userData;

  const morningStack: any[] = [];
  const preWorkoutStack: any[] = [];
  const postWorkoutStack: any[] = [];
  const eveningStack: any[] = [];

  // Mañana
  morningStack.push({ name: 'Multivitamínico', dosage: '1 cápsula' });
  morningStack.push({ name: 'Omega-3', dosage: '1-2g' });
  morningStack.push({ name: 'Vitamina D3', dosage: '2000 UI' });

  // Pre-entreno
  if (trainingTime !== 'evening') {
    preWorkoutStack.push({ name: 'Cafeína', dosage: '200mg' });
    preWorkoutStack.push({ name: 'Citrulina Malato', dosage: '6g' });
    preWorkoutStack.push({ name: 'Beta-Alanina', dosage: '3g' });
  }

  // Post-entreno
  postWorkoutStack.push({ name: 'Proteína Whey', dosage: '25g' });
  postWorkoutStack.push({ name: 'Creatina', dosage: '5g' });

  // Noche
  if (sleepQuality === 'poor') {
    eveningStack.push({ name: 'Magnesio', dosage: '300mg' });
    eveningStack.push({ name: 'Ashwagandha', dosage: '300mg' });
  }

  return {
    morning: morningStack,
    preWorkout: preWorkoutStack,
    postWorkout: postWorkoutStack,
    evening: eveningStack,
    totalCost: estimateCost([...morningStack, ...preWorkoutStack, ...postWorkoutStack, ...eveningStack])
  };
}

function createTimingSchedule(supplements: any[]) {
  const schedule: Record<string, any[]> = {
    morning: [],
    preWorkout: [],
    postWorkout: [],
    evening: []
  };

  supplements.forEach(supp => {
    if (!supp.note) {
      if (supp.timing.includes('Mañana')) {
        schedule.morning.push(supp);
      } else if (supp.timing.includes('pre-entreno')) {
        schedule.preWorkout.push(supp);
      } else if (supp.timing.includes('Post') || supp.timing.includes('intra')) {
        schedule.postWorkout.push(supp);
      } else if (supp.timing.includes('dormir') || supp.timing.includes('Noche')) {
        schedule.evening.push(supp);
      } else {
        schedule.morning.push(supp); // Default
      }
    }
  });

  return schedule;
}

function getWarnings(supplements: any[]) {
  const warnings: string[] = [];

  const hasStimulant = supplements.some(s => s.category === 'stimulant');
  const hasMultiple = supplements.length > 5;

  if (hasStimulant) {
    warnings.push('⚠️ Evita estimulantes después de las 4 PM para no afectar el sueño.');
  }

  if (hasMultiple) {
    warnings.push('⚠️ No introduzcas todos los suplementos a la vez. Comienza de uno en uno.');
  }

  if (supplements.some(s => s.name === 'Creatina')) {
    warnings.push('💧 Aumenta tu ingesta de agua al tomar creatina.');
  }

  return warnings;
}

function estimateCost(stack: any[]) {
  // Estimación mensual aproximada
  const prices: Record<string, number> = {
    'Multivitamínico': 15,
    'Omega-3': 20,
    'Vitamina D3': 10,
    'Cafeína': 15,
    'Citrulina Malato': 25,
    'Beta-Alanina': 20,
    'Proteína Whey': 50,
    'Creatina': 20,
    'Magnesio': 12,
    'Ashwagandha': 18
  };

  let total = 0;
  stack.forEach(item => {
    total += prices[item.name] || 0;
  });

  return { monthly: total, currency: 'USD' };
}
