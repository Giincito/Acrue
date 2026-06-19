# Acrue — Product Requirements Document
**v3.0 · Marzo 2026 · Confidencial**

---

| Campo | Valor |
|---|---|
| Producto | Acrue — LifeOS personal |
| Implementación | Antigravity |
| Presupuesto | $0 — solo planes gratuitos |
| Stack principal | Next.js 15 · Supabase · Gemini 2.5 Flash-Lite · Vercel |
| Target inicial | Un usuario · PWA instalable · mobile-first |
| Idioma | Español (v1) |
| Carpeta del proyecto | `E:\Antigravity\Acrue` |
| Design system | Ver `design.md` |
| Roadmap detallado | Ver `roadmap.md` |

---

## Tabla de contenidos

1. [Product Overview](#1-product-overview)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [File Structure](#3-file-structure)
4. [Naming Patterns](#4-naming-patterns)
5. [Arquitectura General](#5-arquitectura-general)
6. [PWA — iPhone y Web](#6-pwa--iphone-y-web)
7. [Navegación y User Flow](#7-navegación-y-user-flow)
8. [Módulos y Sub-módulos](#8-módulos-y-sub-módulos)
9. [Capa de IA — Presencia en todos los módulos](#9-capa-de-ia--presencia-en-todos-los-módulos)
10. [Chatbot Persistente](#10-chatbot-persistente)
11. [Mecanismo de Undo — Gestión de errores de IA](#11-mecanismo-de-undo--gestión-de-errores-de-ia)
12. [Sistema de Notificaciones](#12-sistema-de-notificaciones)
13. [Manejo de Integraciones — Resiliencia](#13-manejo-de-integraciones--resiliencia)
14. [Esquema de Base de Datos](#14-esquema-de-base-de-datos)
15. [Seguridad y Privacidad](#15-seguridad-y-privacidad)
16. [GitHub Workflow](#16-github-workflow)
17. [Constraints — Guardrails para la implementación](#17-constraints--guardrails-para-la-implementación)
18. [Fases de Implementación](#18-fases-de-implementación)
19. [Glosario](#19-glosario)

---

## 1. Product Overview

Acrue es una plataforma web personal (PWA instalable) que centraliza la vida académica, financiera, doméstica y de hábitos de su usuario. El nombre proviene de *accrue* — acumular de forma continua y silenciosa. Cada hábito completado, cada gasto registrado, cada materia aprobada se acumula. Acrue hace visible ese progreso invisible.

La propuesta de valor central es la **colaboración de inteligencia artificial en todos los módulos del sistema**. La IA no es una feature aislada — es una capa transversal que entiende lenguaje natural, procesa imágenes, enruta intenciones y genera insights proactivos en cada parte de la app.

### Tagline
> *"It all adds up."*

### Principios de diseño

- **Cero fricción** — cualquier dato debe poder registrarse en menos de 3 segundos
- **IA en todos lados** — la inteligencia artificial colabora en cada módulo del sistema
- **Minimalismo intuitivo** — la simplicidad visual no sacrifica la claridad de uso
- **Presupuesto cero** — todo el stack usa exclusivamente planes gratuitos
- **Offline-first** — las vistas críticas funcionan sin conexión
- **Escalable** — diseñado para un usuario hoy, preparado para crecer
- **Resiliente** — las fallas de servicios externos nunca bloquean el uso de la app

---

## 2. Stack Tecnológico

> Costo total: **$0**. Todas las tecnologías usan plan gratuito suficiente para uso personal intensivo.

| Capa | Tecnología | Plan gratuito | Justificación |
|---|---|---|---|
| Frontend / PWA | Next.js 15 (App Router) | Vercel Hobby | RSC, PWA nativa, deploy automático |
| UI / Estilos | Tailwind CSS + shadcn/ui | Open source | Componentes accesibles y minimalistas |
| Backend | Next.js API Routes + tRPC | Mismo repo | Type-safety E2E sin servidor separado |
| Base de datos | Supabase (PostgreSQL) | 500 MB gratis | RLS, Realtime, Storage, pgvector |
| Auth | Supabase Auth + Google OAuth | Incluido | Un botón, sin fricción, un solo usuario |
| IA — motor principal | Gemini 2.5 Flash-Lite API | Free tier AI Studio | Router de intenciones, visión, NLP, chatbot |
| Embeddings / búsqueda | Gemini text-embedding-004 | Incluido en Gemini | Búsqueda semántica con pgvector |
| Cola de trabajos | Upstash Redis | 10k cmds/día gratis | Jobs async, sync Moodle, webhooks, undo queue |
| Telegram bot | Bot API (gratis) | Sin límite | Canal primario de notificaciones y captura rápida |
| Google Workspace | Calendar, Gmail, Meet, Tasks | Gratis (OAuth2) | Sincronización bidireccional |
| Campus UNICEN | Moodle REST API | Gratis (token) | Exámenes, entregas, avisos |
| Spotify | Spotify Embed API | Gratis | Playlist en Modo Foco |
| Clima | Open-Meteo API | Gratis, sin clave | Clima de Tandil sin costo |
| Tipo de cambio | dolarapi.com | Gratis | Conversión ARS/USD en tiempo real |
| Errores / logging | Sentry (free tier) | 5k errores/mes | Detección de bugs en producción |
| Deploy | Vercel Hobby | Gratis | CI/CD automático desde GitHub main |

---

## 3. File Structure

Todo el proyecto vive en `E:\Antigravity\Acrue`.

```
E:\Antigravity\Acrue
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── layout.tsx                # Layout con sidebar + chatbot
│   │   ├── page.tsx                  # Dashboard general
│   │   ├── hoy/
│   │   ├── semanal/
│   │   ├── calendario/
│   │   ├── tareas/
│   │   ├── proyectos/
│   │   ├── foco/
│   │   ├── estudio/
│   │   ├── cerebro/
│   │   ├── finanzas/
│   │   ├── despensa/
│   │   ├── recetas/
│   │   ├── habitos/
│   │   ├── wishlist/
│   │   └── configuracion/
│   └── api/
│       ├── ai/
│       │   ├── router/               # Router de intenciones Cmd+K
│       │   ├── chat/                 # Chatbot persistente
│       │   └── vision/               # Escaneo de tickets (efímero)
│       ├── undo/                     # Endpoint de deshacer acciones de IA
│       ├── telegram/                 # Webhook del bot
│       ├── moodle/                   # Sync con campus UNICEN
│       ├── google/                   # Google Workspace OAuth + APIs
│       └── cron/                     # Jobs automáticos
├── components/
│   ├── ui/                           # Componentes base (shadcn/ui)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── BottomNav.tsx
│   ├── shared/
│   │   ├── CmdK.tsx
│   │   ├── ChatBot.tsx               # Panel conversacional bottom-right
│   │   ├── AiThinking.tsx            # Micro-componente "Pensando..."
│   │   └── UndoToast.tsx             # Toast de deshacer post-acción IA
│   └── modules/
│       ├── Dashboard/
│       ├── Calendario/
│       ├── Tareas/
│       ├── Proyectos/
│       ├── Foco/
│       ├── Estudio/
│       ├── Cerebro/
│       ├── Finanzas/
│       ├── Despensa/
│       ├── Recetas/
│       ├── Habitos/
│       └── Wishlist/
├── lib/
│   ├── supabase/
│   ├── gemini/
│   │   ├── router.ts
│   │   ├── chat.ts
│   │   └── vision.ts                 # Procesa imagen y la elimina inmediatamente
│   ├── google/
│   ├── moodle/
│   ├── integrations/
│   │   └── resilience.ts             # Lógica de fallback para APIs externas
│   └── utils/
├── hooks/
├── types/
├── store/
├── public/
│   ├── icons/
│   └── manifest.json
├── supabase/
│   ├── migrations/
│   └── seed.ts
├── .env.local                        # NO commitear
├── .env.example                      # Sí commitear — sin valores
├── next.config.ts
├── tailwind.config.ts
├── PRD.md
├── design.md
└── roadmap.md
```

---

## 4. Naming Patterns

| Contexto | Convención | Ejemplo |
|---|---|---|
| Variables y funciones | `camelCase` | `getUserData`, `totalAmount`, `handleSubmit` |
| Componentes React | `PascalCase` | `UserCard.tsx`, `FinanceModule.tsx` |
| Archivos de página | `PascalCase` | `Dashboard.tsx`, `HabitTracker.tsx` |
| Hooks personalizados | `camelCase` con prefijo `use` | `useTaskStore.ts`, `useGemini.ts` |
| Rutas de URL | `kebab-case` | `/panel-estudio`, `/meal-tracker` |
| Tablas de base de datos | `snake_case` | `xp_events`, `task_tags` |
| Columnas de BD | `snake_case` | `user_id`, `created_at`, `due_date` |
| Variables de entorno | `SCREAMING_SNAKE_CASE` | `GEMINI_API_KEY`, `SUPABASE_URL` |
| Constantes globales | `SCREAMING_SNAKE_CASE` | `MAX_RETRY_ATTEMPTS` |
| Tipos TypeScript | `PascalCase` | `TaskStatus`, `ExpenseCategory` |
| Ramas de Git | `kebab-case` con prefijo | `feature/cmd-k`, `fix/moodle-sync` |
| Commits de Git | Conventional Commits | `feat: add expense scanner` |

### Conventional Commits

| Prefijo | Cuándo | Ejemplo |
|---|---|---|
| `feat:` | Nueva funcionalidad | `feat(finanzas): add expense scanner with Gemini Vision` |
| `fix:` | Bug | `fix(moodle): handle expired token gracefully` |
| `chore:` | Mantenimiento | `chore: update Gemini SDK to 2.5` |
| `docs:` | Documentación | `docs: update PRD with undo mechanism` |
| `refactor:` | Refactor sin cambio funcional | `refactor(tasks): extract useTaskStore hook` |
| `style:` | Estilos | `style(sidebar): adjust active item spacing` |
| `test:` | Tests | `test(ai-router): add intent detection unit tests` |

---

## 5. Arquitectura General

### 5.1 Capa de IA — Gemini 2.5 Flash-Lite

Gemini 2.5 Flash-Lite es el motor central de inteligencia de Acrue. Opera en dos modos:

**Modo router** — recibe texto, voz transcrita o imágenes, identifica la intención y devuelve un JSON estructurado para insertar en Supabase. Nunca escribe directamente a la base de datos.

**Modo chatbot** — recibe preguntas en lenguaje natural con contexto del usuario y responde de forma conversacional. Puede ejecutar acciones directamente desde el chat.

Todas las llamadas a Gemini se hacen desde **Next.js API Routes (servidor)**. Nunca desde el cliente.

#### Router de intenciones — tipos detectados

- Gasto / ingreso
- Tarea o recordatorio
- Evento de calendario
- Hábito
- Receta o ingrediente
- Nota libre
- Proyecto
- Item de wishlist

> Confianza > 90% → guarda directo + activa mecanismo de Undo (ver sección 11). Confianza < 90% → preview editable.

#### Flujo de escaneo de tickets — procesamiento efímero

El procesamiento de imágenes es **transitorio por diseño** para no agotar los 500 MB del plan gratuito de Supabase.

```
Imagen (PWA / Telegram)
        ↓
Subida temporal a Supabase Storage (signed URL, TTL: 60 segundos)
        ↓
Gemini Vision lee la imagen via URL temporal
        ↓
Extracción de JSON: { comercio, monto, items[], fecha, metodo_pago }
        ↓
INSERT en tabla `expenses` de Supabase
        ↓
DELETE inmediato de la imagen en Supabase Storage
        ↓
La imagen original nunca persiste en el sistema
```

### 5.2 Canales de entrada

| Canal | Tipos soportados | Destino |
|---|---|---|
| Cmd+K en app | Texto, comandos directos | Router de intenciones Gemini |
| Chatbot persistente | Texto conversacional, acciones | Chatbot Gemini con contexto |
| Bot de Telegram | Texto, voz transcrita, fotos | Router de intenciones Gemini |
| Apple Shortcuts / Siri | Texto dictado via HTTP POST | Router de intenciones Gemini |
| Formulario rápido PWA | Texto estructurado | Insert directo a Supabase |
| Foto de ticket | Imagen (PWA o Telegram) | Gemini Vision → efímero → Finanzas |

### 5.3 Sincronización Moodle UNICEN

1. El usuario ingresa credenciales UNICEN en Configuración — token via `login/token.php`
2. Cron job en Vercel cada **2 horas**
3. Extrae: fechas de exámenes/entregas, avisos del campus, inscripción a exámenes
4. Gemini procesa y crea tareas y eventos automáticamente
5. Credenciales encriptadas con `pgcrypto` — nunca en el cliente
6. Si Moodle no responde → degradación elegante (ver sección 13)

### 5.4 Google Workspace

OAuth2 único para todos los servicios:

- **Google Calendar** — sync bidireccional de entregas, exámenes y tareas
- **Gmail** — Gemini extrae tareas y eventos para el morning briefing
- **Google Meet** — links de clases virtuales en el Calendario de Acrue
- **Google Tasks** — sync bidireccional con módulo de Tareas

---

## 6. PWA — iPhone y Web

### Decisión arquitectónica: PWA sobre app nativa

Se descarta explícitamente el desarrollo de una app nativa iOS:

- **Apple Developer Program**: $99 USD/año — incompatible con "Presupuesto Cero"
- **App Store**: revisiones y aprobaciones que no aplican a un proyecto personal
- **Codebase duplicado**: Swift/SwiftUI separado del stack Next.js

La **PWA es el único camino compatible** con presupuesto cero que permite instalación en Home Screen, soporte offline y experiencia de app completa sin intermediarios ni costos.

### Comportamiento por plataforma

**iPhone (Safari):**
- Safari → "Agregar a pantalla de inicio" → instalada como app con ícono de Acrue
- Modo `standalone` sin barra de Safari
- Push notifications de iOS Safari son inconsistentes → Telegram es el canal primario
- Cámara nativa disponible para escaneo de tickets

**Desktop (Chrome / Edge / Safari):**
- El navegador ofrece instalar → ventana dedicada sin chrome del browser
- `⌘K` como atajo principal

### Consideraciones de uso

- **iPhone** → captura rápida, escaneo de tickets, consultas al chatbot en movimiento
- **Desktop** → gestión de módulos, revisión semanal, configuración, trabajo de largo aliento

### Implementación

```ts
// next.config.ts
import withPWA from 'next-pwa'
const config = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})
```

```json
// public/manifest.json
{
  "name": "Acrue",
  "short_name": "Acrue",
  "theme_color": "#0C0C0B",
  "background_color": "#0C0C0B",
  "display": "standalone",
  "start_url": "/",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-180.png", "sizes": "180x180", "type": "image/png" }
  ]
}
```

```html
<!-- app/layout.tsx -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Acrue" />
<link rel="apple-touch-icon" href="/icons/icon-180.png" />
```

### Offline

Funciona sin conexión via service worker + IndexedDB:
- Dashboard General (última versión cacheada)
- Vista de Hoy y Tareas
- Calendario (últimas 4 semanas)

Las acciones offline se guardan en IndexedDB y se sincronizan al recuperar conexión.

---

## 7. Navegación y User Flow

### 7.1 Estructura de navegación

Sidebar con 4 grupos semánticos. Sub-vistas como tabs dentro de cada módulo. Máximo 2 clicks desde cualquier punto.

| Grupo | Módulos en sidebar | Sub-vistas (tabs internos) |
|---|---|---|
| **General** | Dashboard · Hoy · Semanal · Calendario | Calendario: Vista mensual · Vista semanal · Recordatorios |
| **Productividad** | Tareas · Proyectos · Foco | Tareas: Inbox · Hoy · Semana · Backlog |
| **Académico** | Estudio · Cerebro | Estudio: Materias · Exámenes · Promedio · Campus UNICEN |
| **Vida** | Finanzas · Despensa · Recetas · Hábitos · Wishlist | Finanzas: Dashboard · Gastos · Suscripciones · Metas |

### 7.2 Elementos persistentes en todas las pantallas

1. **Cmd+K** — `⌘K` en desktop, botón central en bottom tab bar en mobile
2. **Chatbot** — botón flotante abajo a la derecha
3. **Sidebar / Bottom Nav** — navegación principal

### 7.3 Mobile — Bottom Tab Bar

```
[Dashboard]  [Tareas]  [⊕ Cmd+K]  [Finanzas]  [Más]
```

"Más" → drawer con todos los módulos en los 4 grupos. El chatbot es un botón flotante separado.

### 7.4 Flujo del Cmd+K

1. `⌘K` — modal se abre con animación slide+fade
2. Usuario escribe: `"Gasté 4800 en el súper"`
3. Gemini procesa (debounce 400ms) — `AiThinking` micro-componente activo
4. Si confianza > 90%: guarda directo + `UndoToast` (5 segundos)
5. Si confianza < 90%: preview editable — Enter confirma, Esc cancela
6. Modal se cierra — dato en el módulo correspondiente

### 7.5 Comandos directos del Cmd+K

```
/hoy        → vista de tareas de hoy
/semana     → vista semanal
/gasto      → formulario rápido de gasto
/tarea      → nueva tarea
/nota       → nueva nota
/foco       → activa el Modo Foco
/deshacer   → deshace la última acción de IA
```

---

## 8. Módulos y Sub-módulos

### 8.1 Dashboard General

- Widget de clima — Tandil, Open-Meteo
- Resumen de tareas — las 3 más urgentes del día
- Próximas entregas académicas — próximos 7 días
- Widget financiero — saldo estimado del mes
- Hábitos de hoy — progreso en formato compacto
- XP semanal — puntos con indicador de nivel
- Novedades del campus — últimos avisos de Moodle
- **IA:** morning briefing diario por Telegram a las 8:00 AM

---

### 8.2 Calendario

- Vista mensual y semanal con bloques de tiempo
- Recordatorios con notificación vía Telegram (primario)
- Fuentes: Google Calendar, tareas con fecha, entregas Moodle, vencimientos de suscripciones
- Google Meet — links de clases virtuales en el evento
- Sync bidireccional con Google Calendar
- **IA:** detecta conflictos de agenda y sugiere reorganización

---

### 8.3 Tareas

- Inbox, Hoy, Semana, Backlog
- Etiquetas: `@hogar`, `@universidad`, `@personal`, `@compras`
- Recurrencia — iCal RRULE
- Prioridades — urgente, normal, bajo
- Sync bidireccional con Google Tasks
- **IA:** clasifica contexto, sugiere prioridad, detecta duplicados

---

### 8.4 Proyectos

- Proyecto con nombre, descripción, fecha límite, estado
- Tareas asociadas con barra de progreso automática
- Estados: `Activo`, `En pausa`, `Completado`, `Archivado`
- **IA:** desglosa un proyecto en tareas con lenguaje natural

---

### 8.5 Foco

- Pomodoro clásico (25/5) y temporizador personalizable
- Selector de tarea activa
- Playlist de Spotify embebida (Spotify Embed API)
- Pantalla dedicada — fondo `#0C0C0B`, sin nav
- Notificación haptica al finalizar sesión (fallback sin Telegram)
- **IA:** sugiere cuándo activar el Modo Foco

---

### 8.6 Estudio

- Materias con créditos, estado y correlativas
- Parciales y exámenes con peso en promedio y nota
- Calculadora de promedio ponderado automática
- Carga horaria semanal
- Alertas de inscripción a exámenes
- Campus UNICEN — sync Moodle cada 2h
- Pre-configurado para Ing. en Sistemas UNICEN, configurable para cualquier carrera
- **IA:** plan de estudio según fechas, resumen de novedades de Moodle

---

### 8.7 Cerebro Secundario

- Integración con NotebookLM via MCP
- Búsqueda semántica con pgvector en Supabase
- Desde Cmd+K o Chatbot: *"¿qué anotamos sobre sistemas distribuidos?"*
- Al eliminar nota o notebook → limpieza automática de embeddings en pgvector (ver sección 15)
- **IA:** resume notebooks, conecta ideas, responde preguntas sobre el contenido

---

### 8.8 Finanzas

- Registro rápido — Cmd+K, Chatbot, Telegram, Siri, formulario
- Escaneo de tickets — procesamiento efímero (imagen → JSON → delete, ver sección 5.1)
- Categorías personalizables
- Panel de suscripciones con alerta previa vía Telegram
- Metas de ahorro con barra de progreso
- Conversión ARS/USD — dolarapi.com en tiempo real
- Exportar historial a CSV
- **IA:** categorización automática, análisis predictivo de saldo, alertas de gasto excesivo

---

### 8.9 Despensa

- Inventario con cantidad, unidad y stock mínimo
- Alerta automática vía Telegram cuando ítem cae bajo el mínimo
- **Lista de compras** — sub-módulo con ítems faltantes y comparador de tiendas
- Historial de consumo
- **IA:** predice agotamiento, genera lista de compras proactiva

---

### 8.10 Recetas

- Administrador con ingredientes, instrucciones, calorías, dieta
- Filtros por dieta, calorías, ingredientes disponibles, favoritas
- Sugeridor de recetas con inventario actual
- **Meal Tracker** — registro diario de comidas con calorías
- Plan semanal de comidas
- **IA:** sugiere recetas por inventario y calorías, genera plan semanal balanceado

---

### 8.11 Hábitos / XP

- Hábitos con frecuencia configurable
- Rachas con contador de días
- Heatmap estilo GitHub (últimos 4 meses)
- XP por hábitos, tareas, entregas, metas, wishlist
- Niveles de usuario con nombres/títulos
- `xp_events` es append-only — `SUM(xp_delta)` siempre
- **Recalibración XP:** si se detecta un bug, el backend inserta un evento de ajuste con `source_type: 'recalibration'` y descripción del motivo. La integridad de la suma se mantiene siempre.
- **IA:** detecta patrones de inconsistencia, sugiere horarios óptimos

---

### 8.12 Wishlist

- Ítems con nombre, precio, tienda, prioridad, URL
- Estados: `Deseado`, `Guardado para después`, `Comprado`
- **IA:** cruza saldo disponible con ítems, sugiere momento óptimo de compra

---

## 9. Capa de IA — Presencia en todos los módulos

| Módulo | Rol de la IA |
|---|---|
| Cmd+K | Router de intenciones. JSON para Supabase. Undo automático si confianza > 90%. |
| Chatbot | Responde preguntas conversacionales con contexto completo. Ejecuta acciones. |
| Escaneo de tickets | Gemini Vision extrae datos. Imagen eliminada inmediatamente tras procesamiento. |
| Dashboard | Morning briefing diario. Enviado por Telegram a las 8:00 AM. |
| Calendario | Detecta conflictos de agenda. Sugiere reorganización. |
| Tareas | Clasifica contexto, sugiere prioridad, detecta duplicados. |
| Proyectos | Desglosa proyectos en tareas con lenguaje natural. |
| Foco | Sugiere cuándo activar Modo Foco según carga del día. |
| Estudio | Plan de estudio según fechas. Resume Moodle en lenguaje simple. |
| Cerebro | Búsqueda semántica. Resume y conecta ideas entre notas. |
| Finanzas | Categorización automática. Análisis predictivo. Alertas de gasto. |
| Despensa | Predice agotamiento de ingredientes. Lista de compras proactiva. |
| Recetas | Sugiere recetas por inventario y calorías. Plan semanal. |
| Hábitos | Patrones de inconsistencia. Horarios óptimos. |
| Wishlist | Cruza saldo con ítems. Momento óptimo de compra. |
| Gmail Digest | Extrae tareas y fechas relevantes para el briefing diario. |

---

## 10. Chatbot Persistente

### Concepto

Panel conversacional flotante en la esquina inferior derecha. Siempre disponible en todas las pantallas. Para consultas complejas, históricas o que requieren contexto de varios módulos.

### Diferencia con Cmd+K

| Cmd+K | Chatbot |
|---|---|
| Registro rápido de datos | Consultas conversacionales |
| Acción puntual | Diálogo de múltiples turnos |
| Desaparece al confirmar | Persiste hasta que el usuario lo cierra |
| Una intención clara | Preguntas complejas o ambiguas |

### Ejemplos de uso

```
"¿Cuánto gasté en transporte en las últimas dos semanas?"
"¿Qué tareas tengo para el jueves relacionadas a la limpieza del hogar?"
"¿Qué comí anteayer? Me gustaría repetirlo, añadelo para hoy."
"¿Cuántas horas estudié esta semana?"
"¿Qué recetas puedo hacer con lo que tengo en la despensa ahora?"
"Moveme todas las tareas de hoy para mañana, tengo un parcial."
"¿Cuál es mi racha más larga en hábitos?"
"Resumen de mis gastos de este mes por categoría."
```

### Comportamiento

- Acceso de **lectura a todos los módulos** via Supabase
- Puede ejecutar **acciones directas** cuando el usuario lo pide
- Historial en **memoria de sesión** — no persiste entre sesiones (sin costo de tokens)
- Gemini recibe un **snapshot resumido** de los datos relevantes — no toda la BD
- Acciones ejecutadas: misma regla que Cmd+K — confianza > 90% directo + Undo disponible

### UI

```
Estado cerrado:
  Botón circular 52px — isotipo de Acrue — fondo #0C0C0B
  Badge opcional si hay briefing nuevo

Estado abierto:
  Panel 360px × 520px en desktop / full screen en mobile
  Header: "Acrue" + botón cerrar
  Área de mensajes con scroll
  AiThinking micro-componente durante procesamiento
  Input: "Preguntá algo..."
```

---

## 11. Mecanismo de Undo — Gestión de errores de IA

### El problema

Cuando la IA tiene confianza > 90% y guarda directo, puede cometer errores de interpretación. Por ejemplo: *"Gasté 500 en taxi"* podría categorizarse incorrectamente o el monto podría parsearse mal.

### Solución — Undo en dos capas

#### Capa 1: UndoToast inmediato (5 segundos)

Cada acción con confianza > 90% genera un toast:

```
[✓ Gasto registrado — Supermercado $4.800]  [Deshacer]  ×
```

- Dura **5 segundos**
- Durante esos 5s la acción está en **cola de confirmación en Upstash Redis**
- Si el usuario presiona "Deshacer" → se revierte antes de persistir definitivamente
- Si expira → se confirma en Supabase

#### Capa 2: `/deshacer` y Papelera temporal (7 días)

Para errores detectados después del toast:

- `/deshacer` en Cmd+K o Chatbot → deshace la **última acción de IA** de la sesión
- Cada módulo tiene una **Papelera temporal** en Configuración del módulo
  - Últimos 20 registros creados/modificados por IA en los últimos 7 días
  - El usuario puede restaurar o eliminar permanentemente
  - Limpieza automática después de 7 días (cron job)

### Implementación

```ts
// Flujo con Undo:
// 1. IA determina acción con confianza > 90%
// 2. INSERT en Supabase + guarda en Redis con TTL 5s: { action, recordId, userId }
// 3. UndoToast aparece en pantalla
// 4a. Si Deshacer → UPDATE deleted_at = now() en Supabase + DELETE de Redis
// 4b. Si expira → el registro queda activo (ya fue insertado en paso 2)
//
// La papelera usa columna `deleted_at` en cada tabla relevante
// Los registros con deleted_at != null no aparecen en la UI normal
// Vista filtrada: WHERE deleted_at IS NOT NULL AND deleted_at > now() - interval '7 days'
```

### Qué se puede deshacer

| Acción | Método disponible |
|---|---|
| Crear gasto | Toast 5s + `/deshacer` + Papelera |
| Crear tarea | Toast 5s + `/deshacer` + Papelera |
| Crear evento | Toast 5s + `/deshacer` |
| Modificar tarea existente | Toast 5s + `/deshacer` |
| Registrar meal | Toast 5s + Papelera |
| Marcar tarea como completada | Toast 5s |

---

## 12. Sistema de Notificaciones

### Canal primario: Telegram

Las notificaciones Web Push en iOS Safari son inconsistentes. **Telegram es el canal oficial y primario** para todas las alertas críticas.

| Tipo | Canal | Timing |
|---|---|---|
| Morning Briefing diario | Telegram | 8:00 AM todos los días |
| Entrega académica próxima | Telegram | 48h y 24h antes |
| Inscripción a examen abierta | Telegram | Al detectarse en Moodle |
| Ítem bajo stock mínimo | Telegram | Al detectarse |
| Suscripción próxima a vencer | Telegram | 7 días y 1 día antes |
| Recordatorio manual | Telegram + push local | En el horario definido |
| Resumen semanal | Telegram | Domingos a las 20:00 |

### Canal secundario: Notificaciones locales PWA

Solo donde su comportamiento es predecible:

- **Modo Foco** — vibración haptica al finalizar sesión Pomodoro (funciona sin internet)
- **Recordatorios locales** — fallback si el usuario no tiene Telegram configurado

### Configuración

En Configuración el usuario puede:
- Vincular cuenta de Telegram con el bot de Acrue (via `/start` en @AcrueBot)
- Elegir qué notificaciones recibir por Telegram
- Configurar horario del morning briefing (default 8:00 AM)
- Timezone (default `America/Argentina/Buenos_Aires`)

---

## 13. Manejo de Integraciones — Resiliencia

Las integraciones externas pueden fallar. La app **nunca debe bloquearse** por una falla de servicio externo.

### Estados de integración

```
CONECTADO   → funciona normalmente
DEGRADADO   → mostrando caché de últimos datos conocidos
OFFLINE     → módulo deshabilitado con mensaje claro
```

### Comportamiento por integración

| Integración | Si falla | Fallback |
|---|---|---|
| **Moodle UNICEN** | Muestra últimos datos con timestamp. Badge "Última sync: hace Xh". No bloquea el resto de Estudio. | Caché en Supabase de última respuesta exitosa |
| **Google Calendar** | Calendario de Acrue funciona con eventos propios. Eventos de GCal con indicador "Sin sincronizar". | Datos en `calendar_events` de Supabase |
| **Google Tasks** | Tareas de Acrue siguen funcionando. Sync se reintenta en background. | Datos locales en Supabase |
| **Gmail** | Morning briefing omite resumen de Gmail e indica "Gmail no disponible". | Briefing se genera sin esa sección |
| **Spotify** | En Modo Foco se oculta el reproductor: "Spotify no disponible. El temporizador sigue activo." | Pomodoro funciona sin música |
| **dolarapi.com** | Montos en USD muestran último tipo de cambio conocido con timestamp. | Caché del último valor en Redis |
| **Open-Meteo** | Widget de clima muestra "Clima no disponible" — no bloquea el Dashboard. | Falla silenciosa |
| **Gemini API** | Cmd+K muestra "IA no disponible. Podés usar los formularios directamente." | Formularios manuales siempre disponibles |

### Implementación

```ts
// lib/integrations/resilience.ts
async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  cacheKey?: string
): Promise<{ data: T; fromCache: boolean; error?: string }> {
  try {
    const data = await fn()
    if (cacheKey) await redis.set(cacheKey, JSON.stringify(data), { ex: 7200 })
    return { data, fromCache: false }
  } catch (error) {
    const cached = cacheKey ? await redis.get(cacheKey) : null
    return {
      data: cached ? JSON.parse(cached as string) : fallback,
      fromCache: !!cached,
      error: 'Servicio no disponible'
    }
  }
}
```

### UI de estado degradado

Barra sutil en la parte superior del módulo afectado:

```
[⚠ Moodle — mostrando datos de hace 3 horas. Reintentar →]
```

Color `Stone #888884` sobre `Linen` — nunca rojo alarmante. La información está, puede estar desactualizada.

---

## 14. Esquema de Base de Datos

> PostgreSQL en Supabase con RLS en todas las tablas.
> IDs: `uuid` con `gen_random_uuid()`. Timestamps: UTC con timezone. Convención: `snake_case`.

### 14.1 Core

```sql
-- Gestionada por Supabase Auth
users (
  id              uuid PK,
  email           text NOT NULL,
  settings        jsonb,
  created_at      timestamptz DEFAULT now()
)

-- APPEND-ONLY. NUNCA UPDATE ni DELETE.
-- xp_delta puede ser negativo para recalibraciones
xp_events (
  id              uuid PK,
  user_id         uuid FK → users.id NOT NULL,
  source_type     text NOT NULL,  -- task|habit|assignment|finance_goal|wishlist|recalibration
  source_id       uuid,
  xp_delta        integer NOT NULL,
  description     text,
  created_at      timestamptz DEFAULT now()
)
```

### 14.2 Tareas y Proyectos

```sql
tasks (
  id              uuid PK,
  user_id         uuid FK → users.id NOT NULL,
  project_id      uuid FK → projects.id,
  title           text NOT NULL,
  context_tag     text,
  status          text NOT NULL DEFAULT 'inbox',
  priority        integer NOT NULL DEFAULT 2,
  due_at          timestamptz,
  completed_at    timestamptz,
  is_recurring    boolean NOT NULL DEFAULT false,
  recurrence_rule text,
  source          text,           -- app|telegram|siri|chatbot
  metadata        jsonb,
  deleted_at      timestamptz,    -- papelera: NULL=activo, NOT NULL=eliminado
  created_at      timestamptz DEFAULT now()
)

task_tags (
  id              uuid PK,
  task_id         uuid FK → tasks.id NOT NULL,
  label           text NOT NULL
)

projects (
  id              uuid PK,
  user_id         uuid FK → users.id NOT NULL,
  name            text NOT NULL,
  description     text,
  due_at          timestamptz,
  status          text NOT NULL DEFAULT 'active',
  created_at      timestamptz DEFAULT now()
)
```

### 14.3 Estudio

```sql
subjects (
  id              uuid PK,
  user_id         uuid FK → users.id NOT NULL,
  name            text NOT NULL,
  code            text,
  credits         integer NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'pending',
  target_grade    float,
  final_grade     float,
  prerequisites   uuid[],
  weekly_hours    integer,
  created_at      timestamptz DEFAULT now()
)

assignments (
  id              uuid PK,
  subject_id      uuid FK → subjects.id NOT NULL,
  title           text NOT NULL,
  type            text NOT NULL,  -- tp|parcial|final|quiz|proyecto
  weight          float,
  grade           float,
  due_at          timestamptz,
  completed       boolean NOT NULL DEFAULT false,
  gcal_event_id   text,
  deleted_at      timestamptz,
  created_at      timestamptz DEFAULT now()
)
```

### 14.4 Finanzas

```sql
categories (
  id              uuid PK,
  user_id         uuid FK → users.id NOT NULL,
  name            text NOT NULL,
  icon            text,
  created_at      timestamptz DEFAULT now()
)

-- NOTA: No existe columna receipt_url.
-- Las imágenes de tickets son efímeras y nunca persisten en Supabase Storage.
expenses (
  id              uuid PK,
  user_id         uuid FK → users.id NOT NULL,
  amount          numeric NOT NULL,
  currency        text NOT NULL DEFAULT 'ARS',
  category_id     uuid FK → categories.id,
  description     text,
  date            date NOT NULL,
  source          text,           -- manual|telegram|siri|scan|chatbot
  deleted_at      timestamptz,
  created_at      timestamptz DEFAULT now()
)

subscriptions (
  id              uuid PK,
  user_id         uuid FK → users.id NOT NULL,
  name            text NOT NULL,
  amount          numeric NOT NULL,
  currency        text NOT NULL DEFAULT 'ARS',
  renewal_date    date NOT NULL,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now()
)

saving_goals (
  id              uuid PK,
  user_id         uuid FK → users.id NOT NULL,
  name            text NOT NULL,
  target_amount   numeric NOT NULL,
  current_amount  numeric NOT NULL DEFAULT 0,
  deadline        date,
  created_at      timestamptz DEFAULT now()
)
```

### 14.5 Despensa y Recetas

```sql
pantry_items (
  id              uuid PK,
  user_id         uuid FK → users.id NOT NULL,
  name            text NOT NULL,
  quantity        numeric NOT NULL DEFAULT 0,
  unit            text NOT NULL,  -- g|kg|ml|l|unidades
  min_stock       numeric NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
)

stores (
  id              uuid PK,
  user_id         uuid FK → users.id NOT NULL,
  name            text NOT NULL,
  created_at      timestamptz DEFAULT now()
)

store_prices (
  id              uuid PK,
  store_id        uuid FK → stores.id NOT NULL,
  pantry_item_id  uuid FK → pantry_items.id NOT NULL,
  price           numeric NOT NULL,
  updated_at      timestamptz DEFAULT now()
)

shopping_list (
  id              uuid PK,
  user_id         uuid FK → users.id NOT NULL,
  pantry_item_id  uuid FK → pantry_items.id,
  name            text NOT NULL,
  quantity        numeric,
  unit            text,
  checked         boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now()
)

recipes (
  id              uuid PK,
  user_id         uuid FK → users.id NOT NULL,
  name            text NOT NULL,
  instructions    text,
  calories        integer,
  diet_tags       text[],
  is_favorite     boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now()
)

recipe_ingredients (
  id              uuid PK,
  recipe_id       uuid FK → recipes.id NOT NULL,
  pantry_item_id  uuid FK → pantry_items.id NOT NULL,
  quantity        numeric NOT NULL,
  unit            text NOT NULL
)

meal_log (
  id              uuid PK,
  user_id         uuid FK → users.id NOT NULL,
  recipe_id       uuid FK → recipes.id,
  description     text,
  calories        integer,
  deleted_at      timestamptz,
  logged_at       timestamptz DEFAULT now()
)
```

### 14.6 Hábitos

```sql
habits (
  id              uuid PK,
  user_id         uuid FK → users.id NOT NULL,
  name            text NOT NULL,
  frequency       text NOT NULL,  -- daily|weekly|custom
  days_of_week    integer[],      -- [1,3,5] = lun, mié, vie
  time_of_day     time,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now()
)

-- APPEND-ONLY. Un registro por completado.
habit_logs (
  id              uuid PK,
  habit_id        uuid FK → habits.id NOT NULL,
  completed_at    timestamptz DEFAULT now()
)
```

### 14.7 Calendario, Recordatorios y Cerebro

```sql
reminders (
  id              uuid PK,
  user_id         uuid FK → users.id NOT NULL,
  title           text NOT NULL,
  remind_at       timestamptz NOT NULL,
  repeat_rule     text,
  via_telegram    boolean NOT NULL DEFAULT true,
  via_push        boolean NOT NULL DEFAULT false,
  completed       boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now()
)

calendar_events (
  id              uuid PK,
  user_id         uuid FK → users.id NOT NULL,
  title           text NOT NULL,
  start_at        timestamptz NOT NULL,
  end_at          timestamptz,
  gcal_event_id   text,
  meet_url        text,
  source          text NOT NULL,  -- manual|google|moodle
  created_at      timestamptz DEFAULT now()
)

-- Embeddings del Cerebro Secundario
-- Al eliminar nota o notebook → DELETE de los vectores asociados (automático)
note_embeddings (
  id              uuid PK,
  user_id         uuid FK → users.id NOT NULL,
  notebook_id     text NOT NULL,
  note_id         text NOT NULL,
  content_hash    text NOT NULL,
  embedding       vector(768),    -- pgvector — dimensión Gemini text-embedding-004
  created_at      timestamptz DEFAULT now()
)
```

### 14.8 Wishlist

```sql
wishlist_items (
  id              uuid PK,
  user_id         uuid FK → users.id NOT NULL,
  name            text NOT NULL,
  description     text,
  price           numeric,
  currency        text DEFAULT 'ARS',
  store           text,
  url             text,
  priority        integer NOT NULL DEFAULT 2,
  status          text NOT NULL DEFAULT 'wanted',  -- wanted|saved|purchased
  created_at      timestamptz DEFAULT now()
)
```

---

## 15. Seguridad y Privacidad

### 15.1 Reglas generales

- **Ninguna API key en el frontend** — todo desde API Routes
- `.env.local` **nunca se commitea** — `.env.example` existe sin valores
- Credenciales Moodle **encriptadas** con `pgcrypto`
- Tokens Google OAuth en Supabase Auth — nunca en `localStorage`
- **RLS habilitado** en todas las tablas
- Cron jobs autenticados con `CRON_SECRET`

### 15.2 Privacidad del Cerebro Secundario

Los embeddings siguen el ciclo de vida del contenido original:

```sql
-- Al eliminar una nota específica:
DELETE FROM note_embeddings WHERE note_id = $noteId AND user_id = $userId;

-- Al eliminar un notebook completo:
DELETE FROM note_embeddings WHERE notebook_id = $notebookId AND user_id = $userId;
```

Esta limpieza es **automática** — se ejecuta via webhook de MCP o como parte del flujo de eliminación en el módulo Cerebro. Los vectores de contenido eliminado nunca permanecen en el sistema.

### 15.3 Variables de entorno

| Variable | Descripción | Contexto |
|---|---|---|
| `GEMINI_API_KEY` | Clave Google AI Studio | Solo servidor |
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública Supabase | Cliente + servidor |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima (RLS activo) | Cliente |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service role | Solo servidor |
| `GOOGLE_CLIENT_ID` | OAuth2 client ID | Solo servidor |
| `GOOGLE_CLIENT_SECRET` | OAuth2 client secret | Solo servidor |
| `TELEGRAM_BOT_TOKEN` | Token del bot | Solo servidor |
| `UPSTASH_REDIS_REST_URL` | URL REST de Upstash Redis | Solo servidor |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST de Upstash Redis | Solo servidor |
| `SENTRY_DSN` | DSN Sentry | Servidor + cliente |
| `MOODLE_ENCRYPTION_KEY` | Clave encriptación credenciales | Solo servidor |
| `CRON_SECRET` | Token autenticación cron jobs | Solo servidor |

### 15.4 Autenticación

- Login via Google OAuth — Supabase Auth maneja el flujo
- Sesiones en **cookies HttpOnly** — nunca `localStorage`
- Rutas protegidas en **middleware de Next.js**
- Bot de Telegram valida `chat_id` del usuario autorizado
- Endpoints cron validan `Authorization: Bearer ${CRON_SECRET}`

### 15.5 Error tracking — Sentry

- 5k errores/mes en free tier
- Contexto de error sin datos personales del usuario
- Alertas por email ante errores nuevos en producción

---

## 16. GitHub Workflow

### 16.1 Ramas

- `main` — protegida, siempre deployable, deploy automático a Vercel
- `feature/nombre-feature` — una rama por feature, merge a main via PR
- `fix/nombre-bug` — correcciones de bugs

### 16.2 Flujo por feature

```
1. git checkout -b feature/undo-mechanism
2. Desarrollo con commits incrementales durante el desarrollo
3. Commit final: git commit -m "feat(undo): add toast undo and 7-day trash bin"
4. git push origin feature/undo-mechanism
5. Pull Request — descripción + capturas si hay cambios visuales
6. Vercel genera preview deployment automático por el PR
7. Merge a main cuando la feature está completa y probada
8. Deploy automático a producción desde main
```

### 16.3 Por qué un commit por feature

Permite `git revert` limpio de una feature completa sin afectar otras. Historial legible. Cada estado anterior del proyecto es restaurable con precisión.

---

## 17. Constraints — Guardrails para la implementación

### 17.1 Arquitectura

- Nunca llamar a APIs externas desde el cliente — siempre desde API Routes
- Nunca escribir directamente a Supabase desde lógica de IA — la IA propone JSON, el servidor escribe
- `xp_events` y `habit_logs` son **append-only** — nunca `UPDATE` ni `DELETE`
- Nunca hardcodear API keys ni credenciales en el código
- Toda lógica de negocio compleja en `lib/` — nunca inline en componentes

### 17.2 Presupuesto

- Costo total: **$0** — cualquier decisión que requiera pago debe consultarse
- Imágenes de tickets: **procesamiento efímero** — nunca almacenamiento permanente
- Gemini: debounce 400ms en Cmd+K, cache de respuestas similares en Redis
- Supabase 500MB: no almacenar archivos binarios, solo JSON y texto

### 17.3 UI y experiencia

- Design system en `design.md` — no desviarse sin justificación
- Máximo **2 clicks** de distancia para cualquier función
- Toda imagen renderizada en escala de grises: `filter: grayscale(100%)`
- Único color cromático: accent `#2282fa`
- No usar font-weight 600 ni 700 — máximo 500
- Solo animaciones funcionales — dentro de `prefers-reduced-motion`
- El micro-componente `AiThinking` debe aparecer en **toda** llamada a Gemini — sin excepciones

### 17.4 Notificaciones

- **Telegram es el canal primario** para alertas críticas — nunca depender solo de push PWA en iOS
- El Modo Foco usa haptic local como único fallback sin Telegram

### 17.5 Privacidad

- Al eliminar notas o notebooks → **limpiar embeddings en pgvector** automáticamente
- Imágenes de tickets → **eliminar de Supabase Storage** inmediatamente tras procesamiento

### 17.6 Undo y errores de IA

- Toda acción de IA con confianza > 90% **debe** mostrar el `UndoToast`
- La columna `deleted_at` debe existir en todas las tablas donde la IA puede crear registros
- Los registros en papelera se limpian automáticamente después de 7 días via cron

### 17.7 Resiliencia

- Toda llamada a API externa debe pasar por `withFallback()` de `lib/integrations/resilience.ts`
- El estado degradado debe ser visible al usuario con la barra de aviso — nunca falla silenciosa que confunda

### 17.8 Idioma y voz

- Interfaz en **español únicamente** en v1
- Sin emojis en la interfaz — solo en Telegram si necesario
- Seguir guía de voz en `design.md`: sin celebraciones ruidosas, sin verbosidad

### 17.9 Scope

- **Un único usuario** en v1 — no construir multi-tenancy
- No implementar features fuera del PRD sin consultar
- Historial del chatbot **no persiste** en BD en v1 — solo memoria de sesión

---

## 18. Fases de Implementación

> Ver `roadmap.md` para el desglose detallado con tareas específicas y dependencias.

| Fase | Nombre | Contenido | Semanas |
|---|---|---|---|
| **0** | Fundamentos | Setup Next.js 15 + Supabase + Vercel. Auth Google OAuth. Schema DB completo con `deleted_at`. PWA manifest + iPhone config. Sidebar vacía. Cmd+K placeholder. Chatbot placeholder. `AiThinking` componente. `UndoToast` componente. Wrapper `withFallback`. | 1–2 |
| **1** | Tareas y Calendario | Módulo Tareas completo. Módulo Calendario. Recordatorios. Sync Google Calendar + Tasks. Bot Telegram + vinculación de cuenta. Notificaciones vía Telegram activas. | 3–5 |
| **2** | IA Core + Undo | Gemini 2.5 Flash-Lite: router de intenciones en Cmd+K y Telegram. Confianza >90% con UndoToast. Papelera temporal 7 días. `/deshacer`. Escaneo de tickets efímero. **Chatbot funcional** con acceso a Tareas y Calendario. | 6–7 |
| **3** | Estudio y Proyectos | Módulo Estudio. Integración Moodle UNICEN con degradación elegante. Calculadora de promedio. Módulo Proyectos. Chatbot con acceso a Estudio. | 8–10 |
| **4** | Finanzas | Módulo Finanzas. Categorías, suscripciones, metas. Conversión ARS/USD. CSV. Análisis predictivo. Chatbot con acceso a Finanzas. | 11–12 |
| **5** | Despensa y Recetas | Módulo Despensa. Lista de compras con comparador. Módulo Recetas. Sugeridor. Meal Tracker. Chatbot con acceso a Despensa y Recetas. | 13–15 |
| **6** | Hábitos, XP y Wishlist | Hábitos con heatmap. XP transversal con recalibración. Niveles. Wishlist. Chatbot con acceso completo a todos los módulos. | 16–17 |
| **7** | Foco y Cerebro | Modo Foco / Pomodoro. Spotify Embed. Módulo Cerebro con NotebookLM MCP + pgvector. Limpieza automática de embeddings. | 18–19 |
| **8** | Pulido y Resiliencia | Morning Briefing automático (cron 8AM). Gmail Digest. Google Meet en Calendario. Resiliencia completa con `withFallback` en todas las integraciones. PWA offline con IndexedDB. Sentry. | 20–21 |

---

## 19. Glosario

| Término | Definición |
|---|---|
| **Acrue** | Nombre del producto. LifeOS personal centralizado. |
| **Cmd+K** | Barra de comandos global. Motor: Gemini 2.5 Flash-Lite. |
| **Chatbot** | Panel conversacional persistente (bottom-right). Acceso a todos los módulos. |
| **AiThinking** | Micro-componente visual de estado "Procesando..." durante toda llamada a Gemini. |
| **UndoToast** | Toast de 5 segundos post-acción IA. Permite revertir antes de confirmar definitivamente. |
| **Papelera temporal** | Registros eliminados por IA, recuperables durante 7 días. Implementada con `deleted_at`. |
| **Procesamiento efímero** | Flujo de imágenes: subida temporal → Gemini Vision → JSON → delete inmediato. Sin persistencia. |
| **Degradación elegante** | Comportamiento ante falla de integración externa: muestra caché sin bloquear la app. |
| **withFallback** | Wrapper de resiliencia en `lib/integrations/resilience.ts` para toda llamada a API externa. |
| **Recalibración XP** | Inserción de `xp_event` con `source_type: 'recalibration'` para corregir bugs en cálculo de niveles. |
| **Morning Briefing** | Resumen diario generado por Gemini. Enviado por Telegram a las 8:00 AM. |
| **Cerebro Secundario** | Búsqueda semántica sobre notas. NotebookLM via MCP + pgvector. |
| **XP** | Experience Points. Sistema de gamificación transversal. Tabla append-only. |
| **RRULE** | Estándar iCal para reglas de recurrencia de tareas y eventos. |
| **RLS** | Row Level Security. Políticas de Supabase por fila y usuario. |
| **tRPC** | RPC con type-safety E2E entre cliente y servidor en el mismo repo. |
| **pgvector** | Extensión PostgreSQL para embeddings semánticos y búsqueda por similitud. |
| **Gemini Vision** | Capacidad multimodal de Gemini para análisis de imágenes. Usado en escaneo de tickets. |
| **MCP** | Model Context Protocol. Estándar para conectar IA con herramientas externas. |
| **PWA** | Progressive Web App. Instalable en iPhone y desktop sin App Store ni costo. |
| **Append-only** | Tabla que solo acepta INSERT. Nunca UPDATE ni DELETE. Historial inmutable. |
| **Signed URL** | URL temporal con expiración para archivos en Supabase Storage. |
| **Flash-Lite** | Gemini 2.5 Flash-Lite. Motor principal de IA de Acrue. Optimizado para velocidad y costo bajo. |

---

*Acrue PRD v3.0 · Confidencial · Marzo 2026*
*Documentos relacionados: `design.md` (UI/UX) · `roadmap.md` (implementación detallada)*
