"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Flame, Target, Medal, TrendingUp, Users } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Challenge {
  id: number;
  title: string;
  description: string;
  type: string;
  target: number;
  startDate: string;
  endDate: string;
  active: boolean;
  participants: number;
  entries: Array<{
    profile: { name: string };
    value: number;
    rank?: number;
  }>;
}

export function ChallengesSection() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/challenges")
      .then((res) => res.json())
      .then((data) => {
        setChallenges(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "steps": return <TrendingUp className="w-5 h-5" />;
      case "workout": return <Flame className="w-5 h-5" />;
      case "water": return <Target className="w-5 h-5" />;
      case "habit": return <Medal className="w-5 h-5" />;
      default: return <Trophy className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      steps: "👟 Pasos",
      workout: "🏋️ Entrenamientos",
      water: "💧 Agua",
      habit: "✅ Hábitos",
    };
    return labels[type] || type;
  };

  const daysLeft = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <section className="py-12 px-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            🏆 Challenges Mensuales
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Compite con la comunidad, alcanza tus objetivos y gana recompensas exclusivas
          </p>
        </motion.div>

        {challenges.length === 0 ? (
          <Card className="p-8 text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No hay challenges activos</h3>
            <p className="text-muted-foreground">
              ¡Pronto nuevos desafíos! Mantente atento.
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {challenges.map((challenge, idx) => (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                    <div className="bg-gradient-to-r from-primary to-secondary p-4 text-primary-foreground">
                      <div className="flex items-center gap-2 mb-2">
                        {getTypeIcon(challenge.type)}
                        <span className="text-sm font-medium">{getTypeLabel(challenge.type)}</span>
                      </div>
                      <h3 className="text-xl font-bold">{challenge.title}</h3>
                    </div>

                    <div className="p-4">
                      <p className="text-muted-foreground text-sm mb-4">
                        {challenge.description}
                      </p>

                      <div className="flex items-center justify-between mb-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {challenge.participants} participantes
                        </span>
                        <span className="font-medium text-primary">
                          ⏱️ {daysLeft(challenge.endDate)} días
                        </span>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3 mb-4">
                        <div className="text-xs text-muted-foreground mb-1">Objetivo</div>
                        <div className="text-lg font-bold">
                          {challenge.target.toLocaleString()} 
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            {challenge.type === "steps" ? "pasos" : 
                             challenge.type === "workout" ? "entrenamientos" :
                             challenge.type === "water" ? "ml" : "completados"}
                          </span>
                        </div>
                      </div>

                      {challenge.entries.length > 0 && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <Medal className="w-3 h-3" />
                            Top 3
                          </div>
                          <div className="space-y-2">
                            {challenge.entries.slice(0, 3).map((entry, i) => (
                              <div
                                key={i}
                                className={`flex items-center justify-between text-sm p-2 rounded ${
                                  i === 0 ? "bg-yellow-50 dark:bg-yellow-900/20" :
                                  i === 1 ? "bg-gray-50 dark:bg-gray-800" :
                                  i === 2 ? "bg-orange-50 dark:bg-orange-900/20" : ""
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="font-bold w-4">
                                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                                  </span>
                                  <span>{entry.profile.name}</span>
                                </span>
                                <span className="font-medium">
                                  {entry.value.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}
