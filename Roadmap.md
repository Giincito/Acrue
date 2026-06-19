# Acrue — Roadmap de Implementación
**v1.0 · Marzo 2026**

> Este documento define el orden exacto de implementación de Acrue, feature por feature.
> Cada fase debe estar completa, probada y deployada antes de avanzar a la siguiente.
> Sin tiempos definidos — el ritmo lo marca la calidad, no el calendario.

## Estado auditado

Actualizacion 2026-06-16:

- Este roadmap vuelve a ser un plan de trabajo, no una declaracion de cierre de producto.
- El estado operativo real esta documentado en `AUDIT_2026-06-13.md`.
- Los checks automaticos amplios quedan documentados en `AUDIT_2026-06-13.md`; en esta pasada se vuelve a ejecutar `npm test`.
- Los tests actuales cubren 16 archivos y 146 casos.
- PWA offline tiene service worker, cache app-shell, assets publicos dedicados, aviso visual, cola IndexedDB y sync de nueva tarea/nuevo gasto; validado en Chrome local con servidor detenido, falta validacion manual en iPhone/PWA instalada real.
- El cron de tareas recurrentes esta configurado y la generacion idempotente queda cubierta por tests unitarios; falta validacion real en entorno desplegado.
- El cron de papelera esta configurado y usa service role para poder limpiar registros bajo RLS.
- Las rutas configuradas en Vercel Cron exponen handler `GET`; `/api/cron/recurrence` conserva `POST` solo como compatibilidad manual.
- Los crons ya no hacen fallback a Supabase anon key; usan service role o fallan cerrado.
- Los crons ya no inicializan clientes service-role de Supabase antes de validar `CRON_SECRET`.
- Los crons usan `createServiceClient()` como punto unico de acceso admin a Supabase.
- Google Calendar tambien usa `createServiceClient()` y ya no lee la service-role key de forma directa.
- Google Calendar, Moodle, Gemini Vision y la descarga de fotos de Telegram pasan por `withFallback()` para degradacion centralizada.
- Google OAuth guarda refresh tokens en `google_integrations`, no en `users.settings`, y Configuracion solo recibe estado booleano.
- Moodle tiene tablas/RPCs versionadas en migraciones, sync manual scopiado al usuario autenticado y sync cron idempotente por `user_id, moodle_id, type`.
- Toda RPC usada por codigo productivo queda protegida por test estatico para existir en migraciones.
- Morning briefing usa la columna dedicada `users.telegram_chat_id`, consistente con el bot y Configuracion.
- Copy de notificaciones por cron queda protegido contra emoji decorativo y mojibake.
- Las notificaciones Telegram productivas usan el helper compartido con `withFallback()`; las llamadas directas a Bot API quedan limitadas a rutas de prueba development-only.
- La UI ya no bloquea zoom del navegador, mantiene el accent `#2282fa` como token fijo no configurable y cubre controles clickeables con cursor pointer, estados disabled con `not-allowed` sin `pointer-events-none` ni cursores default/auto, area tactil minima tambien en controles nativos de formulario, radios compactos tambien en CSS explicito, imagenes grayscale, nombres accesibles programaticos en botones/links de icono, `type` explicito en botones nativos y `motion.button` con click y triggers `Button` de popover en forms, tokens `destructive` para botones de papelera, ausencia de supresiones TypeScript en UI visible, scrims base de Dialog/Sheet suficientemente fuertes, labels explicitos en espanol y sentence-case para Ajustes, tema, chatbot, registro de comidas, tareas, calendario, recordatorios, estudio, Moodle y controles base de cierre.
- Copy residual de evaluaciones, cronograma semanal, meal plan, chatbot y drawer de recordatorios queda normalizado contra `Design.md`.
- Estados visuales de tareas, calendario, estudio, finanzas, despensa, recetas, proyectos y recordatorios usan tokens semanticos (`success`, `warning`, `destructive`, `accent`) en lugar de paletas cromaticas Tailwind crudas.
- Copy residual de proyectos, materias, Moodle, recetas, Google Calendar, bottom nav y formularios queda normalizado con acentos y sentence-case.
- Calendario ya no usa paletas pastel/arbitrarias heredadas; el dia actual y los eventos usan tokens semanticos del sistema.
- Rutas legacy en ingles redirigen a rutas canonicas en espanol para evitar UI duplicada o placeholders antiguos.
- UI visible queda protegida contra tracking negativo y copy de exito ruidosa.
- Artefactos locales de debugging fueron removidos y quedan protegidos por test estatico.
- Copy productiva conocida sin acentos queda protegida en Telegram, crons, chatbot, recetas, CSV financiero y errores PWA.
- Sentry queda configurado por env vars, sin PII por defecto y sin tunnel browser; Vercel CLI excluye `.env*`.
- Los crons quedan compatibles con Vercel Hobby; Moodle sync queda diario hasta que haya plan Pro o alternativa gratuita.
- La lista de recordatorios ya no usa confirmacion bloqueante del navegador; la eliminacion queda en UI propia accesible.
- Todavia falta prueba end-to-end real de Telegram/vision con bot, webhook y foto.
- Todavia falta pasada visual/manual completa contra `Design.md`.

---

## Cómo usar este documento

- Cada fase tiene una **checklist de tareas** en orden de dependencia
- Una tarea con `→ depende de:` no puede empezarse hasta que la dependencia esté completa
- El símbolo `🔴 BLOQUEANTE` indica que si esta tarea falla, la fase no puede darse por terminada
- Al terminar cada fase, hacer un **commit de cierre**: `chore(fase-N): phase N complete`
- Referirse a `PRD.md` para el detalle funcional y a `design.md` para el detalle visual

---

## Fase 0 — Fundamentos

> Objetivo: la app existe, se puede abrir en iPhone y en desktop, tiene auth, y la estructura base está lista. Nada funciona todavía — solo el esqueleto.

### 0.1 Setup del proyecto

- [ ] Inicializar repositorio en GitHub con rama `main` protegida
- [ ] Crear proyecto Next.js 15 con App Router en `E:\Antigravity\Acrue`
- [x] Configurar Tailwind CSS + shadcn/ui
- [x] Instalar y configurar tRPC
- [x] Crear `.env.example` con todas las variables del PRD (sin valores)
- [x] Agregar `.env.local` al `.gitignore`
- [x] Configurar Sentry (free tier) para error tracking desde el día 1
- [ ] Primer deploy a Vercel — la app muestra una pantalla en blanco funcional
- [ ] `feat(setup): initialize Next.js 15 project with Tailwind and tRPC`

### 0.2 Base de datos — Schema completo

> 🔴 BLOQUEANTE — todo lo demás depende de esto

