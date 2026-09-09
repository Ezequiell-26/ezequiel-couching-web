"use client";

import * as React from "react";
import { Download, LogOut, LockKeyhole } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { PlaceholderNote } from "@/components/site/placeholder-note";
import { LoadingState, EmptyState, ErrorState } from "@/components/site/states";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Textarea, Select, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatDate, formatPrice, cn } from "@/lib/utils";
import { useRouter } from "@/lib/router";

/**
 * CoachView — panel del entrenador: resumen, leads, mensajes, cuestionarios y pedidos.
 * La sesión vive en /api/admin/session (cookie firmada httpOnly); este componente
 * solo consulta su estado y monta las pestañas cuando hay acceso.
 */

type SessionInfo = { authed: boolean; configured: boolean };
type Counts = { leads: number; unreadMessages: number; newIntakes: number; pendingOrders: number };

type Lead = {
  id: number;
  email: string;
  name: string | null;
  source: string;
  createdAt: string;
};

type Message = {
  id: number;
  name: string;
  email: string;
  body: string;
  read: boolean;
  reply: string | null;
  createdAt: string;
};

type Intake = {
  id: number;
  name: string;
  email: string;
  age: number | null;
  sex: string | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: string | null;
  experience: string | null;
  daysPerWeek: number | null;
  equipment: string | null;
  injuries: string | null;
  message: string | null;
  status: string;
  createdAt: string;
};

type Order = {
  id: number;
  number: string;
  kind: string;
  itemName: string;
  amountCents: number;
  customerName: string;
  customerEmail: string;
  status: string;
  createdAt: string;
};

type TabId = "resumen" | "leads" | "mensajes" | "cuestionarios" | "pedidos";

const TABS: { id: TabId; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "leads", label: "Leads" },
  { id: "mensajes", label: "Mensajes" },
  { id: "cuestionarios", label: "Cuestionarios" },
  { id: "pedidos", label: "Pedidos" },
];

const INTAKE_STATUS: { value: string; label: string }[] = [
  { value: "nuevo", label: "Nuevo" },
  { value: "contactado", label: "Contactado" },
  { value: "cliente", label: "Cliente" },
  { value: "descartado", label: "Descartado" },
];

const ORDER_STATUS: { value: string; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "pagado", label: "Pagado" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
];

const EQUIPMENT_LABELS: Record<string, string> = {
  gimnasio: "Gimnasio",
  casa_minimo: "Casa (material mínimo)",
  peso_corporal: "Peso corporal",
};

function statusBadgeVariant(status: string): "default" | "secondary" | "outline" | "muted" {
  switch (status) {
    case "nuevo":
    case "pagado":
      return "default";
    case "contactado":
    case "pendiente":
      return "secondary";
    case "cliente":
    case "entregado":
      return "outline";
    default:
      return "muted";
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? "Error inesperado.";
  } catch {
    return "Error inesperado.";
  }
}

