"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, TrendingUp, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface SleepLog {
  id: number;
  date: string;
  hours: number;
  quality?: number;
  notes?: string;
}

export function SleepTracker() {
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [hours, setHours] = useState("7");
  const [quality, setQuality] = useState("3");

  useEffect(() => {
    fetch("/api/sleep?days=30")
      .then((res) => res.json())
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch("/api/sleep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, hours, quality: parseInt(quality) }),
      });

      if (res.ok) {
        const log = await res.json();
        setLogs([log, ...logs.filter((l) => l.date !== log.date)]);
      }
    } catch (error) {
      console.error("Error saving sleep:", error);
    }
  };

  const avgHours = logs.length > 0 
    ? (logs.reduce((sum, l) => sum + l.hours, 0) / logs.length).toFixed(1)
    : 0;

  const avgQuality = logs.length > 0 && logs.some(l => l.quality)
    ? (logs.filter(l => l.quality).reduce((sum, l) => sum + (l.quality || 0), 0) / logs.filter(l => l.quality).length).toFixed(1)
    : 0;

  return (
    <section className="py-12 px-4 bg-gradient-to-br from-indigo-50 via-background to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            😴 Sleep Tracker
          </h2>
          <p className="text-muted-foreground text-lg">
            Registra tu descanso para optimizar tu recuperación y rendimiento
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 text-center">
            <Moon className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
            <div className="text-2xl font-bold">{logs.length}</div>
            <div className="text-xs text-muted-foreground">Noches registradas</div>
          </Card>
          <Card className="p-4 text-center">
            <Sun className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <div className="text-2xl font-bold">{avgHours}h</div>
            <div className="text-xs text-muted-foreground">Promedio horas</div>
          </Card>
          <Card className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">{avgQuality}/5</div>
            <div className="text-xs text-muted-foreground">Calidad promedio</div>
          </Card>
          <Card className="p-4 text-center">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">
              {logs.filter(l => l.hours >= 7).length}
            </div>
            <div className="text-xs text-muted-foreground">Noches ≥7h</div>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Formulario */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Registrar sueño</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="hours">Horas dormidas</Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="quality">Calidad (1-5)</Label>
                <Select
                  id="quality"
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                >
                  <option value="1">1 - Muy mala</option>
                  <option value="2">2 - Mala</option>
                  <option value="3">3 - Regular</option>
                  <option value="4">4 - Buena</option>
                  <option value="5">5 - Excelente</option>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full">
                Guardar registro
              </Button>
            </div>
          </Card>

          {/* Historial */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Últimos registros</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : logs.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No hay registros aún
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {logs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium">
                        {new Date(log.date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.notes || "Sin notas"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{log.hours}h</div>
                      {log.quality && (
                        <div className="text-xs">
                          {"⭐".repeat(Math.round(log.quality!))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}