- [x] Crear proyecto en Supabase
- [x] Configurar variables de entorno de Supabase en `.env.local`
- [x] Crear migración inicial con **todas** las tablas del PRD sección 14:
  - [x] `users` (gestionada por Supabase Auth)
  - [x] `xp_events`
  - [x] `tasks` (con columna `deleted_at`)
  - [x] `task_tags`
  - [x] `projects`
  - [x] `subjects`
  - [x] `assignments` (con columna `deleted_at`)
  - [x] `categories`
  - [x] `expenses` (con columna `deleted_at`, **sin** `receipt_url`)
  - [x] `subscriptions`
  - [x] `saving_goals`
  - [x] `pantry_items`
  - [x] `stores`
  - [x] `store_prices`
  - [x] `shopping_list`
  - [x] `recipes`
  - [x] `recipe_ingredients`
  - [x] `meal_log` (con columna `deleted_at`)
  - [x] `habits`
  - [x] `habit_logs`
  - [x] `reminders`
  - [x] `calendar_events`
  - [x] `note_embeddings` (con extensión pgvector habilitada)
  - [x] `wishlist_items`
- [x] Habilitar Row Level Security (RLS) en **todas** las tablas
- [x] Escribir políticas RLS para cada tabla: el usuario solo accede a sus propios datos
- [ ] Verificar que un usuario no puede leer datos de otro usuario
- [x] `feat(database): add complete schema with RLS policies`

### 0.3 Autenticación

→ depende de: 0.2

- [x] Configurar Supabase Auth con Google OAuth
- [x] Crear página de login con botón "Continuar con Google"
- [x] Configurar middleware de Next.js para proteger rutas `(dashboard)`
- [x] Redirigir a `/login` si no hay sesión activa
- [x] Redirigir al dashboard si ya hay sesión
- [ ] Probar login y logout en desktop y en iPhone (Safari)
- [x] `feat(auth): add Google OAuth with Supabase Auth`

### 0.4 PWA — Configuración iPhone

→ depende de: 0.3

- [x] Instalar y configurar `next-pwa` o dejar documentada una alternativa equivalente: service worker propio en `public/sw.js`, registro controlado en `ServiceWorkerRegistration` y helpers en `src/lib/pwa/*`
- [x] Crear manifest PWA con los valores del PRD sección 6 via `src/app/manifest.ts`
- [x] Generar assets publicos dedicados en todos los tamaños requeridos (192, 512, 180, 167px) con el isotipo de Acrue
- [x] Agregar meta tags de iOS en `app/layout.tsx`
- [x] Configurar `theme-color` y `apple-mobile-web-app-status-bar-style`
- [ ] Probar instalación en iPhone: Safari → Compartir → Agregar a pantalla de inicio
- [ ] Verificar que se abre en modo standalone (sin barra de Safari)
- [x] `feat(pwa): configure PWA manifest and iOS meta tags`

### 0.5 Layout base y navegación vacía

→ depende de: 0.3

- [ ] Crear componente `Sidebar.tsx` con los 4 grupos semánticos (General, Productividad, Académico, Vida)
- [x] Crear componente `BottomNav.tsx` para mobile con los 5 tabs
- [x] Crear `layout.tsx` del grupo `(dashboard)` que incluye Sidebar en desktop y BottomNav en mobile
- [ ] Implementar responsive: Sidebar visible en ≥ 1024px, BottomNav en < 1024px
- [ ] Crear páginas vacías (solo título) para cada módulo:
  - [x] `/` Dashboard
  - [x] `/hoy`
  - [x] `/semanal`
  - [x] `/calendario`
  - [x] `/tareas`
  - [ ] `/proyectos`
  - [x] `/foco`
  - [x] `/estudio`
  - [ ] `/cerebro`
  - [x] `/finanzas`
  - [x] `/despensa`
  - [x] `/recetas`
  - [ ] `/habitos`
  - [x] `/wishlist`
  - [x] `/configuracion`
- [ ] El ítem activo de la sidebar usa fondo `#2282fa` al 8% e ícono/texto en `#2282fa`
- [ ] `feat(layout): add sidebar, bottom nav, and empty module pages`

### 0.6 Componentes compartidos base

→ depende de: 0.5

- [x] Crear `CmdK.tsx` — modal que abre con `⌘K`, campo de texto, cierra con Esc (sin IA todavía)
- [x] Crear `ChatBot.tsx` — botón flotante bottom-right, panel que abre/cierra (sin IA todavía)
- [x] Crear `AiThinking.tsx` — tres puntos animados, colores del design system
- [x] Crear `UndoToast.tsx` — toast con botón "Deshacer", timer de 5 segundos visible
- [x] Crear wrapper `lib/integrations/resilience.ts` con función `withFallback`
- [x] Registrar `CmdK` en el layout para que `⌘K` funcione en todas las pantallas
- [x] Registrar `ChatBot` en el layout para que sea visible en todas las pantallas
- [x] `feat(shared): add CmdK, ChatBot, AiThinking, UndoToast and resilience wrapper`

### 0.7 Dark mode

→ depende de: 0.5

- [ ] Configurar Tailwind con `darkMode: 'media'`
- [x] Verificar que todos los componentes del layout respetan light/dark
- [ ] Agregar toggle manual en `/configuracion` que guarda preferencia en `users.settings`
- [ ] `feat(ui): add dark mode support with system preference detection`

### ✅ Criterio de cierre de Fase 0

- [ ] La app se abre en iPhone instalada como PWA
- [x] La app se abre en desktop con sidebar visible
- [ ] El login con Google funciona en ambos dispositivos
- [ ] La sidebar navega entre todas las páginas (vacías)
- [x] `⌘K` abre un modal vacío
- [x] El chatbot flotante abre un panel vacío
- [ ] `AiThinking` se puede visualizar en una página de prueba
- [ ] No hay errores en Sentry
- [ ] `chore(fase-0): phase 0 complete`

---

## Fase 1 — Tareas y Calendario

> Objetivo: el módulo más importante de la app funciona end-to-end. El usuario puede crear, organizar y completar tareas. El calendario muestra eventos. Las notificaciones llegan por Telegram.

### 1.1 Módulo Tareas — CRUD base

→ depende de: Fase 0 completa

- [x] Crear API route `POST /api/tasks` — crear tarea
- [x] Crear API route `GET /api/tasks` — listar tareas por status/filtro
- [x] Crear API route `PATCH /api/tasks/[id]` — actualizar tarea (status, prioridad, etc.)
- [x] Crear API route `DELETE /api/tasks/[id]` — soft delete (actualiza `deleted_at`)
- [x] Crear hook `useTaskStore.ts` con Zustand para estado local de tareas
- [x] `feat(tareas): add tasks CRUD API routes`

### 1.2 Módulo Tareas — UI

→ depende de: 1.1