export function CoachView() {
  const navigate = useRouter((s) => s.navigate);
  const { status: sessionStatus, data: session, reload: loadSession } = useAsyncData<SessionInfo>(async () => {
    const res = await fetch("/api/admin/session", { cache: "no-store" });
    if (!res.ok) throw new Error("session");
    const json = (await res.json()) as { authed?: boolean; configured?: boolean };
    return { authed: Boolean(json.authed), configured: Boolean(json.configured) };
  }, []);
  const [tab, setTab] = React.useState<TabId>("resumen");

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/session", { method: "DELETE" });
    } catch {
      /* aunque falle la petición, refrescamos el estado local */
    }
    setTab("resumen");
    loadSession();
  };

  return (
    <>
      <PageHeader
        eyebrow="Panel interno"
        title="Panel del entrenador"
        description="Leads, mensajes, cuestionarios y pedidos en un único sitio. Solo para Ezequiel."
      >
        <div className="mt-6">
          <Button variant="outline" size="sm" onClick={() => navigate("home", {}, { source: "coach" })}>
            Volver a la web
          </Button>
        </div>
      </PageHeader>

      <Container className="py-10 sm:py-12">
        {sessionStatus === "error" ? (
          <ErrorState message="No pudimos comprobar tu sesión." onRetry={loadSession} />
        ) : session === null ? (
          <LoadingState label="Comprobando sesión…" />
        ) : !session.configured ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 p-6">
              <div className="flex items-center gap-2">
                <LockKeyhole aria-hidden className="size-5 text-primary" />
                <h2 className="text-lg font-semibold">Acceso deshabilitado</h2>
              </div>
              <PlaceholderNote>
                Acceso deshabilitado: define ADMIN_PASSWORD (mín. 8 caracteres) en .env
              </PlaceholderNote>
              <p className="text-sm text-muted-foreground">
                Sin contraseña configurada en el servidor no existe acceso por defecto: nunca se
                fabrica una. Define la variable y recarga esta página.
              </p>
            </CardContent>
          </Card>
        ) : !session.authed ? (
          <LoginForm onSuccess={loadSession} />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Sesión activa durante 12 horas.
              </p>
              <Button variant="outline" size="sm" onClick={() => void handleLogout()}>
                <LogOut aria-hidden />
                Salir
              </Button>
            </div>

            <PlaceholderNote className="max-w-2xl">
              Entrega de guía y emails: pendiente de configurar SMTP (los leads quedan registrados)
            </PlaceholderNote>

            <div role="tablist" aria-label="Secciones del panel" className="flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    tab === t.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-transparent text-foreground hover:bg-accent/60",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div role="tabpanel" aria-label={TABS.find((t) => t.id === tab)?.label}>
              {tab === "resumen" ? <SummaryTab onExpired={loadSession} /> : null}
              {tab === "leads" ? <LeadsTab onExpired={loadSession} /> : null}
              {tab === "mensajes" ? <MessagesTab onExpired={loadSession} /> : null}
              {tab === "cuestionarios" ? <IntakesTab onExpired={loadSession} /> : null}
              {tab === "pedidos" ? <OrdersTab onExpired={loadSession} /> : null}
            </div>
          </div>
        )}
      </Container>
    </>
  );
}

/* ---------------------------------- Login --------------------------------- */

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setPassword("");
        onSuccess();
        return;
      }
      const message = await readError(res);
      setError(res.status === 429 ? message : res.status === 401 ? "Contraseña incorrecta." : message);
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <LockKeyhole aria-hidden className="size-5 text-primary" />
          Acceso del entrenador
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Introduce la contraseña del panel para continuar.
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="coach-password">Contraseña</Label>
            <Input
              id="coach-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={busy || password.length === 0}>
            {busy ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/* --------------------------------- Resumen -------------------------------- */

function SummaryTab({ onExpired }: { onExpired: () => void }) {
  const { status, data: counts, reload } = useAsyncData<Counts>(async () => {
    const res = await fetch("/api/admin/session", { method: "PUT", cache: "no-store" });
    if (res.status === 401) {
      onExpired();
      throw new Error("expired");
    }
    if (!res.ok) throw new Error("counts");
    const json = (await res.json()) as { counts?: Counts };
    return json.counts ?? { leads: 0, unreadMessages: 0, newIntakes: 0, pendingOrders: 0 };
  }, [onExpired]);

  if (status === "error") {
    return <ErrorState onRetry={reload} />;
  }

  const items: { label: string; value: number | null }[] = [
    { label: "Leads registrados", value: counts?.leads ?? null },
    { label: "Mensajes sin leer", value: counts?.unreadMessages ?? null },
    { label: "Cuestionarios nuevos", value: counts?.newIntakes ?? null },
    { label: "Pedidos pendientes", value: counts?.pendingOrders ?? null },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="p-6">
          <p className="text-sm text-muted-foreground">{item.label}</p>
          {status === "loading" || item.value === null ? (
            <p aria-hidden className="mt-2 animate-pulse text-4xl font-bold text-muted">—</p>
          ) : (
            <p aria-label={`${item.value}`} className="mt-2 text-4xl font-bold text-primary">
              {item.value}
            </p>
          )}
        </Card>
      ))}
      {status === "loading" ? <span className="sr-only">Cargando resumen…</span> : null}
    </div>
  );
}

/* ---------------------------------- Leads --------------------------------- */

