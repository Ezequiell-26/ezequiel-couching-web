/**
 * API de Rutinas Personalizadas con IA
 * Genera rutinas basadas en perfil, objetivos y equipamiento disponible
 */

import { NextRequest, NextResponse } from 'next/server';

const EXERCISE_DB_API = 'https://exercisedb.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';

// Tipos de ejercicios por categoría
const exerciseCategories = {
  strength: ['chest', 'back', 'shoulders', 'arms', 'legs', 'core'],
  cardio: ['cardio', 'plyometrics'],
  flexibility: ['stretching', 'mobility'],
  functional: ['functional', 'bodyweight']
};

// Plantillas de rutinas por objetivo
const routineTemplates = {
  weight_loss: {
    duration: 45,
    sets: 3,
    reps: '15-20',
    rest: 45,
    focus: ['cardio', 'functional', 'strength']
  },
  muscle_gain: {
    duration: 60,
    sets: 4,
    reps: '8-12',
    rest: 90,
    focus: ['strength']
  },
  endurance: {
    duration: 50,
    sets: 3,
    reps: '20-25',
    rest: 30,
    focus: ['cardio', 'functional']
  },
  flexibility: {
    duration: 40,
    sets: 2,
    reps: 'hold 30s',
    rest: 20,
    focus: ['flexibility']
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      goal, 
      level, 
      equipment, 
      availableTime, 
      targetMuscles,
      injuries,
      preferences 
    } = body;

    // Validar datos básicos
    if (!goal || !level) {
      return NextResponse.json(
        { error: 'Objetivo y nivel son requeridos' },
        { status: 400 }
      );
    }

    // Generar rutina basada en el template
    const template = routineTemplates[goal as keyof typeof routineTemplates] || routineTemplates.weight_loss;
    
    // Filtrar ejercicios según equipamiento
    let exercises = await fetchExercises({
      targetMuscles: targetMuscles || template.focus,
      equipment: equipment || 'body weight',
      difficulty: level
    });

    // Si no hay API key, usar ejercicios mock
    if (!RAPIDAPI_KEY || exercises.length === 0) {
      exercises = getMockExercises(template.focus, equipment);
    }

    // Crear rutina estructurada
    const routine = buildRoutine({
      exercises,
      template,
      level,
      availableTime: availableTime || template.duration,
      injuries,
      preferences
    });

    return NextResponse.json({
      success: true,
      routine,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating routine:', error);
    return NextResponse.json(
      { error: 'Error generando rutina', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function fetchExercises(params: {
  targetMuscles: string[];
  equipment: string;
  difficulty: string;
}) {
  if (!RAPIDAPI_KEY) return [];

  try {
    const promises = params.targetMuscles.map(async (muscle) => {
      const url = `${EXERCISE_DB_API}/exercises/target/${muscle}`;
      const response = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
        }
      });
      
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    });

    const results = await Promise.all(promises);
    let exercises = results.flat();

    // Filtrar por equipamiento
    if (params.equipment && params.equipment !== 'all') {
      exercises = exercises.filter((ex: any) => 
        ex.equipment?.toLowerCase().includes(params.equipment.toLowerCase())
      );
    }

    // Limitar a 20 ejercicios
    return exercises.slice(0, 20);
  } catch (error) {
    console.error('Error fetching exercises:', error);
    return [];
  }
}

function getMockExercises(focus: string[], equipment?: string): any[] {
  const mockExercises: Record<string, any[]> = {
    chest: [
      { id: '1', name: 'Push-ups', target: 'pectorals', equipment: 'body weight', gifUrl: '/exercises/pushup.gif' },
      { id: '2', name: 'Diamond Push-ups', target: 'pectorals', equipment: 'body weight', gifUrl: '/exercises/diamond-pushup.gif' },
      { id: '3', name: 'Wide Push-ups', target: 'pectorals', equipment: 'body weight', gifUrl: '/exercises/wide-pushup.gif' }
    ],
    back: [
      { id: '4', name: 'Pull-ups', target: 'lats', equipment: 'body weight', gifUrl: '/exercises/pullup.gif' },
      { id: '5', name: 'Inverted Rows', target: 'upper back', equipment: 'body weight', gifUrl: '/exercises/row.gif' },
      { id: '6', name: 'Superman', target: 'lower back', equipment: 'body weight', gifUrl: '/exercises/superman.gif' }
    ],
    legs: [
      { id: '7', name: 'Squats', target: 'quads', equipment: 'body weight', gifUrl: '/exercises/squat.gif' },
      { id: '8', name: 'Lunges', target: 'glutes', equipment: 'body weight', gifUrl: '/exercises/lunge.gif' },
      { id: '9', name: 'Calf Raises', target: 'calves', equipment: 'body weight', gifUrl: '/exercises/calf-raise.gif' }
    ],
    core: [
      { id: '10', name: 'Plank', target: 'abs', equipment: 'body weight', gifUrl: '/exercises/plank.gif' },
      { id: '11', name: 'Mountain Climbers', target: 'abs', equipment: 'body weight', gifUrl: '/exercises/mountain-climber.gif' },
      { id: '12', name: 'Russian Twist', target: 'obliques', equipment: 'body weight', gifUrl: '/exercises/russian-twist.gif' }
    ],
    cardio: [
      { id: '13', name: 'Jumping Jacks', target: 'cardiovascular', equipment: 'body weight', gifUrl: '/exercises/jumping-jack.gif' },
      { id: '14', name: 'Burpees', target: 'full body', equipment: 'body weight', gifUrl: '/exercises/burpee.gif' },
      { id: '15', name: 'High Knees', target: 'cardiovascular', equipment: 'body weight', gifUrl: '/exercises/high-knees.gif' }
    ],
    shoulders: [
      { id: '16', name: 'Pike Push-ups', target: 'delts', equipment: 'body weight', gifUrl: '/exercises/pike-pushup.gif' },
      { id: '17', name: 'Arm Circles', target: 'delts', equipment: 'body weight', gifUrl: '/exercises/arm-circle.gif' }
    ]
  };

  let result: any[] = [];
  focus.forEach(f => {
    if (mockExercises[f]) {
      result = result.concat(mockExercises[f]);
    }
  });

  // Si no hay focus específico, devolver todos
  if (result.length === 0) {
    result = Object.values(mockExercises).flat();
  }

  return result.slice(0, 15);
}

function buildRoutine(params: {
  exercises: any[];
  template: any;
  level: string;
  availableTime: number;
  injuries?: string[];
  preferences?: string[];
}) {
  const { exercises, template, level, availableTime, injuries, preferences } = params;

  // Excluir ejercicios si hay lesiones
  let filteredExercises = exercises;
  if (injuries && injuries.length > 0) {
    const injuryMap: Record<string, string[]> = {
      'knee': ['squats', 'lunges', 'jumping'],
      'shoulder': ['push-ups', 'pull-ups', 'overhead'],
      'back': ['deadlift', 'bent over', 'superman'],
      'wrist': ['plank', 'push-ups']
    };

    injuries.forEach(injury => {
      const keywords = injuryMap[injury.toLowerCase()] || [];
      filteredExercises = filteredExercises.filter(ex => 
        !keywords.some(keyword => ex.name.toLowerCase().includes(keyword))
      );
    });
  }

  // Seleccionar ejercicios para la rutina
  const warmup = filteredExercises.slice(0, 2).map(ex => ({
    ...ex,
    type: 'warmup',
    sets: 1,
    reps: '10 reps or 30s',
    rest: 30
  }));

  const mainExercises = filteredExercises.slice(2, 8).map(ex => ({
    ...ex,
    type: 'main',
    sets: template.sets,
    reps: template.reps,
    rest: template.rest
  }));

  const cooldown = filteredExercises.slice(8, 10).map(ex => ({
    ...ex,
    type: 'cooldown',
    sets: 1,
    reps: 'hold 30s',
    rest: 20
  }));

  return {
    name: `Rutina ${level.charAt(0).toUpperCase() + level.slice(1)} - ${goalToName(template.focus[0])}`,
    duration: availableTime,
    level,
    exercises: [...warmup, ...mainExercises, ...cooldown],
    structure: {
      warmup: warmup.length,
      main: mainExercises.length,
      cooldown: cooldown.length
    },
    tips: generateTips(template.focus, level, injuries)
  };
}

function goalToName(goal: string): string {
  const names: Record<string, string> = {
    weight_loss: 'Quema de Grasa',
    muscle_gain: 'Ganancia Muscular',
    endurance: 'Resistencia',
    flexibility: 'Flexibilidad',
    cardio: 'Cardio',
    strength: 'Fuerza',
    functional: 'Funcional'
  };
  return names[goal] || 'General';
}

function generateTips(focus: string[], level: string, injuries?: string[]): string[] {
  const tips: string[] = [];

  if (level === 'beginner') {
    tips.push('Comienza con menos repeticiones y aumenta gradualmente.');
    tips.push('Descansa lo necesario entre series.');
  } else if (level === 'advanced') {
    tips.push('Aumenta la intensidad reduciendo el tiempo de descanso.');
    tips.push('Considera añadir peso o resistencia adicional.');
  }

  if (focus.includes('cardio')) {
    tips.push('Mantén una frecuencia cardíaca elevada durante los ejercicios principales.');
  }

  if (focus.includes('strength')) {
    tips.push('Concéntrate en la técnica antes de aumentar el peso.');
    tips.push('Controla el movimiento en la fase excéntrica.');
  }

  if (injuries && injuries.length > 0) {
    tips.push('Si sientes dolor, detén el ejercicio inmediatamente.');
    tips.push('Consulta con un profesional antes de continuar.');
  }

  tips.push('Mantente hidratado durante todo el entrenamiento.');
  tips.push('Realiza un calentamiento adecuado antes de comenzar.');

  return tips;
}

export async function GET() {
  return NextResponse.json({
    message: 'AI Routine Generator API',
    endpoints: {
      POST: 'Generate custom routine based on user profile',
      categories: Object.keys(exerciseCategories),
      goals: Object.keys(routineTemplates)
    }
  });
}