- [x] Crear componente `TaskItem.tsx` — ítem de lista con checkbox, título, etiqueta, prioridad, fecha
- [x] Checkbox: animación de completado (scale + fill + checkmark stroke-dashoffset)
- [x] Implementar swipe izquierda para eliminar (mobile)
- [x] Implementar swipe derecha para completar (mobile)
- [x] Crear vista `Inbox` — lista de tareas con status `inbox`
- [x] Crear vista `Hoy` — tareas con status `today` o `due_at = hoy`
- [ ] Crear vista `Semana` — tareas de los próximos 7 días
- [ ] Crear vista `Backlog` — tareas pendientes sin fecha
- [x] Tabs de navegación secundaria dentro del módulo Tareas
- [x] Formulario rápido de nueva tarea: título, etiqueta de contexto, prioridad, fecha opcional
- [ ] `feat(tareas): add task list views and TaskItem component`

### 1.3 Módulo Tareas — Recurrencia y etiquetas

→ depende de: 1.2

- [x] Instalar librería `rrule` para parsear y generar reglas de recurrencia
- [x] Selector de recurrencia en el formulario de tarea (diaria, semanal, mensual, personalizada)
- [x] Cron job en Vercel que genera instancias de tareas recurrentes cada día a las 00:00 America/Argentina/Buenos_Aires
- [ ] Probar generacion real de una tarea recurrente en entorno desplegado
- [x] Filtro por etiquetas de contexto: `@hogar`, `@universidad`, `@personal`, `@compras`
- [x] `feat(tareas): add recurrence with RRULE and context tags`

### 1.4 Módulo Proyectos

→ depende de: 1.2

- [x] Crear API routes CRUD para `projects`
- [x] Vista de lista de proyectos con barra de progreso (completadas / total)
- [x] Vista de proyecto individual con lista de tareas asociadas
- [x] Selector de proyecto al crear/editar una tarea
- [x] Estados de proyecto con selector en la vista
- [x] `feat(proyectos): add projects module with task association`

### 1.5 Módulo Calendario — base

→ depende de: 1.2

- [x] Instalar librería de calendario (recomendado: `react-big-calendar` o `fullcalendar`)
- [x] Vista mensual con eventos
- [x] Vista semanal con bloques de tiempo
- [ ] Tabs de navegación: Vista mensual / Vista semanal / Recordatorios
- [x] Las tareas con `due_at` aparecen automáticamente en el calendario
- [x] Formulario de nuevo evento manual
- [ ] `feat(calendario): add calendar views with tasks integration`

### 1.6 Módulo Calendario — Recordatorios

→ depende de: 1.5

- [x] CRUD de recordatorios con hora, repetición opcional
- [ ] Vista de lista de recordatorios en el tab correspondiente
- [ ] `feat(calendario): add reminders CRUD`

### 1.7 Bot de Telegram — setup y vinculación

→ depende de: Fase 0 completa

- [x] Crear bot en @BotFather — obtener token
- [x] Configurar `TELEGRAM_BOT_TOKEN` en variables de entorno
- [x] Crear webhook: `POST /api/telegram` — recibe mensajes del bot
- [x] Registrar el webhook en Telegram apuntando a la URL de Vercel
- [x] Comando `/start` — registra `chat_id` del usuario en `users.telegram_chat_id`
- [x] Flujo de vinculación en `/configuracion`: el usuario ingresa su `chat_id` o hace click en un link que abre el bot
- [x] Función `sendTelegram(userId, message)` en `lib/telegram.ts`
- [x] `feat(telegram): add bot setup, webhook, and account linking`

### 1.8 Notificaciones vía Telegram

→ depende de: 1.6, 1.7

- [x] Cron job diario a las 8:00 AM (America/Argentina/Buenos_Aires) configurado en `vercel.json` hacia `/api/cron/morning-briefing`.
- [ ] Probar envio real del morning briefing con bot de Telegram en entorno desplegado.
- [ ] Notificación 48h antes de una tarea con `due_at`
- [ ] Notificación 24h antes de una tarea con `due_at`
- [ ] Notificación en el horario del recordatorio manual
- [ ] `feat(notificaciones): add Telegram notifications for tasks and reminders`

### 1.9 Google Calendar — sincronización

→ depende de: 1.5, 1.7

- [x] Configurar Google OAuth con scopes de Calendar y Tasks
- [x] Guardar refresh token de Google en tabla server-only `google_integrations` para background sync
- [x] Función `syncGoogleCalendar(userId)` — importa eventos de GCal a `calendar_events`
- [x] Función `pushToGoogleCalendar(event)` — exporta eventos de Acrue a GCal
- [x] Detectar links de Google Meet en eventos de GCal y guardar en `meet_url`
- [x] Mostrar links de Meet en el evento del calendario de Acrue
- [ ] Google Tasks: importar tareas existentes en el onboarding
- [ ] Google Tasks: sync bidireccional cuando una tarea cambia de status
- [ ] Modo degradado: si Google falla, mostrar barra de aviso con `withFallback`
- [ ] `feat(google): add Google Calendar and Tasks sync`

### ✅ Criterio de cierre de Fase 1

- [x] Crear, completar y eliminar tareas funciona end-to-end
- [ ] Las vistas Inbox, Hoy, Semana y Backlog muestran las tareas correctas
- [x] Las tareas recurrentes se generan automaticamente en codigo con cron configurado
- [ ] La generacion recurrente fue probada end-to-end en entorno desplegado
- [x] El calendario muestra tareas con fecha y eventos de Google Calendar
- [ ] Los recordatorios llegan por Telegram en el horario configurado
- [x] El cron de las 8AM esta configurado hacia `/api/cron/morning-briefing`
- [ ] El envio real del morning briefing fue probado end-to-end con Telegram
- [x] Los proyectos agrupan tareas con barra de progreso
- [ ] `chore(fase-1): phase 1 complete`

---

## Fase 2 — IA Core + Undo

> Objetivo: Gemini está integrado. El Cmd+K y Telegram entienden lenguaje natural. El chatbot responde. El mecanismo de Undo funciona. El escaneo de tickets procesa fotos.

### 2.1 Setup de Gemini

→ depende de: Fase 1 completa

- [x] Instalar SDK de Google Generative AI: `@google/generative-ai`
- [x] Configurar `GEMINI_API_KEY` en variables de entorno
- [x] Crear `lib/gemini/client.ts` — instancia del cliente Gemini
- [x] Crear función base `callGemini(prompt, options)` con manejo de errores y `withFallback`
- [x] Implementar debounce de 400ms para todas las llamadas desde el cliente
- [ ] Cache de respuestas similares en Upstash Redis (TTL: 30 minutos)
- [ ] `feat(gemini): add Gemini 3.1 Flash client setup`

### 2.2 Router de intenciones