function LeadsTab({ onExpired }: { onExpired: () => void }) {
  const { status, data, reload } = useAsyncData<Lead[]>(async () => {
    const res = await fetch("/api/admin/leads", { cache: "no-store" });
    if (res.status === 401) {
      onExpired();
      throw new Error("expired");
    }
    if (!res.ok) throw new Error("leads");
    const json = (await res.json()) as { leads?: Lead[] };
    return json.leads ?? [];
  }, [onExpired]);
  const leads = data ?? [];

  if (status === "loading") return <LoadingState label="Cargando leads…" />;
  if (status === "error") return <ErrorState onRetry={reload} />;
  if (leads.length === 0)
    return <EmptyState title="Sin leads todavía." hint="Cuando alguien descargue la guía aparecerá aquí." />;

  return (
    <>
      {/* Móvil: lista de cards */}
      <ul className="space-y-3 md:hidden">
        {leads.map((lead) => (
          <li key={lead.id}>
            <Card className="p-4">
              <p className="font-medium break-words">{lead.email}</p>
              <p className="text-sm text-muted-foreground">{lead.name ?? "Sin nombre"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{lead.source}</Badge>
                <span className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</span>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {/* Escritorio: tabla */}
      <Card className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Listado de leads registrados</caption>
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-medium">Email</th>
                <th scope="col" className="px-4 py-3 font-medium">Nombre</th>
                <th scope="col" className="px-4 py-3 font-medium">Origen</th>
                <th scope="col" className="px-4 py-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 break-words">{lead.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{lead.source}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(lead.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* --------------------------------- Mensajes -------------------------------- */

function MessagesTab({ onExpired }: { onExpired: () => void }) {
  const { status, data, reload } = useAsyncData<Message[]>(async () => {
    const res = await fetch("/api/admin/messages", { cache: "no-store" });
    if (res.status === 401) {
      onExpired();
      throw new Error("expired");
    }
    if (!res.ok) throw new Error("messages");
    const json = (await res.json()) as { messages?: Message[] };
    return json.messages ?? [];
  }, [onExpired]);

  // Parches locales aplicados desde los handlers (marcar leído / guardar nota).
  const [updates, setUpdates] = React.useState<Record<number, Message>>({});
  const messages = React.useMemo(
    () => (data ?? []).map((m) => updates[m.id] ?? m),
    [data, updates],
  );

  if (status === "loading") return <LoadingState label="Cargando mensajes…" />;
  if (status === "error") return <ErrorState onRetry={reload} />;
  if (messages.length === 0)
    return <EmptyState title="Sin mensajes todavía." hint="Los mensajes del formulario de contacto aparecerán aquí." />;

  return (
    <div className="max-h-[36rem] space-y-3 overflow-y-auto pr-1">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          onUpdate={(updated) =>
            setUpdates((prev) => ({ ...prev, [updated.id]: updated }))
          }
          onExpired={onExpired}
        />
      ))}
    </div>
  );
}

function MessageItem({
  message,
  onUpdate,
  onExpired,
}: {
  message: Message;
  onUpdate: (m: Message) => void;
  onExpired: () => void;
}) {
  const [reply, setReply] = React.useState(message.reply ?? "");
  const [saving, setSaving] = React.useState<"read" | "reply" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const patch = async (body: { read?: boolean; reply?: string }, kind: "read" | "reply") => {
    setError(null);
    setSaving(kind);
    try {
      const res = await fetch(`/api/admin/messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        onExpired();
        return;
      }
      if (!res.ok) throw new Error("patch");
      const data = (await res.json()) as { message?: Message };
      if (data.message) onUpdate(data.message);
      if (kind === "reply") toast({ title: "Guardado", description: "Nota interna guardada." });
    } catch {
      setError("No se pudo guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{message.name}</p>
          <p className="text-sm break-words text-muted-foreground">{message.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {!message.read ? <Badge>Nuevo</Badge> : null}
          <span className="text-xs text-muted-foreground">{formatDate(message.createdAt)}</span>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>

      <div className="mt-4 space-y-2">
        <Label htmlFor={`reply-${message.id}`} className="text-xs uppercase tracking-wide text-muted-foreground">
          Respuesta interna (nota)
        </Label>
        <Textarea
          id={`reply-${message.id}`}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Nota privada sobre este mensaje…"
          maxLength={4000}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={saving !== null || message.read}
            onClick={() => void patch({ read: true }, "read")}
          >
            {saving === "read" ? "Marcando…" : "Marcar leído"}
          </Button>
          <Button
            size="sm"
            disabled={saving !== null}
            onClick={() => void patch({ reply }, "reply")}
          >
            {saving === "reply" ? "Guardando…" : "Guardar nota"}
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

/* ------------------------------ Cuestionarios ------------------------------ */

function IntakesTab({ onExpired }: { onExpired: () => void }) {
  const { status, data, reload } = useAsyncData<Intake[]>(async () => {
    const res = await fetch("/api/admin/intakes", { cache: "no-store" });
    if (res.status === 401) {
      onExpired();
      throw new Error("expired");
    }
    if (!res.ok) throw new Error("intakes");
    const json = (await res.json()) as { intakes?: Intake[] };
    return json.intakes ?? [];
  }, [onExpired]);

  // Parches locales aplicados desde el handler de cambio de estado.
  const [updates, setUpdates] = React.useState<Record<number, Intake>>({});
  const intakes = React.useMemo(
    () => (data ?? []).map((i) => updates[i.id] ?? i),
    [data, updates],
  );

  if (status === "loading") return <LoadingState label="Cargando cuestionarios…" />;
  if (status === "error") return <ErrorState onRetry={reload} />;

  return (
    <div className="space-y-4">
      <div>
        <a
          href="/api/admin/intakes/export"
          download
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <Download aria-hidden />
          Exportar CSV
        </a>
      </div>

      {intakes.length === 0 ? (
        <EmptyState
          title="Sin cuestionarios todavía."
          hint="Los cuestionarios del formulario de alto valor aparecerán aquí."
        />
      ) : (
        <div className="max-h-[40rem] space-y-3 overflow-y-auto pr-1">
          {intakes.map((intake) => (
            <IntakeItem
              key={intake.id}
              intake={intake}
              onUpdate={(updated) =>
                setUpdates((prev) => ({ ...prev, [updated.id]: updated }))
              }
              onExpired={onExpired}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IntakeItem({
  intake,
  onUpdate,
  onExpired,
}: {
  intake: Intake;
  onUpdate: (i: Intake) => void;
  onExpired: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const changeStatus = async (status: string) => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/intakes/${intake.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) {
        onExpired();
        return;
      }
      if (!res.ok) throw new Error("status");
      const data = (await res.json()) as { intake?: Intake };
      if (data.intake) onUpdate(data.intake);
      toast({ title: "Guardado", description: "Estado actualizado." });
    } catch {
      setError("No se pudo actualizar el estado.");
    } finally {
      setSaving(false);
    }
  };

  const rows: { label: string; value: string | null }[] = [
    { label: "Edad", value: intake.age !== null ? `${intake.age} años` : null },
    { label: "Sexo", value: intake.sex === "hombre" ? "Hombre" : intake.sex === "mujer" ? "Mujer" : null },
    { label: "Altura", value: intake.heightCm !== null ? `${intake.heightCm} cm` : null },
    { label: "Peso", value: intake.weightKg !== null ? `${intake.weightKg} kg` : null },
    { label: "Objetivo", value: intake.goal },
    { label: "Experiencia", value: intake.experience },
    {
      label: "Días/semana",
      value:
        intake.daysPerWeek !== null
          ? intake.daysPerWeek === 1
            ? "1 día"
            : `${intake.daysPerWeek} días`
          : null,
    },
    { label: "Material", value: intake.equipment ? (EQUIPMENT_LABELS[intake.equipment] ?? intake.equipment) : null },
    { label: "Lesiones", value: intake.injuries },
    { label: "Mensaje", value: intake.message },
  ];

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{intake.name}</p>
          <p className="text-sm break-words text-muted-foreground">{intake.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusBadgeVariant(intake.status)}>
            {INTAKE_STATUS.find((s) => s.value === intake.status)?.label ?? intake.status}
          </Badge>
          <span className="text-xs text-muted-foreground">{formatDate(intake.createdAt)}</span>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-2">
            <dt className="shrink-0 text-muted-foreground">{row.label}:</dt>
            <dd className="min-w-0 break-words">{row.value ?? "—"}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Label htmlFor={`status-${intake.id}`} className="text-xs text-muted-foreground">
          Estado:
        </Label>
        <Select
          id={`status-${intake.id}`}
          value={intake.status}
          disabled={saving}
          onChange={(e) => void changeStatus(e.target.value)}
          className="w-44"
        >
          {INTAKE_STATUS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        {saving ? <span className="text-xs text-muted-foreground">Guardando…</span> : null}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

/* --------------------------------- Pedidos --------------------------------- */

function OrdersTab({ onExpired }: { onExpired: () => void }) {
  const { status, data, reload } = useAsyncData<Order[]>(async () => {
    const res = await fetch("/api/admin/orders", { cache: "no-store" });
    if (res.status === 401) {
      onExpired();
      throw new Error("expired");
    }
    if (!res.ok) throw new Error("orders");
    const json = (await res.json()) as { orders?: Order[] };
    return json.orders ?? [];
  }, [onExpired]);

  // Parches locales aplicados desde el handler de cambio de estado.
  const [updates, setUpdates] = React.useState<Record<number, Order>>({});
  const orders = React.useMemo(
    () => (data ?? []).map((o) => updates[o.id] ?? o),
    [data, updates],
  );

  const changeStatus = async (order: Order, status: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.status === 401) {
        onExpired();
        return;
      }
      if (!res.ok) throw new Error("status");
      const data = (await res.json()) as { order?: Order };
      const updated = data.order;
      if (updated) setUpdates((prev) => ({ ...prev, [updated.id]: updated }));
      toast({ title: "Guardado", description: "Estado del pedido actualizado." });
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar el pedido.", variant: "error" });
    }
  };

  if (status === "loading") return <LoadingState label="Cargando pedidos…" />;
  if (status === "error") return <ErrorState onRetry={reload} />;
  if (orders.length === 0)
    return <EmptyState title="Sin pedidos todavía." hint="Las compras aparecerán aquí al confirmarse." />;

  return (
    <>
      {/* Móvil: lista de cards */}
      <ul className="space-y-3 md:hidden">
        {orders.map((order) => (
          <li key={order.id}>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-medium">{order.number}</p>
                  <p className="text-sm text-muted-foreground">{order.itemName}</p>
                </div>
                <Badge variant={statusBadgeVariant(order.status)}>
                  {ORDER_STATUS.find((s) => s.value === order.status)?.label ?? order.status}
                </Badge>
              </div>
              <p className="mt-2 text-sm font-semibold text-primary">{formatPrice(order.amountCents)}</p>
              <p className="text-sm break-words text-muted-foreground">{order.customerEmail}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
              <div className="mt-3">
                <Label htmlFor={`order-status-${order.id}`} className="sr-only">
                  Estado del pedido {order.number}
                </Label>
                <Select
                  id={`order-status-${order.id}`}
                  value={order.status}
                  onChange={(e) => void changeStatus(order, e.target.value)}
                  className="w-40"
                >
                  {ORDER_STATUS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {/* Escritorio: tabla */}
      <Card className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Listado de pedidos</caption>
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-medium">Número</th>
                <th scope="col" className="px-4 py-3 font-medium">Artículo</th>
                <th scope="col" className="px-4 py-3 font-medium">Importe</th>
                <th scope="col" className="px-4 py-3 font-medium">Cliente</th>
                <th scope="col" className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-mono">{order.number}</td>
                  <td className="px-4 py-3">{order.itemName}</td>
                  <td className="px-4 py-3 font-semibold text-primary">{formatPrice(order.amountCents)}</td>
                  <td className="px-4 py-3 break-words text-muted-foreground">{order.customerEmail}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`order-status-d-${order.id}`} className="sr-only">
                        Estado del pedido {order.number}
                      </Label>
                      <Select
                        id={`order-status-d-${order.id}`}
                        value={order.status}
                        onChange={(e) => void changeStatus(order, e.target.value)}
                        className="w-36"
                      >
                        {ORDER_STATUS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
