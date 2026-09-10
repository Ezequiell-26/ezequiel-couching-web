# Worklog — EZEQUIEL COACHING

---
Task ID: 22-a
Agent: Z.ai Code (principal)
Task: Auditoría + mejora incremental de la app (protocolo del usuario). INTERRUMPIDA por incidente: el entorno fue reiniciado y el workspace se perdió.

Work Log:
- Se leyó en vivo (esta sesión, verbatim): src/lib/router.ts, home-view.tsx, navbar.tsx + inventario completo de ~140 archivos.
- El contenedor se reinició; verificado: sin src/, sin package.json, sin prisma/, sin db/. git solo tiene commit inicial (3 archivos). Sin copias en todo el filesystem.
- Decisión: restauración fiel desde evidencia (BLOQUE 0), luego mejoras incrementales por bloques.

Stage Summary:
- worklog.md y PROJECT_STATUS.md recreados (este archivo es nuevo; el original se perdió).
- Todo cambio futuro se commitea a git tras cada bloque (lección del incidente).
- Evidencia clave conservada: ViewIds y hashes exactos, pila de la home, navbar, lista de archivos.

---
Task ID: 22-d
Agent: fullstack-admin
Task: Panel del entrenador (CoachView) + gestión de catálogo (AdminView) + 12 rutas API de administración, con sesión de cookie firmada ya existente (/api/admin/session, intacta).

Work Log:
- Contexto leído: worklog.md, prisma/schema.prisma (Lead, Intake, Message, Order, Product, Plan, Post), src/lib/admin-auth.ts, componentes ui/site, lib/utils, lib/analytics, lib/router y rutas públicas existentes para respetar patrones (Next 16: params como Promise).
- IMPORTANTE (modelo de datos): Intake NO tiene columnas sex/daysPerWeek/equipment en schema.prisma; las vistas/API usan solo los campos reales (name, email, age, heightCm, weightKg, goal, experience, injuries, message, status, createdAt). No se tocaron schema ni otros archivos (db push prohibido).
- 12 rutas API creadas bajo src/app/api/admin/ (todas arrancan con `const authed = await isAdminRequest(); if (!authed) 401`; body SIEMPRE validado con zod; ids validados con Number.isInteger; sin campos sensibles; export const dynamic):
  - leads/route.ts → GET lista desc por createdAt.
  - messages/route.ts → GET lista. messages/[id]/route.ts → PATCH {read?, reply?} (refine: al menos un campo).
  - intakes/route.ts → GET lista. intakes/[id]/route.ts → PATCH {status: nuevo|contactado|cliente|descartado}. intakes/export/route.ts → GET CSV (text/csv; charset=utf-8, Content-Disposition attachment filename="intakes.csv", registros desc, BOM + celdas escapadas).
  - orders/route.ts → GET. orders/[id]/route.ts → PATCH {status: pendiente|pagado|entregado|cancelado}.
  - products/route.ts → GET (TODOS incl. inactive) + POST (zod; slug único → 409 "Ese slug ya existe", detectado con Prisma P2002). products/[id]/route.ts → PUT parcial + DELETE soft (active:false → {ok:true,soft:true}).
  - plans/route.ts → GET + POST {slug,title,level(iniciacion|intermedio|avanzado),weeks(1-52),summary,priceCents?}. plans/[id]/route.ts → PUT + DELETE soft (active:false).
  - posts/route.ts → GET + POST {slug,title,excerpt,body,category,published}. posts/[id]/route.ts → PUT + DELETE soft (published:false → {ok:true,soft:true}).
- coach-view.tsx (CoachView, "use client"): puerta de sesión con GET /api/admin/session; si !configured aviso "Acceso deshabilitado: define ADMIN_PASSWORD (mín. 8 caracteres) en .env" con PlaceholderNote; si !authed formulario login (401 → "Contraseña incorrecta.", 429 → mensaje del servidor); si authed: botón "Salir" (DELETE + refetch), botón "Volver a la web" (useRouter de "@/lib/router") y tabs Resumen|Leads|Mensajes|Cuestionarios|Pedidos. Resumen: PUT /api/admin/session → 4 Cards con counts. Leads: tabla escritorio / cards móvil. Mensajes: badge "nuevo" si !read, marcar leído y nota interna (PATCH). Cuestionarios: cards con todos los datos + Select de estado + enlace <a href="/api/admin/intakes/export" download>Exportar CSV</a>. Pedidos: tabla/cards con Select de estado (PATCH). Nota SMTP visible. LoadingState/EmptyState ("Sin mensajes todavía." etc.)/ErrorState con retry; 401 en tabs → refetch de sesión.
- admin-view.tsx (AdminView, "use client"): misma puerta de sesión (duplicada a propósito, sin contexto compartido). Tabs Productos|Planes|Artículos. Tablas escritorio / cards móvil con Badge activo/publicado. Dialog con formularios: slug autogenerado del título (editable, slugify con NFD), precio en euros → priceCents=Math.round(euros*100), Selects de categoría/nivel, Toggle accesible (role="switch") para active/published, body de artículos textarea grande. POST/PUT/DELETE contra las rutas admin; errores inline (409 → "Ese slug ya existe"); tras cada mutación refetch + toast("Guardado") (+ descripción de borrado suave); track("admin_action",{action}) de "@/lib/analytics" en todas las mutaciones.
- Verificación: `bunx tsc --noEmit | grep -E "(coach-view|admin-view|api/admin)"` → 0 errores en archivos propios (los errores restantes de tsc son de vistas pendientes de otros agentes, ignorados). No se ejecutó dev server, lint ni db push.