→ depende de: 2.1

- [x] Crear `lib/gemini/router.ts` con el system prompt del router (con contexto temporal corregido)
- [x] El router devuelve siempre un JSON estructurado: `{ intent, confidence, payload }`
- [x] Implementar detección de todos los tipos de intención del PRD sección 5.1
- [x] Crear API route `POST /api/ai/router` que recibe texto y devuelve JSON
- [x] Si confianza > 90%: INSERT en la tabla correspondiente + activar UndoToast
- [x] Si confianza < 90%: devolver preview al cliente para confirmación manual
- [x] `feat(ai): add intent router with confidence threshold and timezone fix`

### 2.3 Cmd+K con IA

→ depende de: 2.2

- [x] Conectar el modal de `CmdK.tsx` al endpoint `/api/ai/router`
- [x] Mostrar `AiThinking` mientras se procesa
- [x] Si confianza > 90%: cerrar modal + mostrar `UndoToast`
- [ ] Si confianza < 90%: mostrar preview editable dentro del modal con campos modificables
- [x] Implementar comandos directos `/hoy`, `/semana`, `/gasto`, `/tarea`, `/nota`, `/foco`, `/deshacer`
- [ ] `feat(cmdk): connect Cmd+K to Gemini intent router`

### 2.4 Mecanismo de Undo

→ depende de: 2.2

- [x] Configurar Upstash Redis con `UPSTASH_REDIS_URL` y `UPSTASH_REDIS_TOKEN`
- [x] Al ejecutar acción con confianza > 90%: guardar en Redis con TTL 5s `{ action, recordId, table, userId }`
- [x] `UndoToast` llama a `POST /api/undo` con el `recordId` si el usuario presiona "Deshacer"
- [x] `POST /api/undo`: actualiza `deleted_at = now()` en la tabla correspondiente
- [x] Si el TTL expira sin Undo: el registro queda activo (ya fue insertado)
- [x] Implementar `/deshacer` en el Cmd+K: busca el último `recordId` de la sesión en Redis y lo deshace
- [x] Cron job diario: `DELETE WHERE deleted_at < now() - interval '7 days'` en todas las tablas con papelera
- [x] `feat(undo): add Redis-based undo mechanism with 5s toast and 7-day trash`

### 2.5 Telegram con IA

→ depende de: 2.2

- [x] Actualizar el webhook `/api/telegram` para pasar mensajes de texto al router de intenciones
- [x] Resolver error de scope de `cookies()` en procesos de fondo (Telegram)
- [x] Responder al usuario con confirmación en Telegram: "✓ Gasto registrado — Supermercado $4.800"
- [ ] Si confianza < 90%: responder con opciones de confirmación en Telegram (botones inline)
- [ ] `feat(telegram): connect Telegram bot to intent router`

### 2.6 Escaneo de tickets — Gemini Vision

→ depende de: 2.1

- [x] Crear `lib/gemini/vision.ts` con el prompt de extracción de tickets
- [x] Crear API route `POST /api/ai/vision`:
  - [x] Recibe imagen (base64 o multipart)
  - [ ] Sube imagen a Supabase Storage con signed URL (TTL: 60 segundos)
  - [ ] Llama a Gemini Vision con la URL temporal
  - [x] Extrae JSON: `{ comercio, monto, items[], fecha, metodo_pago }`
  - [x] INSERT en tabla `expenses`
  - [x] DELETE inmediato de la imagen en Supabase Storage
  - [x] Devuelve el JSON extraído al cliente
- [x] En Finanzas: botón de cámara que abre el selector de imagen/cámara
- [x] En Telegram: si el mensaje es una foto, pasarla al endpoint de visión
- [x] Mostrar `AiThinking` con texto "Analizando..." durante el procesamiento
- [ ] `feat(vision): add receipt scanning with ephemeral image processing`

### 2.7 Chatbot con IA — Fase inicial

→ depende de: 2.1

- [x] Crear `lib/gemini/chat.ts` con la lógica del chatbot
- [x] Crear API route `POST /api/ai/chat`:
  - [x] Recibe `{ message, history, modules[] }` donde `modules` son los módulos relevantes
  - [x] Hace fetch de los datos de esos módulos desde Supabase
  - [x] Construye un snapshot resumido del contexto
  - [x] Llama a Gemini con el historial + contexto
  - [x] Devuelve la respuesta
- [x] En esta fase, el chatbot tiene acceso a: Tareas y Calendario
- [x] Conectar `ChatBot.tsx` al endpoint `/api/ai/chat`
- [x] Mostrar `AiThinking` como bubble mientras se procesa
- [x] Las acciones ejecutadas desde el chat activan el `UndoToast`
- [x] `feat(chatbot): add conversational chatbot with Tareas and Calendario context`

### ✅ Criterio de cierre de Fase 2

- [x] Escribir "Gasté 4800 en el súper" en Cmd+K registra el gasto automáticamente
- [x] El `UndoToast` aparece y funciona (revertir en 5 segundos)
- [x] `/deshacer` en Cmd+K revierte la última acción
- [x] Enviar el mismo texto por Telegram hace lo mismo
- [x] Una foto de ticket en Telegram extrae los datos y los carga en Finanzas
- [x] El chatbot responde preguntas sobre tareas y calendario
- [x] El chatbot puede crear una tarea desde la conversación
- [x] `AiThinking` aparece en todas las esperas de Gemini
- [ ] `chore(fase-2): phase 2 complete`

---

## Fase 3 — Estudio y Proyectos

> Objetivo: el módulo académico funciona completo. Moodle está integrado. La calculadora de promedio es precisa.

### 3.1 Módulo Estudio — CRUD base

→ depende de: Fase 2 completa

- [x] API routes CRUD para `subjects`
- [x] API routes CRUD para `assignments`
- [x] Vista de lista de materias con estado y promedio
- [x] Vista de detalle de materia con lista de parciales/exámenes
- [x] Formulario de nueva materia con selector de correlativas
- [x] Formulario de nuevo examen/parcial con tipo, peso y nota
- [x] `feat(estudio): add subjects and assignments CRUD`

### 3.2 Calculadora de promedio ponderado

→ depende de: 3.1

- [x] Función `calculateWeightedAverage(assignments[])` en `lib/utils/grades.ts`
- [x] El promedio se recalcula automáticamente al agregar o modificar una nota
- [x] Mostrar promedio actual prominentemente en la vista de cada materia
- [x] Mostrar promedio general de carrera en el tab "Promedio"
- [x] `feat(estudio): add automatic weighted average calculator`

### 3.3 Carga horaria y alertas

→ depende de: 3.1

