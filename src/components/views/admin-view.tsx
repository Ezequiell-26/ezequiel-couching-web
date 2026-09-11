"use client";

import * as React from "react";
import { LockKeyhole, LogOut, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { track } from "@/lib/analytics";
import { PageHeader } from "@/components/site/page-header";
import { Container } from "@/components/site/container";
import { PlaceholderNote } from "@/components/site/placeholder-note";
import { LoadingState, EmptyState, ErrorState } from "@/components/site/states";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatPrice, formatDate, cn } from "@/lib/utils";
import { useRouter } from "@/lib/router";

/**
 * AdminView — gestión de catálogo: productos, planes y artículos.
 * Misma puerta de sesión que el panel del entrenador (duplicada a propósito:
 * sin contexto compartido entre vistas internas).
 */

type SessionInfo = { authed: boolean; configured: boolean };

type Product = {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: string;
  priceCents: number;
  fileName: string | null;
  active: boolean;
  createdAt: string;
};

type Plan = {
  id: number;
  slug: string;
  title: string;
  level: string;
  weeks: number;
  summary: string;
  priceCents: number | null;
  active: boolean;
  createdAt: string;
};

type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  published: boolean;
  createdAt: string;
};

type TabId = "productos" | "planes" | "articulos";

const TABS: { id: TabId; label: string }[] = [
  { id: "productos", label: "Productos" },
  { id: "planes", label: "Planes" },
  { id: "articulos", label: "Artículos" },
];

const PRODUCT_CATEGORIES = ["guia", "programa", "plantilla"] as const;
const PLAN_LEVELS = ["iniciacion", "intermedio", "avanzado"] as const;

