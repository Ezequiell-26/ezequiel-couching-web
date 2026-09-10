"use client";

import * as React from "react";
import { Dumbbell, Lock, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ErrorState } from "@/components/site/states";
import { zonaApi, type ZonaProfile } from "./api";

/**
 * AuthGate de Mi Zona: registro e inicio de sesión con nombre + PIN (4-6
 * dígitos). Los errores del API se muestran tal cual. Al éxito, la vista
 * cargó/ cargará rutinas y progreso: solo los datos del propio perfil.
 */
export function AuthGate({ onAuthenticated }: { onAuthenticated: (profile: ZonaProfile) => void }) {
  const [mode, setMode] = React.useState<"crear" | "entrar">("crear");
  const [name, setName] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  function switchMode(next: "crear" | "entrar") {
    setMode(next);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError("Tu nombre debe tener al menos 2 caracteres.");
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      setError("El PIN debe tener entre 4 y 6 dígitos numéricos.");
      return;
    }

    setSubmitting(true);
    try {
      const path = mode === "crear" ? "/api/zona/profile" : "/api/zona/profile/login";
      const profile = await zonaApi<ZonaProfile>(path, {
        method: "POST",
        body: JSON.stringify({ name: trimmedName, pin }),
      });
      onAuthenticated(profile);
    } catch (err) {
      // Mensaje del API tal cual (401 genérico, 409 nombre en uso, rate-limit…).
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[55vh] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center gap-2 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
            <Dumbbell aria-hidden className="size-6 text-primary" />
          </span>
          <CardTitle className="text-xl">Mi Zona de entrenamiento</CardTitle>
          <CardDescription>
            Tu cuenta guarda tus rutinas y tu progreso: solo tus datos, protegidos con un PIN de 4 a 6 dígitos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tabs propias (no existe componente Tabs en el proyecto) */}
          <div role="tablist" aria-label="Crear cuenta o iniciar sesión" className="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/40 p-1">
            {(
              [
                { id: "crear", label: "Crear cuenta" },
                { id: "entrar", label: "Iniciar sesión" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={mode === t.id}
                onClick={() => switchMode(t.id)}
                className={`min-h-11 rounded-md px-3 text-sm font-semibold transition-colors ${
                  mode === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="zona-name">Tu nombre</Label>
              <div className="relative">
                <User aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="zona-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="p. ej. Martín"
                  autoComplete="off"
                  autoCapitalize="words"
                  maxLength={40}
                  className="h-11 pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="zona-pin">PIN (4 a 6 dígitos)</Label>
              <div className="relative">
                <Lock aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="zona-pin"
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••"
                  autoComplete={mode === "crear" ? "new-password" : "current-password"}
                  className="h-11 pl-9 tracking-[0.3em]"
                  required
                />
              </div>
            </div>

            {error ? <ErrorState message={error} /> : null}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
                  {mode === "crear" ? "Creando cuenta…" : "Entrando…"}
                </>
              ) : mode === "crear" ? (
                "Crear mi cuenta"
              ) : (
                "Iniciar sesión"
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {mode === "crear"
              ? "Elegí un nombre y un PIN que recuerdes: con ellos volvés a entrar desde cualquier navegador."
              : "Usá el nombre y el PIN con los que creaste tu cuenta."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