- [x] Vista de carga horaria semanal — horas por materia en formato grilla
- [x] Las materias con `due_at` en assignments aparecen en el Calendario automáticamente
- [x] Alertas de inscripción: campo `enrollment_open_date` en subjects + notificación por Telegram
- [x] `feat(estudio): add weekly schedule and enrollment alerts`

### 3.4 Integración Moodle UNICEN

→ depende de: 3.1

- [x] Crear `lib/moodle/client.ts` — cliente REST de Moodle
- [ ] Flujo de autenticación en `/configuracion/campus`:
  - [x] El usuario ingresa sus credenciales UNICEN
  - [x] Se obtiene token via `login/token.php`
  - [x] Las credenciales se encriptan con `pgcrypto` antes de guardar en Supabase
- [x] Esquema Moodle versionado en migraciones: `moodle_credentials`, `moodle_events`, RPCs de credenciales e indice unico `user_id, moodle_id, type`
- [x] Función `syncMoodle(userId)`:
  - [x] Llama a `mod_assign_get_assignments` → importa fechas de entregas
  - [x] Llama a `core_message_get_messages` → importa avisos del campus
  - [x] Gemini procesa los datos y crea tareas/eventos en Acrue automáticamente
- [x] Sync manual protegido scopiado al usuario autenticado, sin self-call HTTP al cron ni dependencia de `CRON_SECRET`
- [x] Sync de eventos Moodle idempotente con `upsert`, sin duplicar entregas, recursos, foros ni calendario
- [ ] Cron job cada 2 horas: `GET /api/cron/moodle-sync` con `CRON_SECRET`
- [x] Modo degradado: si Moodle no responde, mostrar barra de aviso con última sync
- [x] Tab "Campus UNICEN" en el módulo Estudio con vista de avisos y entregas sincronizadas
- [ ] `feat(estudio): add Moodle UNICEN integration with 2h auto-sync`

### 3.5 IA en Estudio

→ depende de: 3.4, 2.7

- [x] Gemini sugiere plan de estudio al detectar múltiples exámenes próximos
- [x] El plan se presenta como lista de tareas sugeridas que el usuario puede confirmar
- [x] Gemini resume los avisos de Moodle en lenguaje simple (máximo 3 líneas)
- [x] Agregar acceso a Estudio al chatbot (`/api/ai/chat` recibe contexto de subjects y assignments)
- [x] `feat(estudio): add AI study plan suggestions and Moodle summarization`

### ✅ Criterio de cierre de Fase 3

- [x] Crear materias, cargar notas y ver el promedio calculado automáticamente
- [x] Las entregas de Moodle aparecen en el Calendario de Acrue
- [x] Los avisos del campus se muestran en el tab Campus UNICEN
- [ ] El sync automático cada 2 horas funciona (verificar en Vercel cron logs)
- [x] Si Moodle está caído, la barra de aviso aparece y el resto de la app funciona
- [x] El chatbot puede responder preguntas sobre materias y exámenes
- [ ] `chore(fase-3): phase 3 complete`

---

## Fase 4 — Finanzas

> Objetivo: el módulo financiero funciona completo con categorización IA, predicción de saldo y panel de suscripciones.

### 4.1 Módulo Finanzas — CRUD base

→ depende de: Fase 3 completa

- [x] API routes CRUD para `expenses`
- [x] API routes CRUD para `categories`
- [x] API routes CRUD para `subscriptions`
- [x] API routes CRUD para `saving_goals`
- [x] Vista Dashboard Financiero: saldo estimado del mes, últimos gastos, categorías más usadas
- [x] Vista Gastos: lista cronológica con filtro por categoría y fecha
- [x] Vista Suscripciones: lista con fecha de renovación ordenada por proximidad
- [x] Vista Metas: lista con barras de progreso
- [x] `feat(finanzas): add finance module CRUD`

### 4.2 Categorías y conversión de moneda

→ depende de: 4.1

- [x] Categorías predeterminadas (supermercado, transporte, servicios, etc.) en el seed
- [x] CRUD de categorías personalizadas por el usuario
- [x] Integración con dolarapi.com para tipo de cambio ARS/USD
- [x] Caché del tipo de cambio en Redis (TTL: 1 hora) con `withFallback`
- [x] Mostrar equivalente en USD en gastos con `currency: 'ARS'`
- [x] `feat(finanzas): add custom categories and ARS/USD conversion`

### 4.3 Exportar a CSV

→ depende de: 4.1

- [x] Endpoint `GET /api/finanzas/export` que devuelve CSV de expenses con filtro de fechas
- [x] Botón "Exportar CSV" en la vista de Gastos
- [x] `feat(finanzas): add CSV export for expenses`

### 4.4 IA en Finanzas

→ depende de: 4.1, 2.2

- [ ] Categorización automática en el router de intenciones: cuando se registra un gasto, Gemini sugiere categoría basándose en la descripción y el historial del usuario
- [x] Análisis predictivo semanal: función `predictMonthEnd(userId)` que calcula el saldo estimado a fin de mes
- [x] Mostrar predicción en el Dashboard Financiero con la frase "A este ritmo, llegás a fin de mes con $X"
- [x] Alerta por Telegram si el gasto semanal en una categoría supera el 30% del promedio histórico
- [x] Agregar acceso a Finanzas al chatbot
- [ ] `feat(finanzas): add AI categorization and monthly prediction`

### 4.5 Panel de suscripciones — alertas

→ depende de: 4.1, 1.7

- [x] Cron job diario que revisa suscripciones con `renewal_date` en 7 días → alerta por Telegram
- [x] Cron job diario que revisa suscripciones con `renewal_date` en 1 día → alerta por Telegram
- [x] `feat(finanzas): add subscription renewal alerts via Telegram`

### 4.6 Sub-módulo Deudas

→ depende de: 4.1, 1.7

- [x] CRUD de deudas (yo debo / me deben) con campos: persona, monto, fecha límite, notas
- [x] Gestión de estados: pendiente, parcial, liquidado (settled)
- [x] Widget de deudas en el Dashboard Financiero mostrando saldos netos
- [x] Cron job diario de recordatorios de deudas próximas a vencer
- [x] Registro de deudas vía Cmd+K ("le debo 5000 a Juan") y Telegram
- [x] `feat(finanzas): add debt management module with dashboard widget and reminders`


### ✅ Criterio de cierre de Fase 4

- [x] Registrar un gasto por Cmd+K, Telegram y formulario funciona
- [ ] La categorización automática es correcta en al menos el 80% de los casos de prueba
- [x] El análisis predictivo de saldo aparece en el dashboard
- [x] Las suscripciones envían alertas por Telegram 7 y 1 día antes
- [x] El chatbot puede responder "¿cuánto gasté en transporte esta semana?"
- [x] El CSV exportado tiene el formato correcto con todos los campos
- [ ] `chore(fase-4): phase 4 complete`

---

