'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Pill, Clock, DollarSign, AlertTriangle, Heart, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Supplement {
  id: string;
  name: string;
  category: string;
  benefits: string[];
  dosage: string;
  timing: string;
  sideEffects: string[];
  scientificEvidence: string;
  priceRange: string;
}

export function SupplementsGuide() {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');

  useEffect(() => {
    fetchSupplements();
  }, [selectedCategory, selectedGoal]);

  const fetchSupplements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (selectedGoal) {
        params.append('goal', selectedGoal);
      }
      
      const response = await fetch(`/api/supplements?${params}`);
      const data = await response.json();
      if (data.success) {
        setSupplements(data.supplements);
      }
    } catch (error) {
      console.error('Error fetching supplements:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', name: 'Todos', icon: '📚' },
    { id: 'protein', name: 'Proteínas', icon: '💪' },
    { id: 'performance', name: 'Rendimiento', icon: '⚡' },
    { id: 'stimulant', name: 'Estimulantes', icon: '🔥' },
    { id: 'vitamin', name: 'Vitaminas', icon: '💊' },
    { id: 'mineral', name: 'Minerales', icon: '🦴' },
    { id: 'health', name: 'Salud', icon: '❤️' }
  ];

  const goals = [
    { value: '', label: 'Todos los objetivos' },
    { value: 'muscle_gain', label: 'Ganancia Muscular' },
    { value: 'weight_loss', label: 'Pérdida de Peso' },
    { value: 'endurance', label: 'Resistencia' },
    { value: 'health', label: 'Salud General' }
  ];

  const getEvidenceColor = (evidence: string) => {
    switch (evidence) {
      case 'very high': return 'bg-green-500 text-white';
      case 'high': return 'bg-lime-500 text-white';
      case 'moderate': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getPriceDisplay = (priceRange: string) => {
    return priceRange.split('').map((char, i) => (
      <DollarSign key={i} className="w-3 h-3 inline" />
    ));
  };

  const filteredSupplements = supplements.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-500" />
            Guía de Suplementos Deportivos
          </CardTitle>
          <CardDescription>
            Información basada en evidencia científica sobre suplementación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <Badge
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                className="cursor-pointer py-2 px-3"
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.name}
              </Badge>
            ))}
          </div>

          {/* Objetivo */}
          <div>
            <label className="text-sm font-medium mb-2 block">Recomendado por objetivo:</label>
            <select
              value={selectedGoal}
              onChange={(e) => setSelectedGoal(e.target.value)}
              className="w-full p-2 border rounded-md bg-background"
            >
              {goals.map(goal => (
                <option key={goal.value} value={goal.value}>
                  {goal.label}
                </option>
              ))}
            </select>
          </div>

          {/* Búsqueda */}
          <input
            type="text"
            placeholder="Buscar suplemento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded-md bg-background"
          />
        </CardContent>
      </Card>

      {/* Lista de suplementos */}
      {loading ? (
        <div className="text-center py-8">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Cargando suplementos...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredSupplements.map((supp, index) => (
            <motion.div
              key={supp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{supp.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {categories.find(c => c.id === supp.category)?.icon} {supp.category}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        {getPriceDisplay(supp.priceRange)}
                      </div>
                      <Badge className={getEvidenceColor(supp.scientificEvidence)}>
                        Evidencia: {supp.scientificEvidence}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Beneficios */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                      <Check className="w-3 h-3 text-green-500" />
                      Beneficios
                    </h4>
                    <ul className="text-sm space-y-1">
                      {supp.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">•</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Dosis y Timing */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                      <div className="text-xs text-muted-foreground">Dosis</div>
                      <div className="font-medium">{supp.dosage}</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-950/20 p-2 rounded">
                      <div className="text-xs text-muted-foreground">Timing</div>
                      <div className="font-medium">{supp.timing}</div>
                    </div>
                  </div>

                  {/* Efectos secundarios */}
                  {supp.sideEffects.length > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded">
                      <h4 className="text-sm font-semibold mb-1 flex items-center gap-1 text-orange-600">
                        <AlertTriangle className="w-3 h-3" />
                        Efectos Secundarios
                      </h4>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        {supp.sideEffects.map((effect, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span>•</span>
                            {effect}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700 dark:text-red-300">
              <strong>Importante:</strong> Esta información es solo con fines educativos. 
              Consulta siempre con un profesional de la salud o nutricionista antes de comenzar 
              cualquier suplementación, especialmente si tienes condiciones médicas preexistentes 
              o estás tomando medicación.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