const LEVEL_LABELS: Record<string, string> = {
  iniciacion: "Iniciación",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

const CATEGORY_LABELS: Record<string, string> = {
  guia: "Guía",
  programa: "Programa",
  plantilla: "Plantilla",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function eurosToCents(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  if (!normalized) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? "Error inesperado.";
  } catch {
    return "Error inesperado.";
  }
}

function FormError({ message }: { message: string }) {
  return (
    <p role="alert" className="text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

/** Checkbox estilizada tipo switch, accesible con role="switch". */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border transition-colors",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-block size-4 rounded-full bg-background shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
      <span className="text-sm text-muted-foreground">{checked ? "Sí" : "No"}</span>
    </div>
  );
}

export function AdminView() {
  const navigate = useRouter((s) => s.navigate);
  const { status: sessionStatus, data: session, reload: loadSession } = useAsyncData<SessionInfo>(async () => {
    const res = await fetch("/api/admin/session", { cache: "no-store" });
    if (!res.ok) throw new Error("session");
    const json = (await res.json()) as { authed?: boolean; configured?: boolean };
    return { authed: Boolean(json.authed), configured: Boolean(json.configured) };
  }, []);
  const [tab, setTab] = React.useState<TabId>("productos");

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/session", { method: "DELETE" });
    } catch {
      /* aunque falle la petición, refrescamos el estado local */
    }
    setTab("productos");
    loadSession();
  };

  return (
    <>
      <PageHeader
        eyebrow="Gestión"
        title="Administración del catálogo"
        description="Productos digitales, planes de entrenamiento y artículos del blog. Solo para Ezequiel."
      >
        <div className="mt-6">
          <Button variant="outline" size="sm" onClick={() => navigate("home", {}, { source: "admin" })}>
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
              <p className="text-sm text-muted-foreground">Sesión activa durante 12 horas.</p>
              <Button variant="outline" size="sm" onClick={() => void handleLogout()}>
                <LogOut aria-hidden />
                Salir
              </Button>
            </div>

            <div role="tablist" aria-label="Secciones del catálogo" className="flex flex-wrap gap-2">
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
              {tab === "productos" ? <ProductsTab onExpired={loadSession} /> : null}
              {tab === "planes" ? <PlansTab onExpired={loadSession} /> : null}
              {tab === "articulos" ? <PostsTab onExpired={loadSession} /> : null}
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
          Acceso de administración
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Introduce la contraseña del panel para gestionar el catálogo.
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Contraseña</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>
          {error ? <FormError message={error} /> : null}
          <Button type="submit" className="w-full" disabled={busy || password.length === 0}>
            {busy ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/* --------------------------------- Helper --------------------------------- */

function useList<T>(url: string, key: string, onExpired: () => void) {
  const { status, data, reload } = useAsyncData<T[]>(async () => {
    const res = await fetch(url, { cache: "no-store" });
    if (res.status === 401) {
      onExpired();
      throw new Error("expired");
    }
    if (!res.ok) throw new Error(key);
    const json = (await res.json()) as Record<string, unknown>;
    return Array.isArray(json[key]) ? (json[key] as T[]) : [];
  }, [url, key, onExpired]);

  return { items: data ?? [], state: status, load: reload };
}

function RowActions({
  busy,
  onEdit,
  onToggle,
  onDelete,
  toggleLabel,
}: {
  busy: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  toggleLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={onEdit} disabled={busy}>
        <Pencil aria-hidden />
        Editar
      </Button>
      <Button size="sm" variant="outline" onClick={onToggle} disabled={busy}>
        <Power aria-hidden />
        {toggleLabel}
      </Button>
      <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete} disabled={busy}>
        <Trash2 aria-hidden />
        Eliminar
      </Button>
    </div>
  );
}

/* -------------------------------- Productos ------------------------------- */

function ProductsTab({ onExpired }: { onExpired: () => void }) {
  const { items: products, state, load } = useList<Product>("/api/admin/products", "products", onExpired);
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; item?: Product } | null>(null);
  const [busyId, setBusyId] = React.useState<number | null>(null);

  const toggleActive = async (product: Product) => {
    setBusyId(product.id);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !product.active }),
      });
      if (res.status === 401) {
        onExpired();
        return;
      }
      if (!res.ok) throw new Error("toggle");
      track("admin_action", { action: "product_toggle" });
      toast({ title: "Guardado" });
      load();
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar el producto.", variant: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (product: Product) => {
    setBusyId(product.id);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      if (res.status === 401) {
        onExpired();
        return;
      }
      if (!res.ok) throw new Error("delete");
      const data = (await res.json()) as { soft?: boolean };
      track("admin_action", { action: "product_delete" });
      toast({
        title: "Guardado",
        description: data.soft ? "Producto desactivado (borrado suave)." : "Producto eliminado.",
      });
      load();
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el producto.", variant: "error" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{products.length} producto(s) en catálogo.</p>
        <Button onClick={() => setDialog({ mode: "create" })}>
          <Plus aria-hidden />
          Nuevo producto
        </Button>
      </div>

      {state === "loading" ? (
        <LoadingState label="Cargando productos…" />
      ) : state === "error" ? (
        <ErrorState onRetry={load} />
      ) : products.length === 0 ? (
        <EmptyState
          title="Sin productos todavía."
          hint="Crea el primer producto con el botón «Nuevo producto»."
        />
      ) : (
        <>
          {/* Móvil: lista de cards */}
          <ul className="space-y-3 md:hidden">
            {products.map((product) => (
              <li key={product.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{product.title}</p>
                      <p className="font-mono text-xs text-muted-foreground">/{product.slug}</p>
                    </div>
                    <Badge variant={product.active ? "default" : "muted"}>
                      {product.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span>{CATEGORY_LABELS[product.category] ?? product.category}</span>
                    <span aria-hidden>·</span>
                    <span className="font-semibold text-primary">{formatPrice(product.priceCents)}</span>
                  </div>
                  <div className="mt-3">
                    <RowActions
                      busy={busyId === product.id}
                      onEdit={() => setDialog({ mode: "edit", item: product })}
                      onToggle={() => void toggleActive(product)}
                      onDelete={() => void remove(product)}
                      toggleLabel={product.active ? "Desactivar" : "Activar"}
                    />
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          {/* Escritorio: tabla */}
          <Card className="hidden md:block">
            <div className="max-h-[36rem] overflow-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Listado de productos</caption>
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th scope="col" className="px-4 py-3 font-medium">Título</th>
                    <th scope="col" className="px-4 py-3 font-medium">Slug</th>
                    <th scope="col" className="px-4 py-3 font-medium">Categoría</th>
                    <th scope="col" className="px-4 py-3 font-medium">Precio</th>
                    <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                    <th scope="col" className="px-4 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-medium">{product.title}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">/{product.slug}</td>
                      <td className="px-4 py-3">{CATEGORY_LABELS[product.category] ?? product.category}</td>
                      <td className="px-4 py-3 font-semibold text-primary">{formatPrice(product.priceCents)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={product.active ? "default" : "muted"}>
                          {product.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <RowActions
                          busy={busyId === product.id}
                          onEdit={() => setDialog({ mode: "edit", item: product })}
                          onToggle={() => void toggleActive(product)}
                          onDelete={() => void remove(product)}
                          toggleLabel={product.active ? "Desactivar" : "Activar"}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {dialog ? (
        <Dialog
          open
          onClose={() => setDialog(null)}
          title={dialog.mode === "create" ? "Nuevo producto" : "Editar producto"}
        >
          <ProductForm
            product={dialog.item ?? null}
            onClose={() => setDialog(null)}
            onSaved={async () => {
              setDialog(null);
              toast({ title: "Guardado" });
              load();
            }}
            onExpired={onExpired}
          />
        </Dialog>
      ) : null}
    </div>
  );
}

function ProductForm({
  product,
  onClose,
  onSaved,
  onExpired,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onExpired: () => void;
}) {
  const [title, setTitle] = React.useState(product?.title ?? "");
  const [slug, setSlug] = React.useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = React.useState(product !== null);
  const [description, setDescription] = React.useState(product?.description ?? "");
  const [category, setCategory] = React.useState<string>(product?.category ?? "programa");
  const [priceEuros, setPriceEuros] = React.useState(
    product ? (product.priceCents / 100).toFixed(2) : "",
  );
  const [fileName, setFileName] = React.useState(product?.fileName ?? "");
  const [active, setActive] = React.useState(product?.active ?? true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const handleTitle = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    const priceCents = eurosToCents(priceEuros);
    if (priceCents === null) {
      setError("Introduce un precio válido en euros (ej. 19,99).");
      return;
    }
    if (!slug.trim()) {
      setError("El slug es obligatorio.");
      return;
    }

    const payload = {
      slug: slug.trim(),
      title: title.trim(),
      description: description.trim(),
      category,
      priceCents,
      fileName: fileName.trim() || null,
      active,
    };

    setBusy(true);
    try {
      const res = await fetch(
        product ? `/api/admin/products/${product.id}` : "/api/admin/products",
        {
          method: product ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (res.status === 401) {
        onExpired();
        return;
      }
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      track("admin_action", { action: product ? "product_update" : "product_create" });
      await onSaved();
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="product-title">Título</Label>
        <Input
          id="product-title"
          value={title}
          onChange={(e) => handleTitle(e.target.value)}
          required
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="product-slug">Slug</Label>
        <Input
          id="product-slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          required
          maxLength={80}
          placeholder="se genera solo desde el título"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="product-description">Descripción</Label>
        <Textarea
          id="product-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          maxLength={2000}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="product-category">Categoría</Label>
          <Select id="product-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-price">Precio (€)</Label>
          <Input
            id="product-price"
            type="text"
            inputMode="decimal"
            value={priceEuros}
            onChange={(e) => setPriceEuros(e.target.value)}
            required
            placeholder="19,99"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="product-filename">Nombre de archivo (opcional)</Label>
        <Input
          id="product-filename"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          maxLength={200}
          placeholder="guia-entrenamiento.pdf"
        />
      </div>

      <Toggle checked={active} onChange={setActive} label="Producto activo" />

      {error ? <FormError message={error} /> : null}

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

/* ---------------------------------- Planes -------------------------------- */

function PlansTab({ onExpired }: { onExpired: () => void }) {
  const { items: plans, state, load } = useList<Plan>("/api/admin/plans", "plans", onExpired);
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; item?: Plan } | null>(null);
  const [busyId, setBusyId] = React.useState<number | null>(null);

  const toggleActive = async (plan: Plan) => {
    setBusyId(plan.id);
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !plan.active }),
      });
      if (res.status === 401) {
        onExpired();
        return;
      }
      if (!res.ok) throw new Error("toggle");
      track("admin_action", { action: "plan_toggle" });
      toast({ title: "Guardado" });
      load();
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar el plan.", variant: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (plan: Plan) => {
    setBusyId(plan.id);
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, { method: "DELETE" });
      if (res.status === 401) {
        onExpired();
        return;
      }
      if (!res.ok) throw new Error("delete");
      const data = (await res.json()) as { soft?: boolean };
      track("admin_action", { action: "plan_delete" });
      toast({
        title: "Guardado",
        description: data.soft ? "Plan desactivado (borrado suave)." : "Plan eliminado.",
      });
      load();
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el plan.", variant: "error" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{plans.length} plan(es) en catálogo.</p>
        <Button onClick={() => setDialog({ mode: "create" })}>
          <Plus aria-hidden />
          Nuevo plan
        </Button>
      </div>

      {state === "loading" ? (
        <LoadingState label="Cargando planes…" />
      ) : state === "error" ? (
        <ErrorState onRetry={load} />
      ) : plans.length === 0 ? (
        <EmptyState title="Sin planes todavía." hint="Crea el primer plan con el botón «Nuevo plan»." />
      ) : (
        <>
          {/* Móvil: lista de cards */}
          <ul className="space-y-3 md:hidden">
            {plans.map((plan) => (
              <li key={plan.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{plan.title}</p>
                      <p className="font-mono text-xs text-muted-foreground">/{plan.slug}</p>
                    </div>
                    <Badge variant={plan.active ? "default" : "muted"}>
                      {plan.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span>{LEVEL_LABELS[plan.level] ?? plan.level}</span>
                    <span aria-hidden>·</span>
                    <span>{plan.weeks} semanas</span>
                    {plan.priceCents !== null ? (
                      <>
                        <span aria-hidden>·</span>
                        <span className="font-semibold text-primary">{formatPrice(plan.priceCents)}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    <RowActions
                      busy={busyId === plan.id}
                      onEdit={() => setDialog({ mode: "edit", item: plan })}
                      onToggle={() => void toggleActive(plan)}
                      onDelete={() => void remove(plan)}
                      toggleLabel={plan.active ? "Desactivar" : "Activar"}
                    />
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          {/* Escritorio: tabla */}
          <Card className="hidden md:block">
            <div className="max-h-[36rem] overflow-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Listado de planes</caption>
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th scope="col" className="px-4 py-3 font-medium">Título</th>
                    <th scope="col" className="px-4 py-3 font-medium">Slug</th>
                    <th scope="col" className="px-4 py-3 font-medium">Nivel</th>
                    <th scope="col" className="px-4 py-3 font-medium">Semanas</th>
                    <th scope="col" className="px-4 py-3 font-medium">Precio</th>
                    <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                    <th scope="col" className="px-4 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-medium">{plan.title}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">/{plan.slug}</td>
                      <td className="px-4 py-3">{LEVEL_LABELS[plan.level] ?? plan.level}</td>
                      <td className="px-4 py-3">{plan.weeks}</td>
                      <td className="px-4 py-3 font-semibold text-primary">
                        {plan.priceCents !== null ? formatPrice(plan.priceCents) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={plan.active ? "default" : "muted"}>
                          {plan.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <RowActions
                          busy={busyId === plan.id}
                          onEdit={() => setDialog({ mode: "edit", item: plan })}
                          onToggle={() => void toggleActive(plan)}
                          onDelete={() => void remove(plan)}
                          toggleLabel={plan.active ? "Desactivar" : "Activar"}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {dialog ? (
        <Dialog
          open
          onClose={() => setDialog(null)}
          title={dialog.mode === "create" ? "Nuevo plan" : "Editar plan"}
        >
          <PlanForm
            plan={dialog.item ?? null}
            onClose={() => setDialog(null)}
            onSaved={async () => {
              setDialog(null);
              toast({ title: "Guardado" });
              load();
            }}
            onExpired={onExpired}
          />
        </Dialog>
      ) : null}
    </div>
  );
}

function PlanForm({
  plan,
  onClose,
  onSaved,
  onExpired,
}: {
  plan: Plan | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onExpired: () => void;
}) {
  const [title, setTitle] = React.useState(plan?.title ?? "");
  const [slug, setSlug] = React.useState(plan?.slug ?? "");
  const [slugTouched, setSlugTouched] = React.useState(plan !== null);
  const [level, setLevel] = React.useState<string>(plan?.level ?? "iniciacion");
  const [weeks, setWeeks] = React.useState(plan ? String(plan.weeks) : "8");
  const [summary, setSummary] = React.useState(plan?.summary ?? "");
  const [priceEuros, setPriceEuros] = React.useState(
    plan?.priceCents != null ? (plan.priceCents / 100).toFixed(2) : "",
  );
  const [active, setActive] = React.useState(plan?.active ?? true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const handleTitle = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    const weeksNum = Number.parseInt(weeks, 10);
    if (!Number.isInteger(weeksNum) || weeksNum < 1 || weeksNum > 52) {
      setError("Las semanas deben ser un número entre 1 y 52.");
      return;
    }
    if (!slug.trim()) {
      setError("El slug es obligatorio.");
      return;
    }

    const priceCents = priceEuros.trim() ? eurosToCents(priceEuros) : null;
    if (priceEuros.trim() && priceCents === null) {
      setError("Introduce un precio válido en euros (ej. 49).");
      return;
    }

    const payload = {
      slug: slug.trim(),
      title: title.trim(),
      level,
      weeks: weeksNum,
      summary: summary.trim(),
      priceCents,
      active,
    };

    setBusy(true);
    try {
      const res = await fetch(plan ? `/api/admin/plans/${plan.id}` : "/api/admin/plans", {
        method: plan ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        onExpired();
        return;
      }
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      track("admin_action", { action: plan ? "plan_update" : "plan_create" });
      await onSaved();
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="plan-title">Título</Label>
        <Input
          id="plan-title"
          value={title}
          onChange={(e) => handleTitle(e.target.value)}
          required
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="plan-slug">Slug</Label>
        <Input
          id="plan-slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          required
          maxLength={80}
          placeholder="se genera solo desde el título"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="plan-level">Nivel</Label>
          <Select id="plan-level" value={level} onChange={(e) => setLevel(e.target.value)}>
            {PLAN_LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABELS[l]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-weeks">Semanas</Label>
          <Input
            id="plan-weeks"
            type="number"
            min={1}
            max={52}
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan-price">Precio (€, opcional)</Label>
          <Input
            id="plan-price"
            type="text"
            inputMode="decimal"
            value={priceEuros}
            onChange={(e) => setPriceEuros(e.target.value)}
            placeholder="49"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="plan-summary">Resumen</Label>
        <Textarea
          id="plan-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          required
          maxLength={2000}
        />
      </div>

      <Toggle checked={active} onChange={setActive} label="Plan activo" />

      {error ? <FormError message={error} /> : null}

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

/* -------------------------------- Artículos ------------------------------- */

function PostsTab({ onExpired }: { onExpired: () => void }) {
  const { items: posts, state, load } = useList<Post>("/api/admin/posts", "posts", onExpired);
  const [dialog, setDialog] = React.useState<{ mode: "create" | "edit"; item?: Post } | null>(null);
  const [busyId, setBusyId] = React.useState<number | null>(null);

  const togglePublished = async (post: Post) => {
    setBusyId(post.id);
    try {
      const res = await fetch(`/api/admin/posts/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !post.published }),
      });
      if (res.status === 401) {
        onExpired();
        return;
      }
      if (!res.ok) throw new Error("toggle");
      track("admin_action", { action: "post_toggle" });
      toast({ title: "Guardado" });
      load();
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar el artículo.", variant: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (post: Post) => {
    setBusyId(post.id);
    try {
      const res = await fetch(`/api/admin/posts/${post.id}`, { method: "DELETE" });
      if (res.status === 401) {
        onExpired();
        return;
      }
      if (!res.ok) throw new Error("delete");
      const data = (await res.json()) as { soft?: boolean };
      track("admin_action", { action: "post_delete" });
      toast({
        title: "Guardado",
        description: data.soft ? "Artículo despublicado (borrado suave)." : "Artículo eliminado.",
      });
      load();
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el artículo.", variant: "error" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{posts.length} artículo(s) en total.</p>
        <Button onClick={() => setDialog({ mode: "create" })}>
          <Plus aria-hidden />
          Nuevo artículo
        </Button>
      </div>

      {state === "loading" ? (
        <LoadingState label="Cargando artículos…" />
      ) : state === "error" ? (
        <ErrorState onRetry={load} />
      ) : posts.length === 0 ? (
        <EmptyState title="Sin artículos todavía." hint="Crea el primer artículo del blog." />
      ) : (
        <>
          {/* Móvil: lista de cards */}
          <ul className="space-y-3 md:hidden">
            {posts.map((post) => (
              <li key={post.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{post.title}</p>
                      <p className="font-mono text-xs text-muted-foreground">/{post.slug}</p>
                    </div>
                    <Badge variant={post.published ? "default" : "muted"}>
                      {post.published ? "Publicado" : "Borrador"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(post.createdAt)}</p>
                  <div className="mt-3">
                    <RowActions
                      busy={busyId === post.id}
                      onEdit={() => setDialog({ mode: "edit", item: post })}
                      onToggle={() => void togglePublished(post)}
                      onDelete={() => void remove(post)}
                      toggleLabel={post.published ? "Despublicar" : "Publicar"}
                    />
                  </div>
                </Card>
              </li>
            ))}
          </ul>

          {/* Escritorio: tabla */}
          <Card className="hidden md:block">
            <div className="max-h-[36rem] overflow-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Listado de artículos</caption>
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th scope="col" className="px-4 py-3 font-medium">Título</th>
                    <th scope="col" className="px-4 py-3 font-medium">Slug</th>
                    <th scope="col" className="px-4 py-3 font-medium">Categoría</th>
                    <th scope="col" className="px-4 py-3 font-medium">Fecha</th>
                    <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                    <th scope="col" className="px-4 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-medium">{post.title}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">/{post.slug}</td>
                      <td className="px-4 py-3">{post.category}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(post.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={post.published ? "default" : "muted"}>
                          {post.published ? "Publicado" : "Borrador"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <RowActions
                          busy={busyId === post.id}
                          onEdit={() => setDialog({ mode: "edit", item: post })}
                          onToggle={() => void togglePublished(post)}
                          onDelete={() => void remove(post)}
                          toggleLabel={post.published ? "Despublicar" : "Publicar"}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {dialog ? (
        <Dialog
          open
          onClose={() => setDialog(null)}
          title={dialog.mode === "create" ? "Nuevo artículo" : "Editar artículo"}
          className="max-w-2xl"
        >
          <PostForm
            post={dialog.item ?? null}
            onClose={() => setDialog(null)}
            onSaved={async () => {
              setDialog(null);
              toast({ title: "Guardado" });
              load();
            }}
            onExpired={onExpired}
          />
        </Dialog>
      ) : null}
    </div>
  );
}

function PostForm({
  post,
  onClose,
  onSaved,
  onExpired,
}: {
  post: Post | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onExpired: () => void;
}) {
  const [title, setTitle] = React.useState(post?.title ?? "");
  const [slug, setSlug] = React.useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = React.useState(post !== null);
  const [excerpt, setExcerpt] = React.useState(post?.excerpt ?? "");
  const [body, setBody] = React.useState(post?.body ?? "");
  const [category, setCategory] = React.useState(post?.category ?? "general");
  const [published, setPublished] = React.useState(post?.published ?? true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const handleTitle = (value: string) => {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    if (!slug.trim()) {
      setError("El slug es obligatorio.");
      return;
    }
    if (!category.trim()) {
      setError("La categoría es obligatoria.");
      return;
    }

    const payload = {
      slug: slug.trim(),
      title: title.trim(),
      excerpt: excerpt.trim(),
      body: body.trim(),
      category: category.trim(),
      published,
    };

    setBusy(true);
    try {
      const res = await fetch(post ? `/api/admin/posts/${post.id}` : "/api/admin/posts", {
        method: post ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        onExpired();
        return;
      }
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      track("admin_action", { action: post ? "post_update" : "post_create" });
      await onSaved();
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="post-title">Título</Label>
        <Input
          id="post-title"
          value={title}
          onChange={(e) => handleTitle(e.target.value)}
          required
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="post-slug">Slug</Label>
        <Input
          id="post-slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          required
          maxLength={80}
          placeholder="se genera solo desde el título"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="post-excerpt">Extracto</Label>
        <Textarea
          id="post-excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          required
          maxLength={300}
          className="min-h-16"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="post-body">Cuerpo del artículo</Label>
        <Textarea
          id="post-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={20000}
          className="min-h-56"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="post-category">Categoría</Label>
          <Input
            id="post-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            maxLength={40}
            placeholder="entrenamiento, nutrición…"
          />
        </div>
        <div className="space-y-2 sm:pt-7">
          <Toggle checked={published} onChange={setPublished} label="Artículo publicado" />
        </div>
      </div>

      {error ? <FormError message={error} /> : null}

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