## Fase 5 — Despensa y Recetas

> Objetivo: la despensa digital funciona con lista de compras inteligente y el administrador de recetas con meal tracker.

### 5.1 Módulo Despensa — Inventario

→ depende de: Fase 4 completa

- [x] API routes CRUD para `pantry_items`
- [x] Vista de inventario con cantidad actual vs stock mínimo
- [x] Indicador visual cuando un ítem está bajo el stock mínimo (color semántico del design system)
- [x] Formulario de nuevo ítem con nombre, cantidad, unidad y stock mínimo
- [x] Actualizar cantidad al usar un ingrediente (botón + y -)
- [x] `feat(despensa): add pantry inventory CRUD`

### 5.2 Lista de compras y comparador

→ depende de: 5.1

- [x] API routes CRUD para `shopping_list`, `stores` y `store_prices`
- [x] Generación automática: cuando un ítem cae bajo stock mínimo, aparece en la lista de compras
- [x] Vista de lista de compras con checkbox para marcar ítems como comprados
- [x] CRUD de tiendas (nombre)
- [x] Ingresar precio de un ítem en una tienda
- [x] Vista de comparador: para cada ítem de la lista, mostrar precios por tienda
- [x] Al marcar ítem como comprado en la lista: actualizar cantidad en inventario
- [x] Alerta por Telegram cuando ítems caen bajo stock mínimo
- [x] `feat(despensa): add shopping list with store price comparator`

### 5.3 Módulo Recetas — CRUD

→ depende de: 5.1

- [x] API routes CRUD para `recipes` y `recipe_ingredients`
- [x] Vista de administrador de recetas con filtros (dieta, calorías, favoritas)
- [x] Vista de detalle de receta con ingredientes e instrucciones
- [x] Formulario de nueva receta con selector de ingredientes del inventario
- [x] Marcar/desmarcar como favorita
- [x] `feat(recetas): add recipes CRUD with ingredients`

### 5.4 Sugeridor de recetas

→ depende de: 5.3, 2.1

- [x] Función `getSuggestedRecipes(userId)`:
  - [x] Lee el inventario actual del usuario
  - [x] Calcula qué recetas se pueden preparar con lo disponible
  - [x] Calcula qué recetas están a 1-2 ingredientes de distancia
- [ ] Gemini puede sugerir recetas adicionales basadas en el inventario y preferencias
- [x] Mostrar recetas posibles y "casi posibles" en el tab Sugeridor
- [x] `feat(recetas): add recipe suggester based on pantry inventory`

### 5.5 Meal Tracker

→ depende de: 5.3

- [x] API routes CRUD para `meal_log`
- [x] Vista de Meal Tracker: registro del día con total calórico
- [x] Registrar comida: seleccionar receta del administrador o ingresar texto libre
- [x] Agregar comida al meal tracker desde el chatbot: "Comí pasta anoche, añadelo para hoy"
- [x] Vista semanal de calorías en formato compacto
- [x] `feat(recetas): add meal tracker with daily calorie log`

### 5.6 IA en Despensa y Recetas

→ depende de: 5.4, 5.5, 2.7

- [ ] Gemini predice cuándo se van a agotar ingredientes basándose en el historial de `meal_log`
- [x] Gemini genera plan semanal de comidas: 7 recetas sugeridas basadas en inventario, calorías objetivo y variedad
- [x] Agregar acceso a Despensa y Recetas al chatbot
- [ ] El chatbot puede responder "¿qué comí anteayer?" y "repetilo para hoy"
- [ ] `feat(recetas): add AI meal planning and pantry prediction`

### ✅ Criterio de cierre de Fase 5

- [x] Agregar ingredientes al inventario y que bajen al mínimo genera la lista de compras automáticamente
- [x] El comparador de tiendas muestra precios ingresados manualmente
- [x] Crear una receta con ingredientes y verla en el administrador funciona
- [x] El sugeridor muestra qué recetas puedo hacer ahora con mi inventario
- [x] El Meal Tracker registra comidas y muestra el total calórico del día
- [x] El chatbot puede responder preguntas sobre la despensa y recetas
- [ ] `chore(fase-5): phase 5 complete`

---

## Fase 6 — Hábitos, XP y Wishlist

> Objetivo: el sistema de gamificación está completo y es transversal a toda la app. La wishlist conecta con finanzas.

### 6.1 Módulo Hábitos — CRUD

→ depende de: Fase 5 completa

- [x] API/tRPC routes CRUD para `habits`
- [x] API/tRPC route `habits.complete` — registra completado (INSERT en `habit_logs`, append-only)
- [x] Vista de lista de hábitos activos
- [x] Formulario de nuevo hábito: nombre, frecuencia, días de la semana, hora opcional
- [x] Marcar hábito como completado desde la lista
- [x] `feat(habitos): add habits CRUD and completion logging`

### 6.2 Heatmap y rachas

→ depende de: 6.1

- [x] Función `getHeatmapData(userId, habitId)` — calcula completados por día en los últimos 4 meses
- [x] Componente `HabitHeatmap.tsx` — grilla 7×16 semanas estilo GitHub, escala monocromática del design system
- [x] El día de hoy tiene borde `#2282fa` de 1px
- [x] Función `getCurrentStreak(habitId)` — días consecutivos de completado
- [x] Vista de rachas activas por hábito
- [x] `feat(habitos): add heatmap and streak calculation`

### 6.3 Sistema de XP

→ depende de: 6.1

- [x] Función `addXP(userId, sourceType, sourceId, delta, description)` en `lib/xp.ts`
- [x] Función `getTotalXP(userId)` — `SELECT SUM(xp_delta) FROM xp_events WHERE user_id = $1`
- [x] Función `getUserLevel(xp)` — devuelve nivel y título basado en XP total
- [x] Definir tabla de niveles con nombres/títulos progresivos (ej: Aprendiz → Constante → Sistemático → etc.)
- [x] XP se gana automáticamente al:
  - [x] Completar una tarea (10 XP)
  - [x] Completar un hábito del día (15 XP)
  - [x] Entregar un assignment (25 XP)
  - [x] Alcanzar una meta de ahorro (50 XP)
  - [x] Comprar un ítem de wishlist (20 XP)
- [x] Mostrar XP actual y nivel en el Dashboard General y en el módulo Hábitos
- [x] `feat(habitos): add XP system with levels and automatic earning`

### 6.4 Recalibración de XP

→ depende de: 6.3

- [x] Función `recalibrateXP(userId, delta, reason)` en `lib/xp.ts`
- [x] Inserta un evento con `source_type: 'recalibration'`, `xp_delta` positivo o negativo, y `description` con el motivo
- [x] Endpoint protegido (solo con `CRON_SECRET`) para ejecutar recalibraciones si se detecta un bug
- [x] `feat(habitos): add XP recalibration mechanism`

