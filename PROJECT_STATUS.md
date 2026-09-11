# PROJECT_STATUS — EZEQUIEL COACHING

Última actualización: Task 22 (restauración + verificación integral).

## ⚠️ Incidente previo
El workspace original se perdió por un reinicio del entorno (ver worklog.md Task 22-a).
La app fue restaurada desde evidencia verbatim (router, home, navbar) + arquitectura
documentada. La base de datos anterior era irrecuperable: la actual empieza VACÍA.

## Stack
- Next.js 16 (App Router) + TypeScript strict + Tailwind 4 + bun
- Prisma + SQLite (`db/custom.db`) — 7 modelos: Lead, Intake, Message, Order, Product, Plan, Post
- Router SPA por hash (`#/vista`) — 27 ViewIds en `src/lib/router.ts` (restaurado verbatim)
- UI propia estilo shadcn (dark, acento volt `#bdef27`)

## Estado funcional (verificado E2E con navegador)
| Módulo | Estado |
|---|---|
| Home (12 secciones) | ✅ Verificada 1280/390/320, sin overflow |
| Coaching + detalle servicio | ✅ |
| Planes + detalle + checkout (transferencia) | ✅ Pedido EC-… creado, estado pendiente honesto |
| Tienda + ficha producto | ✅ Con catálogo de ejemplo editable |
| Pedido (lookup nº+email) | ✅ Privacidad: requiere email coincidente |
| Cuestionario (4 pasos, zod) | ✅ Persiste con sex/daysPerWeek/equipment + TMB/TDEE |
| Calculadoras (7, fórmulas reales) | ✅ IMC 22,9 y BMR 1649/TDEE 2556 verificados |
| Contador de calorías (localStorage) | ✅ Añadir/persistir/borrar verificados |
| Mi progreso (localStorage) | ✅ Empieza vacío (sin datos falsos) |
| Blog + posts | ✅ Con 2 artículos de ejemplo |
| FAQ, Contacto, Guía gratis, Legales ×4 | ✅ |
| Panel coach (login HMAC, tabs) | ✅ Verificado con API; 401 sin sesión |
| Panel admin (CRUD catálogo) | ✅ Soft-delete, 409 slug duplicado |
| 404 | ✅ Para #/404 y hashes desconocidos |
| PWA/SEO: manifest, robots, sitemap, OG, JSON-LD | ✅ Generados |

## Pendientes documentados (NO simulados)
1. **SMTP**: sin proveedor → la entrega de la guía queda registrada en log (`src/lib/email.ts`).
2. **Pagos online (Stripe/MP)**: NO implementado. El pedido nace "pendiente" y el coach
   lo marca pagado tras verificar transferencia. `[SUSTITUIR: IBAN]` en el checkout.
3. **Cuentas de cliente** (login, entrenamientos asignados, check-ins, chat 1:1): NO existen.
   Los paneles de progreso/contador/dashboard son herramientas locales sin cuenta.
4. **Placeholders a sustituir**: datos del titular (legales), email de contacto, redes,
   precios de servicios, IBAN, testimonios reales con consentimiento.
5. **ADMIN_PASSWORD** temporal en `.env` (`ezequiel-temp-2026`) — CAMBIAR en producción.

## Calidad
- `bun run lint` → 0 errores / 0 warnings
- `bunx tsc --noEmit` → 0 errores
- Consola del navegador limpia; footer pegado al final en cortas/largas; sin overflow.
- Todo commiteado a git tras cada bloque (lección del incidente).
