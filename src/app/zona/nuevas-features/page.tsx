'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Dumbbell, 
  Music, 
  Pill, 
  Brain, 
  Moon, 
  Trophy, 
  Users, 
  Video,
  Calendar,
  Download,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AIRoutineGenerator } from '@/components/ai/routine-generator';
import { SupplementsGuide } from '@/components/supplements/guide';
import { WorkoutMusic } from '@/components/music/workout-player';

const features = [
  {
    id: 'ai-routines',
    name: 'Rutinas con IA',
    description: 'Genera rutinas personalizadas basadas en tus objetivos, equipamiento y nivel',
    icon: Brain,
    color: 'from-blue-500 to-cyan-500',
    badge: 'NUEVO',
    component: 'ai-routines'
  },
  {
    id: 'supplements',
    name: 'Guía de Suplementos',
    description: 'Información científica sobre suplementación deportiva',
    icon: Pill,
    color: 'from-purple-500 to-pink-500',
    badge: 'NUEVO',
    component: 'supplements'
  },
  {
    id: 'music',
    name: 'Música para Entrenar',
    description: 'Playlists curadas por tipo de entrenamiento con BPM ideal',
    icon: Music,
    color: 'from-orange-500 to-red-500',
    badge: 'NUEVO',
    component: 'music'
  },
  {
    id: 'sleep',
    name: 'Tracker de Sueño',
    description: 'Monitorea y mejora la calidad de tu descanso',
    icon: Moon,
    color: 'from-indigo-500 to-blue-500',
    badge: 'PRONTO',
    component: null
  },
  {
    id: 'challenges',
    name: 'Challenges Mensuales',
    description: 'Competiciones mensuales con premios y rankings',
    icon: Trophy,
    color: 'from-yellow-500 to-orange-500',
    badge: 'PRONTO',
    component: null
  },
  {
    id: 'community',
    name: 'Comunidad',
    description: 'Conecta con otros atletas, comparte logros y consejos',
    icon: Users,
    color: 'from-green-500 to-emerald-500',
    badge: 'PRONTO',
    component: null
  },
  {
    id: 'videos',
    name: 'Videos de Ejercicios',
    description: 'Biblioteca de ejercicios con demostraciones en video',
    icon: Video,
    color: 'from-red-500 to-pink-500',
    badge: 'PRONTO',
    component: null
  },
  {
    id: 'calendar',
    name: 'Calendar Integration',
    description: 'Sincroniza tus entrenamientos con Google Calendar',
    icon: Calendar,
    color: 'from-teal-500 to-cyan-500',
    badge: 'PRONTO',
    component: null
  },
  {
    id: 'export',
    name: 'Exportar Rutinas',
    description: 'Descarga tus rutinas en PDF para llevarlas al gimnasio',
    icon: Download,
    color: 'from-gray-500 to-slate-500',
    badge: 'PRONTO',
    component: null
  }
];

export function NewFeatures() {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  const renderComponent = (featureId: string) => {
    switch (featureId) {
      case 'ai-routines':
        return <AIRoutineGenerator />;
      case 'supplements':
        return <SupplementsGuide />;
      case 'music':
        return <WorkoutMusic />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Nuevas Funcionalidades</span>
        </motion.div>
        
        <h1 className="text-4xl font-bold">
          Descubre lo Nuevo en Tu Zona
        </h1>
        
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Hemos añadido herramientas avanzadas para llevar tu entrenamiento al siguiente nivel.
          Explora las nuevas features y optimiza tu rendimiento.
        </p>
      </div>

      {/* Grid de features */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature, index) => (
          <motion.div
            key={feature.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className={`h-full cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 ${
                activeFeature === feature.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => feature.component && setActiveFeature(feature.id === activeFeature ? null : feature.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <Badge variant={feature.badge === 'NUEVO' ? 'default' : 'secondary'}>
                    {feature.badge}
                  </Badge>
                </div>
                <CardTitle className="mt-4">{feature.name}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {feature.component ? (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveFeature(feature.id === activeFeature ? null : feature.id);
                    }}
                  >
                    {activeFeature === feature.id ? 'Ocultar' : 'Explorar'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Próximamente
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Componente activo expandido */}
      {activeFeature && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
        >
          {renderComponent(activeFeature)}
        </motion.div>
      )}

      {/* Stats */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">3+</div>
              <div className="text-sm text-muted-foreground">Nuevas APIs</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">9</div>
              <div className="text-sm text-muted-foreground">Features Nuevos</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground">Gratis</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted-foreground">Disponibilidad</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