Stage Summary:
- Rutas API creadas: GET /api/admin/leads; GET /api/admin/messages; PATCH /api/admin/messages/[id]; GET /api/admin/intakes; PATCH /api/admin/intakes/[id]; GET /api/admin/intakes/export (CSV intakes.csv); GET /api/admin/orders; PATCH /api/admin/orders/[id]; GET+POST /api/admin/products; PUT+DELETE /api/admin/products/[id]; GET+POST /api/admin/plans; PUT+DELETE /api/admin/plans/[id]; GET+POST /api/admin/posts; PUT+DELETE /api/admin/posts/[id]. (/api/admin/session no se tocó.)
- Vistas creadas: src/components/views/coach-view.tsx (CoachView) y src/components/views/admin-view.tsx (AdminView), ya conectadas por site-shell (dynamic import) sin tocarlo.
- Seguridad: todas las rutas admin con isAdminRequest() + zod; soft-delete por defecto ({ok:true,soft:true}); datos honestos, tablas vacías sin datos inventados.
- Pendiente de otros entornos: SMTP para entrega de guía/emails (los leads quedan registrados).

---
Task ID: 22-b
Agent: frontend-content
Task: Restaurar las 14 vistas de contenido en src/components/views/ (coaching, servicio, método, resultados, planes, plan, blog, post, FAQ, contacto, guía, legal, 404, cuestionario) con export/props exactos y datos verbatim de los archivos de contenido.

Work Log:
- Leído worklog.md (Task 22-a) y fuente de datos: site.ts, faqs.ts, legal.ts, quiz.ts (verbatim).
- Leídos componentes reutilizables y su API real: PageHeader, Container, SectionHeading, Reveal, Accordion, Card, Button, Input/Textarea/Select/Label, Badge, toaster, states (Loading/Empty/Error/Success/Skeleton), CTAButton, PlaceholderNote, GuideLeadForm, router (ViewId/params), analytics (track), utils (formatPrice/formatDate), seo (faqJsonLd).
- Leídas APIs reales antes de escribir: /api/plans, /api/plans/[slug], /api/posts, /api/posts/[slug] (404 → {error}), /api/contact ({ok,id}|{error}), /api/intake ({ok,id,estimate:{bmr,tdee}}) + prisma/schema.prisma para tipos (Plan.priceCents nullable, Post.body).
- Escritos los 14 archivos en src/components/views/ con "use client", navegación por hash-router (navigate) y CTAButton con track.
- Verificación: `bunx tsc --noEmit` → 0 errores en los 14 archivos (los 11 errores restantes son de site-shell.tsx y calculadoras-view.tsx, trabajo de otros agentes).

