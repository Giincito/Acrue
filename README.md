# Acrue

Acrue es una PWA personal tipo LifeOS. Centraliza tareas, calendario, estudio, finanzas, despensa, recetas, habitos, wishlist y una capa de IA con Gemini para captura rapida, chatbot, vision de tickets y acciones con undo.

Fuente de verdad funcional actual:
- Producto y guardrails: `PRD.md`
- Diseno visual y voz: `Design.md`
- Plan historico: `Roadmap.md`
- Estado auditado actual: `AUDIT_2026-06-13.md`

## Stack

- Next.js App Router
- React 19
- TypeScript strict
- Tailwind CSS
- tRPC
- Supabase Auth, Postgres, Storage y RLS
- Gemini API
- Upstash Redis para undo/cache
- Telegraf para Telegram
- Sentry

No hay servidor externo: todo corre dentro de Next.js API routes, cron routes y tRPC.

## Setup local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abrir `http://localhost:3000`.

En Windows, si Codex no puede dejar el dev server en segundo plano, levantarlo en una terminal normal:

```bash
npm run dev -- --hostname 127.0.0.1
```

## Variables de entorno

`.env.example` lista todas las variables esperadas sin valores.

Minimas para una app local autenticada:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

IA y undo:

```bash
GEMINI_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Google, Moodle, Telegram y cron:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MOODLE_ENCRYPTION_KEY=
MOODLE_URL=
TELEGRAM_BOT_TOKEN=
CRON_SECRET=
```

`TELEGRAM_ENABLE_DEV_POLLING=true` activa polling local del bot en development. Por defecto esta desactivado para que importar el modulo de Telegram no toque webhooks ni bloquee el dev server.

## Base de datos

Las migraciones estan en `supabase/migrations`.

Reglas importantes:
- `data/{matchId}/match.json` no debe romperse ni moverse.
- RLS debe quedar activo en tablas de usuario.
- Las tablas donde IA crea registros necesitan `deleted_at` para undo.
- Tickets y fotos son efimeros: no se persisten como archivos permanentes.

## Comandos

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
npm audit --audit-level=moderate
```

Antes de cerrar cambios de codigo, correr al menos `npm test`; para cambios amplios, correr todo el set.

## Telegram

El webhook productivo vive en `POST /api/telegram`.

En development:
- El modulo `src/lib/telegram.ts` crea handlers si hay token.
- No arranca polling por import.
- Para polling local explicito, usar `TELEGRAM_ENABLE_DEV_POLLING=true`.

## PWA offline

El proyecto no usa `next-pwa`: la alternativa equivalente esta implementada con un service worker propio en `public/sw.js`, registro desde `ServiceWorkerRegistration` solo cuando el navegador puede ejecutarlo, manifest via `src/app/manifest.ts`, iconos publicos dedicados en `public/icons/` y cola offline IndexedDB en `src/lib/pwa/`.

## Estado actual

Ultimo estado verificado en `AUDIT_2026-06-13.md`:
- lint OK
- typecheck OK
- tests OK
- build OK
- npm audit OK

Pendientes principales:
- PWA offline real con service worker, cache e IndexedDB.
- Prueba end-to-end real de Telegram/vision con bot, webhook y foto.
- Pasada visual completa contra `Design.md`.
- Roadmap todavia conserva tareas historicas que requieren verificacion manual por modulo.