### 6.5 IA en Hábitos

→ depende de: 6.2, 2.7

- [x] Gemini analiza el heatmap y detecta patrones de inconsistencia (ej: "siempre fallas los lunes")
- [x] Sugerencia de mejor horario para cada hábito basada en el historial
- [x] La sugerencia aparece en el detalle del hábito como hint sutil
- [x] Agregar acceso a Hábitos al chatbot
- [x] `feat(habitos): add AI habit pattern detection and suggestions`

### 6.6 Módulo Wishlist

→ depende de: Fase 5 completa

- [x] API routes CRUD para `wishlist_items`
- [x] Vista de lista de wishlist con estados y prioridad
- [x] Formulario de nuevo ítem con todos los campos
- [x] Cambiar estado de un ítem (Deseado → Guardado → Comprado)
- [x] Al marcar como Comprado: `addXP(userId, 'wishlist', itemId, 20, 'Item comprado: X')`
- [x] `feat(wishlist): add wishlist module`

### 6.7 IA en Wishlist

→ depende de: 6.6, 2.7

- [x] Gemini cruza el saldo disponible (de Finanzas) con el precio de los ítems de Wishlist
- [x] Sugerencia: "Tu saldo estimado te permite comprar X sin afectar tus metas de ahorro"
- [x] La sugerencia aparece como hint en el ítem de la wishlist
- [x] Agregar acceso a Wishlist al chatbot
- [x] `feat(wishlist): add AI purchase timing suggestions`

### ✅ Criterio de cierre de Fase 6

- [x] Crear hábitos, completarlos y ver el heatmap funciona
- [x] Las rachas se calculan correctamente
- [x] El XP se gana automáticamente al completar tareas, hábitos, etc.
- [x] El nivel del usuario se actualiza al ganar XP
- [x] La wishlist funciona con todos los estados
- [x] El chatbot tiene acceso a todos los módulos hasta acá
- [x] `chore(fase-6): phase 6 complete`

---

## Fase 7 — Foco y Cerebro

> Objetivo: el Modo Foco es la experiencia de estudio definitiva. El Cerebro Secundario permite buscar en las notas con lenguaje natural.
> Estado 2026-06-17: implementación base aplicada. Pendiente operativo: ejecutar migración Supabase, configurar variables Gemini/Supabase, indexar notebooks reales y conectar un MCP NotebookLM si se instala uno compatible.

### 7.1 Módulo Foco — Temporizador

→ depende de: Fase 6 completa

- [x] Componente `PomodoroTimer.tsx` — temporizador con lógica de sesiones
- [x] Modo Pomodoro clásico: 25 min trabajo / 5 min descanso
- [x] Modo personalizable: el usuario define los intervalos
- [x] Selector de tarea activa para la sesión (dropdown de tareas pendientes)
- [x] Contador de sesiones completadas en el día
- [x] Al completar sesión: `addXP(userId, 'foco', sessionId, 5, 'Sesión de foco completada')`
- [x] Notificación haptica al finalizar (via Web Vibration API)
- [x] `feat(foco): add Pomodoro timer with task selector`

### 7.2 Módulo Foco — Pantalla dedicada

→ depende de: 7.1

- [x] Al activar el Modo Foco: ocultar sidebar, header y nav
- [x] Fondo `#0C0C0B` independientemente del modo claro/oscuro
- [x] Layout centrado: tarea activa (arriba, muted) + timer grande (centro) + controles (abajo)
- [x] Transición de entrada: fade a negro + aparición del timer (300ms)
- [x] Transición de salida: inversa
- [x] Botón "Salir del foco" visible pero discreto
- [x] `feat(foco): add dedicated focus screen UI`

### 7.3 Spotify en Modo Foco

→ depende de: 7.2

- [x] En `/configuracion`: el usuario ingresa la URL de su playlist de Spotify
- [x] En Modo Foco: iframe con Spotify Embed API mostrando la playlist
- [x] Si Spotify no carga: ocultar el iframe sin romper el layout (modo degradado)
- [x] `feat(foco): add Spotify playlist embed in focus mode`

### 7.4 IA en Foco

→ depende de: 7.1, 2.7

- [x] Backend `focus.suggestion` detecta múltiples tareas urgentes + hora del día óptima
- [ ] Gemini sugiere activar Modo Foco con recomendación generativa
- [ ] La sugerencia aparece como hint sutil en el Dashboard de Hoy
- [ ] `feat(foco): add AI focus mode suggestions`

### 7.5 Módulo Cerebro — Setup pgvector

→ depende de: Fase 6 completa

- [x] Habilitar extensión `pgvector` en Supabase (ya creada en Fase 0, ahora se activa en código)
- [x] Crear función `generateEmbedding(text)` usando `Gemini text-embedding-004`
- [x] Crear función `searchSimilar(userId, queryEmbedding, limit)` usando `<=>` de pgvector
- [x] `feat(cerebro): add pgvector embedding generation and similarity search`

### 7.6 Módulo Cerebro — NotebookLM MCP

→ depende de: 7.5

- [x] Evaluar disponibilidad del conector MCP de NotebookLM para esta sesión
- [ ] Instalar y configurar el conector MCP
- [x] Crear función `indexNotebook(notebookId, notes[])` que genera embeddings de las notas
- [x] Crear API route `POST /api/cerebro/index` — indexa un notebook manualmente
- [x] Vista del módulo Cerebro: lista de notebooks indexados con botón de reindexar
- [x] **Al eliminar nota o notebook**: `DELETE FROM note_embeddings WHERE notebook_id = $id AND user_id = $userId`
- [x] Implementación MCP-ready/manual para indexar contenido sin agregar servidor externo
- [ ] `feat(cerebro): add NotebookLM MCP integration with pgvector indexing`

### 7.7 Módulo Cerebro — Búsqueda semántica

→ depende de: 7.6

- [x] Cmd+K: si la query empieza con `@cerebro` o el router detecta intención de búsqueda de notas, llama al endpoint de búsqueda semántica
- [x] Chatbot: puede responder preguntas sobre el contenido de los notebooks usando los embeddings
- [x] Vista de resultados de búsqueda en el módulo Cerebro: lista de notas con snippet y link al notebook original
- [x] `feat(cerebro): add semantic search from Cmd+K and chatbot`

### ✅ Criterio de cierre de Fase 7

- [x] El Modo Foco activa la pantalla dedicada con transición correcta
- [x] El temporizador funciona en los dos modos (Pomodoro y personalizable)
- [x] La notificación haptica funciona al finalizar una sesión
- [x] Spotify se muestra embebido en el Modo Foco cuando hay playlist configurada
- [ ] Buscar "sistemas distribuidos" en el Cerebro devuelve notas relevantes de NotebookLM
- [x] Eliminar un notebook limpia los embeddings de la BD
- [x] El chatbot puede responder preguntas sobre el contenido de los notebooks indexados
- [ ] `chore(fase-7): phase 7 complete`

