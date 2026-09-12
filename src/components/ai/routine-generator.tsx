'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Clock, Target, Shield, Zap, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Exercise {
  id: string;
  name: string;
  target: string;
  equipment: string;
  gifUrl?: string;
  type?: string;
  sets?: string | number;
  reps?: string;
  rest?: number;
}

interface Routine {
  name: string;
  duration: number;
  level: string;
  exercises: Exercise[];
  structure: {
    warmup: number;
    main: number;
    cooldown: number;
  };
  tips: string[];
}

export function AIRoutineGenerator() {
  const [loading, setLoading] = useState(false);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    goal: 'weight_loss',
    level: 'beginner',
    equipment: 'body weight',
    availableTime: 45,
    targetMuscles: [] as string[],
    injuries: [] as string[]
  });

  const goals = [
    { value: 'weight_loss', label: 'Quema de Grasa', icon: '🔥' },
    { value: 'muscle_gain', label: 'Ganancia Muscular', icon: '💪' },
    { value: 'endurance', label: 'Resistencia', icon: '⏱️' },
    { value: 'flexibility', label: 'Flexibilidad', icon: '🧘' }
  ];

  const levels = [
    { value: 'beginner', label: 'Principiante', icon: '🌱' },
    { value: 'intermediate', label: 'Intermedio', icon: '🌿' },
    { value: 'advanced', label: 'Avanzado', icon: '🌳' }
  ];

  const equipment = [
    { value: 'body weight', label: 'Solo peso corporal', icon: '🏃' },
    { value: 'dumbbell', label: 'Mancuernas', icon: '🏋️' },
    { value: 'barbell', label: 'Barra', icon: '🏋️‍♂️' },
    { value: 'cable', label: 'Cables', icon: '🔗' },
    { value: 'all', label: 'Todo disponible', icon: '🎯' }
  ];

  const muscleGroups = [
    { value: 'chest', label: 'Pecho' },
    { value: 'back', label: 'Espalda' },
    { value: 'legs', label: 'Piernas' },
    { value: 'shoulders', label: 'Hombros' },
    { value: 'arms', label: 'Brazos' },
    { value: 'core', label: 'Core' },
    { value: 'cardio', label: 'Cardio' }
  ];

  const injuryOptions = [
    { value: 'knee', label: 'Rodilla' },
    { value: 'shoulder', label: 'Hombro' },
    { value: 'back', label: 'Espalda baja' },
    { value: 'wrist', label: 'Muñeca' }
  ];

  const generateRoutine = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        setRoutine(data.routine);
      }
    } catch (error) {
      console.error('Error generating routine:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMuscle = (muscle: string) => {
    setFormData(prev => ({
      ...prev,
      targetMuscles: prev.targetMuscles.includes(muscle)
        ? prev.targetMuscles.filter(m => m !== muscle)
        : [...prev.targetMuscles, muscle]
    }));
  };

  const toggleInjury = (injury: string) => {
    setFormData(prev => ({
      ...prev,
      injuries: prev.injuries.includes(injury)
        ? prev.injuries.filter(i => i !== injury)
        : [...prev.injuries, injury]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Formulario de generación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Generador de Rutinas con IA
          </CardTitle>
          <CardDescription>
            Crea rutinas personalizadas basadas en tus objetivos y equipamiento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Objetivo */}
          <div>
            <label className="text-sm font-medium mb-3 block">Objetivo Principal</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {goals.map(goal => (
                <button
                  key={goal.value}
                  onClick={() => setFormData({ ...formData, goal: goal.value })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.goal === goal.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-2xl mb-1">{goal.icon}</div>
                  <div className="text-xs font-medium">{goal.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Nivel */}
          <div>
            <label className="text-sm font-medium mb-3 block">Nivel de Experiencia</label>
            <div className="grid grid-cols-3 gap-2">
              {levels.map(level => (
                <button
                  key={level.value}
                  onClick={() => setFormData({ ...formData, level: level.value })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.level === level.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-2xl mb-1">{level.icon}</div>
                  <div className="text-xs font-medium">{level.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Equipamiento */}
          <div>
            <label className="text-sm font-medium mb-3 block">Equipamiento Disponible</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {equipment.map(eq => (
                <button
                  key={eq.value}
                  onClick={() => setFormData({ ...formData, equipment: eq.value })}
                  className={`p-2 rounded-lg border-2 transition-all ${
                    formData.equipment === eq.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-xl mb-1">{eq.icon}</div>
                  <div className="text-xs font-medium">{eq.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tiempo disponible */}
          <div>
            <label className="text-sm font-medium mb-3 block">
              Tiempo Disponible: {formData.availableTime} minutos
            </label>
            <input
              type="range"
              min="15"
              max="90"
              step="5"
              value={formData.availableTime}
              onChange={(e) => setFormData({ ...formData, availableTime: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>15 min</span>
              <span>90 min</span>
            </div>
          </div>

          {/* Grupos musculares */}
          <div>
            <label className="text-sm font-medium mb-3 block">Enfoque Muscular (opcional)</label>
            <div className="flex flex-wrap gap-2">
              {muscleGroups.map(muscle => (
                <Badge
                  key={muscle.value}
                  variant={formData.targetMuscles.includes(muscle.value) ? 'default' : 'outline'}
                  className="cursor-pointer py-2 px-3"
                  onClick={() => toggleMuscle(muscle.value)}
                >
                  {muscle.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Lesiones */}
          <div>
            <label className="text-sm font-medium mb-3 block">Lesiones a considerar (opcional)</label>
            <div className="flex flex-wrap gap-2">
              {injuryOptions.map(injury => (
                <Badge
                  key={injury.value}
                  variant={formData.injuries.includes(injury.value) ? 'destructive' : 'outline'}
                  className="cursor-pointer py-2 px-3"
                  onClick={() => toggleInjury(injury.value)}
                >
                  {injury.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Botón generar */}
          <Button 
            onClick={generateRoutine} 
            disabled={loading}
            className="w-full h-12 text-lg"
          >
            {loading ? (
              <>
                <Clock className="w-5 h-5 mr-2 animate-spin" />
                Generando rutina...
              </>
            ) : (
              <>
                <Dumbbell className="w-5 h-5 mr-2" />
                Generar Rutina Personalizada
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Resultado de la rutina */}
      <AnimatePresence>
        {routine && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{routine.name}</CardTitle>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {routine.duration} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        {routine.exercises.length} ejercicios
                      </span>
                      <Badge variant="secondary">{routine.level}</Badge>
                    </CardDescription>
                  </div>
                  <Button size="icon" variant="outline" className="rounded-full">
                    <Play className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Estructura */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{routine.structure.warmup}</div>
                    <div className="text-xs text-green-600">Calentamiento</div>
                  </div>
                  <div className="text-center p-3 bg-orange-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{routine.structure.main}</div>
                    <div className="text-xs text-orange-600">Principal</div>
                  </div>
                  <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{routine.structure.cooldown}</div>
                    <div className="text-xs text-blue-600">Vuelta a la calma</div>
                  </div>
                </div>

                {/* Ejercicios */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Dumbbell className="w-4 h-4" />
                    Ejercicios
                  </h4>
                  {routine.exercises.map((exercise, index) => (
                    <motion.div
                      key={exercise.id || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedExercise(expandedExercise === exercise.id ? null : exercise.id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={
                              exercise.type === 'warmup' ? 'secondary' :
                              exercise.type === 'cooldown' ? 'outline' : 'default'
                            }
                            className="text-xs"
                          >
                            {exercise.type === 'warmup' ? '🔥' : exercise.type === 'cooldown' ? '❄️' : '💪'}
                          </Badge>
                          <div className="text-left">
                            <div className="font-medium">{index + 1}. {exercise.name}</div>
                            <div className="text-xs text-muted-foreground">{exercise.target}</div>
                          </div>
                        </div>
                        {expandedExercise === exercise.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      
                      <AnimatePresence>
                        {expandedExercise === exercise.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 bg-accent/50 border-t space-y-3">
                              <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                  <div className="text-xs text-muted-foreground">Series</div>
                                  <div className="font-semibold">{exercise.sets}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Repeticiones</div>
                                  <div className="font-semibold">{exercise.reps}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Descanso</div>
                                  <div className="font-semibold">{exercise.rest}s</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Shield className="w-3 h-3" />
                                Equipo: {exercise.equipment}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>

                {/* Tips */}
                <div className="bg-blue-500/10 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold flex items-center gap-2 text-blue-600">
                    💡 Consejos
                  </h4>
                  <ul className="space-y-1">
                    {routine.tips.map((tip, index) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
