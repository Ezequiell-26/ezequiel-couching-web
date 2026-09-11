/** Definición del cuestionario inicial (preguntador) — pasos y validación. */

import { z } from "zod";

export const intakeSchema = z.object({
  name: z.string().min(2, "Escribe tu nombre").max(80),
  email: z.string().email("Email no válido").max(120),
  age: z.coerce.number().int().min(14, "Edad mínima 14").max(90, "Revisa la edad"),
  sex: z.enum(["hombre", "mujer"]),
  heightCm: z.coerce.number().min(120, "Altura no válida").max(230, "Altura no válida"),
  weightKg: z.coerce.number().min(35, "Peso no válido").max(300, "Peso no válido"),
  goal: z.enum(["perder_grasa", "ganar_musculo", "rendimiento", "salud"]),
  experience: z.enum(["nunca", "menos_1_ano", "1_3_anos", "mas_3_anos"]),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  equipment: z.enum(["gimnasio", "casa_minimo", "peso_corporal"]),
  injuries: z.string().max(500).optional().or(z.literal("")),
  message: z.string().max(1000).optional().or(z.literal("")),
});

export type IntakeData = z.infer<typeof intakeSchema>;

export const quizSteps = [
  { id: "identity", title: "Sobre ti", fields: ["name", "email"] },
  { id: "body", title: "Tu punto de partida", fields: ["age", "sex", "heightCm", "weightKg"] },
  { id: "goal", title: "Tu objetivo", fields: ["goal", "experience"] },
  { id: "context", title: "Tu contexto", fields: ["daysPerWeek", "equipment", "injuries", "message"] },
] as const;