---

## Fase 8 — Pulido y Resiliencia

> Objetivo: la app está completa. El morning briefing funciona automáticamente. Todas las integraciones tienen degradación elegante. La app es robusta, rápida y sin errores conocidos.

### 8.1 Morning Briefing completo

→ depende de: Fase 7 completa

- [x] Crear un módulo principal llamado "inicio". Este módulo debe contener todos los resumenes/briefings, incluyendo el diario, el de gmail y el semanal. Además el diario y el semanal van a ser enviados por Telegram.
- [x] Añadir una frase motivadora (y buena) diaria a traves de una API.
- [x] Resumen estetico de todo lo que tiene la app. Incluir gráficos (simples, por ejemplo el heatmap), no solo texto.
- [x] Crear `lib/gemini/briefing.ts` — genera el briefing con todos los módulos activos
- [x] El briefing incluye: entregas próximas, tareas del día, saldo estimado, hábitos, clima, ítems bajo stock, avisos de Moodle, resumen de Gmail (si está configurado)
- [x] Actualizar cron job de las 8AM en `/api/cron/morning-briefing` con el briefing completo
- [x] El resumen de Gmail llama a la API y pasa el texto a Gemini para resumirlo en 2-3 líneas
- [x] Modo degradado: si Gmail no responde, el briefing se genera sin esa sección
- [ ] `feat(briefing): complete morning briefing with all modules`

### 8.2 Gmail Digest

→ depende de: 8.1

- [x] Configurar scope de Gmail en el OAuth de Google
- [x] Función `getRelevantEmails(userId)` — obtiene emails de las últimas 24h
- [x] Gemini los clasifica y extrae tareas o fechas relevantes
- [x] Las tareas extraídas se agregan automáticamente al módulo Tareas con UndoToast
- [ ] `feat(google): add Gmail digest with AI task extraction`

### 8.3 Resiliencia completa

→ depende de: 8.1

- [x] Auditar todas las llamadas a APIs externas en el proyecto
- [x] Verificar que **todas** pasan por `withFallback` de `lib/integrations/resilience.ts`
- [x] Implementar la barra de aviso de estado degradado en todos los módulos que la necesitan
- [ ] Probar cada modo de falla manualmente (desconectar cada servicio y verificar el comportamiento)
- [ ] `feat(resiliencia): ensure all integrations use withFallback with degraded state UI`

### 8.4 PWA Offline — IndexedDB

→ depende de: Fase 7 completa

- [x] Configurar service worker para cachear las vistas críticas (Dashboard, Hoy, Calendario)
- [x] Manejar IndexedDB con TypeScript mediante wrapper nativo, sin dependencia adicional
- [x] Las acciones offline (nueva tarea, nuevo gasto) se guardan en IndexedDB
- [x] Al recuperar la conexión: sync automático de IndexedDB con Supabase
- [x] Indicador visual "Sin conexión. Las vistas críticas siguen disponibles con datos cacheados"
- [x] Indicador de cola offline cuando nueva tarea/nuevo gasto queden en IndexedDB esperando sync
- [x] Probar flujo offline real en navegador local con service worker y servidor detenido
- [x] `feat(pwa): add offline support with IndexedDB sync`

### 8.5 Dashboard General completo

→ depende de: 8.1

- [x] Todos los widgets del Dashboard General funcionan con datos reales
- [x] Widget de clima: Open-Meteo, Tandil, temperatura + condición
- [x] Modo degradado del clima: "Clima no disponible" sin bloquear el dashboard
- [x] XP semanal con indicador de nivel
- [x] Novedades del campus con último aviso de Moodle
- [ ] `feat(dashboard): complete dashboard with all widgets`

### 8.6 Resumen semanal

→ depende de: 8.1

- [x] Cron job los domingos a las 20:00: genera y envía resumen semanal por Telegram
- [x] El resumen incluye: XP ganado, hábitos cumplidos vs total, gastos de la semana, entregas completadas, racha más larga
- [ ] `feat(briefing): add weekly summary on Sundays via Telegram`

### 8.7 Pulido general

→ depende de: 8.3, 8.4

- [x] Revisar todas las transiciones de página (slide para jerarquía, fade para tabs) según `design.md`
- [x] Verificar que `AiThinking` aparece en **todas** las llamadas a Gemini sin excepción
- [x] Verificar que `filter: grayscale(100%)` se aplica a todas las imágenes
- [x] Verificar que el accent `#2282fa` solo aparece en los contextos definidos en `design.md`
- [x] Auditar todos los strings de UI — seguir guía de voz de `design.md`
- [ ] Probar el flujo completo en iPhone instalado como PWA
- [x] Probar el flujo completo en desktop
- [ ] Revisar todos los errores activos en Sentry y corregirlos
- [ ] `chore(pulido): final UI polish and cross-platform testing`

### 8.8 Cron job — Papelera

→ depende de: Fase 2 completa (puede implementarse aquí)

- [x] Cron job diario a las 03:00 AM: limpia registros con `deleted_at < now() - interval '7 days'` en todas las tablas con papelera
- [x] `feat(undo): add daily cron job to clean 7-day trash`

### ✅ Criterio de cierre de Fase 8 — App completa

- [ ] El morning briefing llega por Telegram a las 8AM con datos reales de todos los módulos
- [ ] El resumen semanal llega los domingos
- [ ] Todas las integraciones muestran el estado degradado cuando fallan, sin romper la app
- [ ] La app funciona en modo offline para las vistas críticas
- [ ] No hay errores conocidos en Sentry
- [ ] El flujo completo funciona en iPhone (PWA) y en desktop
- [ ] Toda llamada a Gemini muestra `AiThinking`
- [ ] `chore(fase-8): phase 8 complete — Acrue v1.0 ready`

---

## Post-lanzamiento — Ideas para v2

> Estas features no están en el scope de v1. Se documentan aquí para no perderlas.

- **Exportar datos completos** — backup completo de toda la app en JSON
- **Integración con Mercado Pago** — importar movimientos automáticamente
- **Widget de iOS** — widget nativo en la pantalla de inicio del iPhone (requiere app nativa o Siri Shortcuts avanzados)
- **Modo estudio grupal** — sesiones de Pomodoro compartidas por Telegram
- **Análisis de notas con IA** — generar resúmenes automáticos de apuntes subidos en PDF
- **Themes** — variantes de color adicionales manteniendo el sistema monocromático base

---

*Acrue Roadmap v1.0 · Marzo 2026*
*Documentos relacionados: `PRD.md` · `design.md`*