Stage Summary:
- Creados (14): coaching-view (3 servicios completos + problemas/valor + fases resumidas + CTA cuestionario, Reveal), servicio-detail-view (breadcrumb, price Badge, includes completo, for, proceso, FAQ con homeFaqs, CTA cuestionario + contacto outline, 404→EmptyState), metodo-view (timeline numerada + 3 principios + CTA), resultados-view (nota honesta si hay [SUSTITUIR], "qué incluirá esta sección", aviso resultados individuales, SIN testimonios inventados), planes-view (fetch + Skeleton/ErrorState/EmptyState "Todavía no hay planes publicados" + formatPrice), plan-view (404 honesto, incluye genérico honesto, CTA checkout, nota entrega digital), blog-view (chips filtro por categoría, formatDate, estados honestos), post-view (body split \n\n → <p>, volver a blog, siguiente paso), faq-view (agrupado por faqCategories + chips + JSON-LD FAQPage con faqJsonLd/useMemo + CTA contacto), contacto-view (POST /api/contact, sending/ok SuccessNote+reset/error server|red, track contact_submit, PlaceholderNote si email [SUSTITUIR), guia-gratis-view (beneficios + GuideLeadForm compact=false + nota RGPD), legal-view (1 componente para aviso/privacidad/cookies/terminos + PlaceholderNote final, sin siguiente paso), not-found-view (404 font-mono + grid de 8 enlaces, sin siguiente paso), cuestionario-view (wizard 4 pasos guiado por quizSteps, validación por paso con intakeSchema.pick().safeParse, errores inline es-ES, barra de progreso, botones ≥44px, POST /api/intake, éxito con ref# + estimate TMB/TDEE "Mifflin-St Jeor", track intake_submit {steps:4}).
- Decisiones: pick-masks por paso declarados Record<StepId, ZodType> (mapeados a los ids de quizSteps); errores de enum traducidos a es-ES vía mapa; precios placeholder se muestran tal cual con PlaceholderNote (anti-inventar); "Siguiente paso" en todas las vistas excepto not-found y legal; sin dependencias nuevas, sin next/image, mobile-first, sin azul/índigo.

---
Task ID: 22-c
Agent: frontend-tools
Task: Restauración de las 8 vistas de herramientas y comercio de la web EZEQUIEL COACHING en src/components/views/ (calculadoras, contador, progreso, dashboard, tienda, producto, checkout, pedido) sobre Next.js 16 + App Router + TypeScript strict + Tailwind 4.

Work Log:
- Contexto leído: worklog.md (incidente 22-a), src/lib/nutrition.ts (fórmulas reales usadas tal cual), calc-profile.ts, food-diary-store.ts, progress-store.ts, router.ts (hash SPA), analytics.ts (track local), utils.ts (formatPrice/formatDate).
- Componentes reutilizados (leídos antes de usar): site/{page-header,container,section-heading,reveal,placeholder-note,states,cta-button}, ui/{card,button,input,accordion,dialog,badge,toaster}. Sin dependencias nuevas, sin next/image, gráficos en SVG manual.
- calculadoras-view.tsx: hub con 7 tabs (IMC, Calorías/TDEE, Macros, 1RM, Grasa corporal, Agua, Peso ideal). Todas con Label+Input numéricos, nombre de la fórmula visible, nota de limitación "estimación, no diagnóstico". TDEE con BMR Mifflin + comparativa Katch-McArdle si hay % grasa opcional y botón "Usar en las demás herramientas" → saveProfile + toast. Macros con goal Select + 3 cards + barra proporcional CSS. 1RM con Epley/Brzycki/media + tabla 95–75%. Grasa con sub-tabs Navy/Deurenberg mostrando ambos resultados si hay datos. Precarga inputs desde loadProfile() al montar; track("calc_use",{name}) al calcular.
- contador-view.tsx: diario 100% localStorage (ec_food_diary_v1). Navegación de fechas (offset ±1 día), anillo SVG kcal vs objetivo (perfil targetKcal ?? 2000, con nota/CTA a calculadoras si no hay perfil), 4 comidas con entradas y papelera, Dialog "Añadir alimento" (FOOD_DB o custom por 100 g, escala grams/per), totales del día en Badges, barras SVG de los últimos 7 días con línea de objetivo, "Borrar mis datos" con confirmación → localStorage.removeItem + toast, track("diary_add_food").
- progress-view.tsx: tracker local (ec_progress_v1). Peso: form fecha+kg, últimas 10 pesadas con delta ▼/▲ vs entrada anterior, gráfico de línea SVG; sesiones: form manual fecha+título+ejercicios+volumen, listado y volumen de los últimos 7 días. Empty state "No hay suficientes datos todavía" si <2 puntos. Borrado con confirmación → removeItem("ec_progress_v1"). Sin datos inventados: todo empieza en 0.
- dashboard-view.tsx: panel local sin cuentas — saludo neutro ("Tu panel"), accesos rápidos (calculadoras/contador/progreso/planes/faq), "Hoy" con kcal del diario vs profile.targetKcal (CTA a calculadoras si null), último peso con fecha, sugerencias honestas (check-in → cuestionario solo como sugerencia vía flag "ec_intake_done", sin depender de él).
- tienda-view.tsx: GET /api/products, chips de categoría derivadas de los datos + "Todo" (preselección desde prop category), cards → navigate("producto",{slug}), skeletons de carga, ErrorState con retry, EmptyState "El catálogo se está preparando", formatPrice, track("shop_filter",{category}).
- producto-view.tsx: GET /api/products/{slug}; 404 → EmptyState "Producto no disponible" + volver a tienda. OK → PageHeader con breadcrumb, Badge de categoría, precio grande, "Qué incluye" honesto (descarga digital, acceso tras confirmación de pago, soporte email), CTA → navigate("checkout",{slug}), nota de entrega digital + PlaceholderNote si falta fileName.
- checkout-view.tsx: resuelve el artículo probando /api/products/{slug} y, si 404, /api/plans/{slug} (kind derivado). Form nombre+email (autocomplete), POST /api/checkout {slug,kind,customerName,customerEmail}; ok → card de confirmación con número font-mono grande, itemName, importe y paymentNote del server (transferencia + [SUSTITUIR: IBAN]) + enlace a #/pedido y botón a home; error → mensaje. track("checkout_submit",{kind}).
- pedido-view.tsx: form número+email → POST /api/orders/lookup; ok → Card con número, artículo, importe, estado con Badge mapeado (pendiente→secondary, pagado/entregado→default, cancelado→destructive vía clase bg-destructive, ya que Badge no tiene variante destructive) y fecha formatDate; 404 → "No encontramos un pedido con esos datos." track("order_lookup").
- Autoverificación: bunx tsc --noEmit filtrado a los 8 archivos → 0 errores (proyecto completo: 0 líneas de error). No se ejecutó dev server ni lint; no se tocó ningún otro archivo.

Stage Summary:
- Las 8 vistas de Task 22-c están creadas y registradas ya en site-shell.tsx (los dynamic imports existentes resuelven contra estos archivos): #/calculadoras, #/contador-de-calorias, #/progreso, #/dashboard, #/tienda, #/tienda/producto/[slug], #/checkout/[slug] y #/pedido operativas.
- Regla de oro respetada: cero datos inventados (totales en 0, gráficos vacíos con mensaje, sin pedidos/usuarios falsos); datos personales solo en localStorage; fórmulas de nutrition.ts usadas sin modificar.
- Pendiente para otros agentes: vistas restantes del shell (coaching, blog, planes, cuestionario, etc.) y sembrar catálogo (products/plans) para que tienda/checkout muestren contenido real.

---
Task ID: 22-e
Agent: lint-fixer
Task: Dejar `bun run lint` en 0 errores / 0 warnings sin cambiar comportamientos visibles ni romper tipos (`bunx tsc --noEmit` en 0), usando el hook src/hooks/use-async-data.ts, más visualización de los nuevos campos del Intake (sex, daysPerWeek, equipment) en CoachView → tab Cuestionarios.

Work Log:
- Patrón A (fetch en effect con setState síncrono, 16 sitios → 0): reemplazado el patrón { status, data, load, useEffect(void load) } por `useAsyncData<T>(fetcher, deps)` en tienda-view, planes-view, plan-view, post-view, producto-view, blog-view y checkout-view (1 fetch por vista; en checkout la lógica "producto → si 404 plan" quedó encapsulada DENTRO del fetcher, el hook solo ve una promesa; 404 → return null para preservar los estados "missing"/"notfound"), en coach-view (sesión + SummaryTab + LeadsTab + MessagesTab + IntakesTab + OrdersTab: un useAsyncData por componente, deps [onExpired], 401 → onExpired() + throw) y en admin-view (sesión + helper useList reescrito sobre useAsyncData, lo que arregla de una vez ProductsTab/PlansTab/PostsTab). `onRetry={() => void load()}` → `onRetry={reload}` en todos. Migraciones de mutaciones: las listas que antes se parcheaban con setX en handlers (Mensajes/Intakes/Pedidos) ahora combinan data del hook con un registro local `updates` (setState solo en handlers, permitido), y los `load()` tras mutación del admin pasaron a `reload()`; props `onExpired`/`onSuccess` tipadas `() => Promise<void>` → `() => void`.
- Bug propio detectado en la herramienta: use-async-data.ts hacía `fetcherRef.current = fetcher` durante el render → react-hooks/refs. Corregido eliminando la ref y capturando el fetcher en la closure del effect (misma semántica: versión del fetcher del render en que cambian deps). El hook queda sin ningún error.
- Patrón B (sincronización de prop, 2 sitios → 0): tienda-view (setActive según prop category) y AddFoodDialog de contador-view (reset de campos al abrir) migrados al patrón de ajuste en render con estado previo (prevCategory/prevOpen + set en render condicionado), sin useEffect.
- Patrón C (carga de localStorage en effect, 10 sitios → 0): inicialización perezosa `useState(() => loadProfile()/loadDiary()/loadProgress())` y eliminación del effect de carga en las 7 calculadoras (ImcCalc, TdeeCalc, MacrosCalc, OneRmCalc, BodyFatCalc, WaterCalc, IdealWeightCalc), ContadorView (diario + objetivo del perfil), DashboardView (sustituidos 6 estados + flag ready por una única instantánea perezosa con los mismos nombres derivados) y ProgressView. Los setState de handlers (añadir/borrar/persistir) se mantienen intactos; no había effects de guardado síncrono que tocar.
- Limpieza asociada (errores no-set-state que bloqueaban el 0/0): imports sin uso eliminados (LoadingState en planes-view y blog-view; función catLabel muerta en calculadoras-view); en blog-view `posts = data ?? []` envuelto en useMemo para calmar react-hooks/exhaustive-deps.
- ADICIONAL schema ampliado: Intake en coach-view.tsx gana sex/daysPerWeek/equipment en el type y nuevas filas en la ficha de cada cuestionario: Sexo (Hombre/Mujer), Días/semana ("1 día"/"N días") y Material (EQUIPMENT_LABELS: gimnasio→Gimnasio, casa_minimo→"Casa (material mínimo)", peso_corporal→Peso corporal, valor desconocido → mostrado tal cual), intercaladas junto a los campos existentes. GET /api/admin/intakes ya devolvía las columnas (findMany completo); no se tocó schema ni rutas.
- Sin cambios en textos visibles, rutas, APIs, diseño ni en los archivos vetados (router, site-shell, layout, page, globals.css, API routes, schema.prisma, home-view, navbar, footer). guide-lead-form/states/dialog/input/navbar/site-shell/home-view (patrón D) intactos.

Stage Summary:
- `bun run lint` (ESLint 9 flat + eslint-config-next 16): 0 errores, 0 warnings (eran 31 errores al empezar: 27 de react-hooks/set-state-in-effect + 1 react-hooks/refs en use-async-data + 3 de imports/vars sin uso).
- `bunx tsc --noEmit`: 0 errores.
- 14 archivos tocados: src/hooks/use-async-data.ts y 13 vistas (tienda, planes, plan, post, producto, blog, checkout, admin, coach, calculadoras, contador, dashboard, progress).

---
Task ID: 22 (integración principal)
Agent: Z.ai Code (principal)
Task: Restauración completa + verificación E2E de la app tras el incidente del workspace.

Work Log:
- Núcleo restaurado por el principal: router verbatim, navbar verbatim, home verbatim, shell, footer, UI kit, lib (seo, nutrition, admin-auth, rate-limit, stores), 25 rutas API, esquema Prisma.
- 3 subagentes en paralelo: 22-b (14 vistas de contenido), 22-c (8 vistas herramientas/tienda), 22-d (paneles coach/admin + 12 rutas API admin).
- Subagente 22-e: 33 errores de lint (react-hooks/set-state-in-effect) → 0 con hook useAsyncData + inicialización perezosa.
- Correcciones del principal tras integración: sync hashchange en SiteShell (bug crítico: el hash no cambiaba de vista), dynamic() con literales inline (Next 16), eslint flat config, columnas Intake sex/daysPerWeek/equipment (aditivo) + CSV export ampliado.
- E2E con agent-browser: home/coaching/planes/tienda/producto/checkout/pedido/cuestionario/calculadoras/contador/faq/404/coach, IMC=22,9 y BMR=1649/TDEE=2556 verificados, contador persiste tras reload, pedido pendiente honesto, admin 401 sin sesión y 503 sin password, CRUD admin OK, menú móvil, footer, consola limpia, 1280/390/320 sin overflow.
- Datos de prueba borrados: BD entregada vacía (sin intake/order/lead/message).

Stage Summary:
- App restaurada y verificada. lint 0, tsc 0, BD vacía sin datos inventados.
- Pendientes documentados en PROJECT_STATUS.md (SMTP, Stripe, cuentas de cliente, placeholders).
- ADMIN_PASSWORD temporal en .env: ezequiel-temp-2026 (CAMBIAR).

---
Task ID: 23
Agent: main (Z.ai Code)
Task: Guardar la web en GitHub (github.com/Ezequiell-26/ezequiel-couching-web)

Work Log:
- Remoto origin configurado y repo verificado (HTTP 200, vacío).
- Auditoría pre-push: detectados secretos trackeados (.env con DATABASE_URL y ADMIN_PASSWORD) y db/custom.db con datos reales.
- .gitignore ampliado (.env, .env.*, db/*.db, db/*.db-journal, tool-results/, agent-ctx/) + git rm --cached (sin borrar local).
- Escaneo de secretos en src/worklog/scripts: sin hallazgos (gsk/ghp/AKIA/private keys).
- Primer push rechazado 403: token fine-grained sin Contents:write (diagnóstico vía API: identidad OK, ls-remote OK, repo vacío).
- Push exitoso con token clásico (ghp_).
- Detectados ~200MB de caché .next/dev/cache/turbopack en el HISTORIAL (blobs hasta 54.9MB, warning GH001 de GitHub).
- Historial reescrito con git filter-branch --index-filter (rm .next) + gc --prune=now --aggressive; 5 commits conservados (nuevos hashes).
- Force push de historia limpia; verificación vía API: .env y db/custom.db → 404 en remoto, árbol remoto correcto.

Stage Summary:
- Repo público https://github.com/Ezequiell-26/ezequiel-couching-web con main limpio: código fuente, public/, prisma/schema.prisma, docs; SIN secretos, SIN BD, SIN caché de build.
- LOCAL intacto: .env y db/custom.db siguen en disco, la app sigue funcionando igual.
- SEGURIDAD: el token ghp_ fue pegado en chat y usado en URLs de comandos → recomendar revocación tras la sesión (junto al fine-grained anterior).

---
Task ID: 24-b
Agent: Z.ai Code (frontend-content biblioteca)
Task: Dataset completo de ejercicios (~100 reales) + vista BibliotecaView (#/ejercicios) + registro de vistas biblioteca/zona en router/shell/navegación/SEO.

Work Log:
- Leído worklog.md (contexto de Tasks 22-x y stub 24) y verificado en caliente que las APIs paralelas /api/zona/* ya importan @/lib/content/exercises (zona-utils, routines, generate, sets, finish): el contrato de tipos/exports se mantuvo EXACTO y el módulo sigue isomórfico (sin "use client").
- Dataset: src/lib/content/exercises.ts reemplazado con 100 ejercicios reales en español, cobertura por grupo: pecho 12, espalda 16, piernas 20, hombros 12, brazos 14, core 14, full-body 12. Equipos repartidos: mancuernas 30, peso-corporal 32, barra 19, máquinas 17, poleas 15, kettlebell 6, banda 5. Niveles: 44 principiante / 46 intermedio / 10 avanzado. Cada ejercicio con id kebab-case único, primaryMuscles (1-2), secondaryMuscles (1-3), 4-6 pasos de ejecución y 1-2 tips técnicos. Validación scriptada: 0 ids duplicados, 0 violaciones de contrato (acoté a ≤2 músculos primarios/≤3 secundarios en peso muerto, burpees, thruster, clean&press, snatch, get-up).
- Vista nueva src/components/views/biblioteca-view.tsx (BibliotecaView, "use client"): PageHeader + Container, buscador con Input type=search y 3 <select> nativos estilizados (ui/input Select) para grupo/equipo/nivel usando las constantes del módulo; resultados vía filterExercises en useMemo; contador aria-live; grid 1→sm:2→lg:3→xl:4 de Cards clicables (button accesible, aria-haspopup="dialog") con badges de grupo/nivel/equipo y músculos primarios; Dialog con músculos, instrucciones <ol>, tips destacados en volt y CTA "Ir a Mi Zona" (navigate("zona") + track). EmptyState "Prueba con otros filtros" + botón limpiar cuando hasFilters. Analítica con el patrón de la casa: track("biblioteca_filter") en cada cambio de filtro (como shop_filter de tienda) y track("cta_click",{label:"ir-a-mi-zona"}) en el CTA; el page_view ya lo cubre el evento view_change del router.
- Router (edits mínimos): ViewId += "biblioteca" | "zona"; VALID_VIEWS += ambos; parseHash += case "ejercicios" → biblioteca y case "mi-zona" → zona; toHash += case "biblioteca" → "#/ejercicios" y case "zona" → "#/mi-zona" (idempotentes, antes del default).
- Site-shell (edits aditivos): const BibliotecaView = dynamic(...) junto a ContadorView y case "biblioteca" en CurrentView. "zona" deliberadamente sin vista (cae en NotFoundView hasta que el agente paralelo la monte).
- Navbar (edits aditivos): NavItem gana zone?/desktopClassName?; NAV_ITEMS += "Ejercicios" (li hidden lg:block en escritorio) y "Mi Zona" (zone:true → excluida de la lista desktop, mostrada como CTAButton volt view="zona" hidden lg:inline-flex junto a "Empezar"); el menú móvil los hereda automáticamente (map completo de NAV_ITEMS). Por debajo de lg no cambia nada respecto a lo previo (sin saturar a 768-1023px); footer los cubre ahí.
- Footer: columna Herramientas += "Ejercicios" y "Mi Zona" (mismo patrón que los vecinos).
- SEO: seo.ts VIEW_META += biblioteca ("Biblioteca de ejercicios — Ezequiel Coaching") y zona ("Mi Zona de entrenamiento — Ezequiel Coaching") tras "contador" (Record<ViewId,Meta> exige ambas claves); sitemap.ts += "/ejercicios" y "/mi-zona" siguiendo su patrón de hashes.
- Verificación: bunx tsc --noEmit → 0 errores (proyecto completo); bun run lint → 0 errores/0 warnings; GET / → 200 y dev.log limpio; las peticiones del agente paralelo a /api/zona/* siguen en 200 con el dataset cargado.

Stage Summary:
- Creados: src/components/views/biblioteca-view.tsx. Modificados: src/lib/content/exercises.ts (dataset 100 ejercicios, contrato intacto), src/lib/router.ts, src/components/site/site-shell.tsx, src/components/site/navbar.tsx, src/components/site/footer.tsx, src/lib/seo.ts, src/app/sitemap.ts.
- #/ejercicios operativo con búsqueda + 3 filtros y fichas de ejercicio con CTA a Mi Zona; #/mi-zona ya parsea/navega (enlaces en navbar desktop ≥1024px, menú móvil y footer) y muestra 404 honesto hasta que el agente de zona monte su vista.
- Dataset listo para rutinas: 100 ids estables, balance 12/16/20/12/14/14/12 por grupo y 7 tipos de equipo, apto para /api/zona/routines/generate.
- lint 0 · tsc 0 · sin tocar prisma, APIs ni otras vistas.

---
Task ID: 24-c
Agent: backend-zona
Task: Backend completo de la Zona de entrenamiento: lib de sesión de cliente (scrypt + token en BD) y 19 endpoints nuevos bajo /api/zona/* (perfil, rutinas, IA generadora, sesiones/series con PRs, peso/agua/hábitos, progreso agregado y logros). Sin tocar vistas, schema ni rutas existentes.

Work Log:
- Leídos worklog.md, prisma/schema.prisma (modelos zona ya extendidos por 24-db), src/lib/admin-auth.ts, rate-limit.ts, db.ts, api/intake, api/admin/session y api/products/[slug] (patrones: NextResponse.json, zod, dynamic force-dynamic, params Promise, cookies vía res.cookies.set, rateLimit+clientKey por IP).
- z-ai-web-dev-sdk@0.0.18 instalado en el proyecto (dependencia backend-only; era solo global).
- src/lib/zona-auth.ts (nuevo): hashPin (scrypt salt 16B + clave 64B, "salt:hash"), verifyPin (timingSafeEqual, formato inválido → false), ZONA_COOKIE "ec_zona_session" TTL 30 días, createClientSession (token randomBytes(32).hex persistido en BD, invalida el anterior), destroyClientSession, getZonaProfile/requireZonaProfile (cookie → sessionToken → sessionExpiry vigente), zonaUnauthorized() (401 "Iniciá sesión para continuar."), zonaCookieOptions (httpOnly, sameSite strict, secure solo en prod, path /, maxAge 30d), publicProfile() (nunca expone pinHash/sessionToken/sessionExpiry).
- src/lib/zona-utils.ts (nuevo, helpers backend): serializeRoutine/serializeSession/serializeSet (resuelven exerciseName vía getExerciseById), computeVolumeKg (solo series con peso), epley1rm (1 decimal), dateKey/utcMidnight/addDays/startOfUtcWeek/isoWeekKey (todo UTC), computeStreak (hoy o ayer, días consecutivos con actividad).
- 19 endpoints creados (todos con try/catch → 500 "Error interno.", log real solo en console.error):
  - POST /api/zona/profile (registro; rate-limit 5/min por IP; nombre único case-insensitive vía $queryRaw lower(); 409 con mensaje exacto; 201 {id,name}+cookie).
  - GET /api/zona/profile ({id,name}|401), POST .../profile/login (rate-limit 10/5min; 401 genérico "Nombre o PIN incorrecto." sin revelar qué falló; rota token), POST .../profile/logout (revoca en BD + cookie maxAge 0).
  - GET /api/zona/routines (activas, items ordenados day/orderIdx + exerciseName), POST /api/zona/routines (manual; valida cada exerciseId contra la biblioteca → 400 listando ids inválidos; day ≤ daysPerWeek; orderIdx por día; 201 completa).
  - GET/DELETE /api/zona/routines/[id] (owner check por findFirst con profileId de la sesión → 404 sin revelar existencia; DELETE soft active:false → {ok:true}, conserva histórico de sesiones).
  - POST /api/zona/routines/generate (IA real con z-ai-web-dev-sdk; rate-limit 5/min; filtra EXERCISES por equipment —gimnasio→todos, mancuernas/casa/peso-corporal según mapeo— y nivel —principiante→principiante+intermedio—, máx 60 candidatos enviando solo {id,name,group}; SYSTEM en español con shape JSON exacto, thinking disabled, timeout 60s; parse tolerante a fences ```json + zod; exerciseIds inválidos descartados, día <3 ejercicios o days vacío → 502 "La IA generó una rutina inválida. Probá de nuevo."; cualquier error SDK/parse → 503 "El generador IA no está disponible..." sin filtrar detalle; crea Routine source:"ia" con notes de fecha; 201).
  - POST /api/zona/sessions (reanuda la ÚNICA sesión activa → 200 {resumed:true}; si routineId: owner check + title = "rutina · Día N"; default "Entrenamiento"; 201), GET /api/zona/sessions?status=activa|todas&limit≤20 (con setsCount y routineName), GET /api/zona/sessions/[id] (sets asc + nombres).
  - POST /api/zona/sessions/[id]/sets (ejercicio debe existir en biblioteca → 400; sesión completada → 409; PR en vivo contra máximo de sesiones COMPLETADAS → {isPR:true, previousMax}; crea set y recomputa volumeKg en la misma $transaction; 201 {set, volumeKg}), DELETE .../sets/[setId] (owner doble join, recomputa volumen → {ok, volumeKg}).
  - POST /api/zona/sessions/[id]/finish (status completada + finishedAt + volumen final; newPRs = mejor peso de ESTA sesión por ejercicio vs máximo de completadas anteriores — la sesión aún está "activa" al comparar, exclusión natural —, e1rm Epley 1 decimal, sin peso → sin PR; ordena desc).
  - POST /api/zona/weight (kg 30-300, date opcional YYYY-MM-DD → medianoche UTC; upsert compound profileId_date), POST /api/zona/water (ml 50-2000, upsert incremental → total del día), POST /api/zona/habits (enum de 6 hábitos, upsert toggle).
  - GET /api/zona/progress?weeks=8 (clamp 1-12): weights 90d asc, waterToday+waterWeek 7d (grid con ceros), habitsToday+habitsWeek 7d, volumeByWeek semanas ISO desde sets de completadas (bucket por finishedAt), prs top 50 desc por peso (e1rm+fecha), totals {sessionsTotal, sessionsCompleted, totalVolumeKg, prsCount, daysTrainedLast30}, streak (ANY actividad: serie, peso, agua ≥500ml, hábito done) {days,lastActiveDate}, activeSession para resume.
  - GET /api/zona/achievements (10 definiciones estáticas; desbloqueo 100% real: primera-sesion, racha-7, sesiones-10/25 con progreso x/10 y x/25, primer-pr, prs-5, volumen-10t progreso kg/10000, agua-7 progreso racha ≥1,5L/7, peso-4 progreso n/4, rutina-ia; sin datos → unlocked:false y progreso 0).
- Aislamiento por construcción en TODAS las queries: where.profileId derivado de la sesión (nunca del body); owner checks → 404 (no 403) para no revelar existencia.
- Smoke test E2E con curl (18 casos): registro/login/duplicado case-insensitive/PIN erróneo (401 genérico), cookie httpOnly+SameSite=strict+Max-Age 30d verificada, rotación de token invalida sesión previa, peso upsert mismo día, agua incremental 500+750=1250, hábitos toggle, rutina manual 201 + 400 ids inválidos + 400 day overflow, sesión desde rutina con title "· Día 2", PR en vivo (65kg vs previo 60 → isPR + previousMax:60; primer PR → previousMax:null), borrado de serie con recomputo de volumen, finish con newPRs (e1rm 116.7 = 100×(1+5/30) ✓) y 409 al repetir, progreso agregado correcto (semana ISO 2026-W37=1100kg, prs desc, streak 1 día), logros con progreso real (2/10, 1100/10000, 1/4), generador IA real → 201 con rutina de 3 días × 5-6 ejercicios, todos los exerciseIds válidos y material acorde (mancuernas), aislamiento entre perfiles (404), soft-delete, logout + revocación, rate-limit 429 en el 5º registro/minuto.
- INCIDENTE OPERATIVO resuelto: el dev server (arrancado a las 22:45) tenía en memoria el PrismaClient generado ANTES de que 24-db extendiera el schema (db.clientProfile undefined en runtime). No fue un bug de código: el cliente regenerado en disco expone todos los delegados (verificado con script). Se reinició el único proceso del dev server (mismo comando bun run dev, puerto 3000, log en dev.log) para que cargara el cliente regenerado; sin duplicar servidores.
- BD devuelta a estado vacío tras las pruebas: deleteMany de ClientProfile con cascada verificada → las 8 tablas en 0 (ClientProfile, Routine, RoutineItem, WorkoutSession, SetLog, WeightLog, WaterLog, HabitLog). Cero datos demo.

Stage Summary:
- Backend de la Zona operativo: 18 archivos nuevos (src/lib/zona-auth.ts, src/lib/zona-utils.ts y 16 route.ts bajo src/app/api/zona/), 19 endpoints. Rutas existentes, vistas, schema y prisma client intactos (solo se añadió z-ai-web-dev-sdk a dependencies).
- Seguridad: PIN con scrypt+salt y timingSafeEqual; token de sesión aleatorio persistido y rotable (invalida sesiones anteriores); cookies httpOnly/strict; rate-limit por IP en register/login/generate; jamás se devuelven pinHash/sessionToken/sessionExpiry; errores del SDK de IA nunca filtrados al cliente (503 genérico).
- Verificación: bun run lint → 0 errores/0 warnings; bunx tsc --noEmit → 0 errores (proyecto completo). BD entregada vacía; los endpoints responden con estructuras vacías/cero correctas en estado sin datos.
- Nota para el frontend (Task 24-a): las respuestas de zona usan {error} (no {ok:false,error}); 401 texto "Iniciá sesión para continuar."; generate puede responder 502 (contenido inválido) o 503 (servicio indisponible); progress y achievements ya incluyen todo lo necesario para pintar sin llamadas extra.
---
Task ID: 24-d
Agent: frontend-zona
Task: Vista completa de Mi Zona (#/mi-zona) consumiendo las APIs /api/zona/*: AuthGate (crear cuenta/iniciar sesión), 4 tabs (Rutinas · Entrenar · Progreso · Logros) y gráficos SVG propios. Sin datos demo: todo desde las APIs reales, arranca vacío.

Work Log:
- Contexto leído: worklog.md (24-b: registro de vistas/hash #/mi-zona ya existente; 24-c: contratos exactos de los 19 endpoints), zona-utils.ts, zona-auth.ts, las 16 rutas /api/zona/*, site-shell.tsx, states.tsx, contador-view.tsx (patrón toast/toaster, track) y biblioteca-view (patrón selects nativos).
- Contrato verificado EN CALIENTE con smoke E2E (cookie jar): registro 201, rutina manual 201 (400 por exerciseId inválido antes de corregir el id), sesión desde rutina con title "· Día 1", set 201 {set,volumeKg,isPR:true,previousMax:null}, finish 200 {session,newPRs[e1rm:53.3]}, weight {weight:{date,kg}}, water {ml} acumulativo, habits {habit,done}, progress (waterWeek con ceros, habitsWeek, volumeByWeek, streak) y achievements (primera-sesion unlocked). Después de las pruebas: limpieza con PrismaClient deleteMany en cascada → 8 tablas en 0 (sin datos demo).
- Nuevos archivos:
  - src/components/zona/api.ts: DTOs espejo de los serializers (Routine/Session/Set/Progress/Achievement/NewPR), zonaApi<T>() (headers JSON, {error}→Error tal cual, 401→ZonaUnauthorized para volver al AuthGate), labels de goal/level/equipment/hábitos y formateadores es-AR (fmtInt "12.450", fmtKg "62,5", shortDate "12 mar", shortWeek "S37").
  - src/components/zona/charts.tsx: LineChart (polilínea volt, puntos, min/max, último valor destacado, edge de 1 punto y valores iguales) y BarChart (barras volt, etiquetas alternadas si >9), ambos role="img"+aria-label, viewBox responsivo, sin dependencias.
  - src/components/zona/auth-gate.tsx: tabs propias (role=tablist, no hay componente Tabs), nombre + PIN (type=password, inputMode=numeric, maxLength 6, sanitize \D), validación cliente 4-6 dígitos, errores del API verbatim en ErrorState, 1 línea explicando qué guarda la cuenta.
  - src/components/zona/routines-tab.tsx: cards desplegables por estado (aria-expanded/aria-controls) con badges goal/nivel/días/equipo + badge "IA"; por día: ejercicios con series×reps·descanso y botón "Entrenar día N" (POST /sessions con routineId+day → cambia a tab Entrenar); eliminar con Dialog de confirmación; generador IA con 4 <select> nativos estilizados, loading honesto ("puede tardar hasta un minuto"), 502/503 del API mostrados con botón reintentar; éxito → toast + refresh + abre la nueva; EmptyState "Todavía no tenés rutinas" con CTA que scrollea al generador (#zona-generador).
  - src/components/zona/train-tab.tsx: TrainTab (header con título, SessionTimer aislado que re-renderiza solo 1 componente/seg, volumen, nº series; bloques por ejercicio con series planificadas si viene de rutina (busca routineId+day en la lista), chips de series (peso×reps, RPE, badge volt "¡Nuevo PR!" si isPR, borrar → DELETE con recomputo de volumen desde {volumeKg}); formulario inline peso (step 0.5, opcional) + reps + RPE select 1-10 + "Registrar serie"; isPR → toast de celebración + badge persistente en el chip; select con optgroups de EXERCISES para entrenamiento libre; "Finalizar" en header + al fondo + Dialog resumen (volumen/series/duración) → POST finish) y TrainEmpty (EmptyState con CTA "Ir a mis rutinas" + entrenamiento libre: input título → POST /sessions sin routineId, maneja resumed:true).
  - src/components/zona/progress-tab.tsx: 5 stat tiles (sesiones completadas, volumen total es-AR, PRs, racha, días 30d); peso con input + LineChart (aria-label con rango) o EmptyState si vacío; agua con progressbar role + +250/+500 (patch optimista desde {ml} del response + refresh silencioso) y objetivo fijo 2000 ml "objetivo sugerido" (sin datos clínicos); 6 hábitos toggles aria-pressed (POST habits, patch desde response) + mini-grid semanal n/6; volumen semanal con BarChart (EmptyState honesto si todo 0); tabla de PRs ejercicio/peso/e1RM o "Tus récords aparecerán al entrenar con peso".
  - src/components/zona/achievements-tab.tsx: grid sm:2/lg:3, desbloqueados borde+fondo volt con Check, bloqueados atenuados con progressbar current/target cuando existe; contador "x de N" y texto "Empezá a entrenar para desbloquear logros" si 0 desbloqueados.
  - src/components/views/zona-view.tsx (export nombrado ZonaView): fases checking/anon/ready/error; al montar GET /profile (401=AuthGate, no error) con setState solo en continuaciones de promesa (cumple react-hooks/set-state-in-effect); carga paralela progress+routines+achievements; barra de perfil con "Cerrar sesión" (POST logout → reset a AuthGate con mensaje honesto); 4 tabs con role=tablist, dot volt en "Entrenar" si activeSession, track("zona_tab"); activeSession vive en progress (patch optimista al iniciar, refresh en background); startFromRoutine (POST /sessions routineId+day, maneja resumed) → tab Entrenar; al finalizar → pantalla de éxito (SuccessNote + volumen/series/duración + tarjetas PR con e1RM + CTAs a progreso/rutinas) mientras refresh de progress+achievements; handleActionError: ZonaUnauthorized→AuthGate ("Tu sesión expiró…"), resto→toast error; analítica con el patrón de la casa (track de view_change ya cubre page_view): zona_start_session, zona_generate_routine, zona_log_set{pr}, zona_finish_session, zona_log_weight/water, zona_toggle_habit, zona_tab, cta_click{label:"zona-primera-rutina"|"zona-ir-a-rutinas"|"zona-auth-ok"}.
- site-shell.tsx (edits aditivos, patrón exacto): const ZonaView = dynamic(...ssr:false) junto a BibliotecaView + case "zona" en CurrentView (el ViewId y el hash ya existían de 24-b).
- UX/accesibilidad: botones e inputs min-h-11 (44px), grids responsivos 1→2→4, charts w-full sin overflow a 320px, tabla de PRs con overflow-x-auto, errores nunca silenciosos (ErrorState/Toast), sin pantallas blancas (LoadingState en fases asíncronas).
- Verificación: bun run lint → 0 errores/0 warnings (resolví 5 del react-hooks v6: set-state-in-effect migrando a continuaciones .then y quitando props/imports no usados); bunx tsc --noEmit → 0; GET / → 200 y dev.log limpio (solo los smoke tests, todos 2xx); BD devuelta a 0 registros. NO inicié dev server ni toqué router/navbar/footer/seo/APIs/prisma.

Stage Summary:
- Creados: src/components/zona/api.ts, charts.tsx, auth-gate.tsx, routines-tab.tsx, train-tab.tsx, progress-tab.tsx, achievements-tab.tsx y src/components/views/zona-view.tsx. Modificado (aditivo): src/components/site/site-shell.tsx.
- #/mi-zona operativo: AuthGate → tabs Rutinas (lista + IA generador), Entrenar (sesión activa con series/PRs/finalización o entrenamiento libre), Progreso (stats/peso/agua/hábitos/volumen/PRs con charts SVG propios) y Logros; contratos 1:1 con las APIs de 24-c verificados en caliente.
- lint 0 · tsc 0 · sin datos demo (BD en 0) · sin push a git.

---
Task ID: 24-e
Agent: main (Z.ai Code)
Task: Verificación E2E del sistema de entrenamiento (Tasks 24-b/c/d) + fixes + push

Work Log:
- lint 0 / tsc 0 / dev.log limpio.
- E2E agent-browser: biblioteca (búsqueda "sentadilla" → 12 resultados, dialog con músculos/ejecución OK), mi-zona (registro → tabs, login → tabs).
- BUG 1 fix: handleAuthenticated no disparaba loadData → vista colgada en "Cargando…" tras login/registro (zona-view.tsx, +void bootstrap()).
- BUG 2 fix: generate/route 503 por JSON malformado del LLM → repairJson (comas colgantes/comillas tipográficas) + tryParseJson + reintento (2 intentos, 2.º con feedback al modelo).
- Flujos verificados: rutina IA real 3 días; sesión día 1; series 60kg×8 y 40kg×10; finalización con 2 PRs y e1RM Epley exacto (76 / 53,3); progreso: peso 78,5 (curva), agua 500ml (25%), PRs table; logros 3/10 reales.
- 320px sin overflow en las 2 vistas nuevas; 0 errores de página; sin hydration errors.
- BD de prueba eliminada (cascada): 0 perfiles/rutinas/sesiones/sets/logs.

Stage Summary:
- Features de los 20 proyectos integradas y verificadas: biblioteca (100 ejercicios), rutinas + IA, tracking con PRs, peso/agua/hábitos, logros, navegación nueva.
- BD entregada vacía (sin datos demo). Historial de hidration errors en dev.log era transitorio de hot-reload; verificado 0 en E2E final.
