# Acrue — Design System
*Version 1.1 · March 2026*

---

## 1. Brand

### Name
**Acrue** — intencionalmente simplificado de *accrue*. Acumular de forma continua y silenciosa. Cada hábito completado, cada gasto registrado, cada materia aprobada — todo se acumula. Acrue es el sistema que hace visible ese progreso invisible.

### Tagline
> *It all adds up.*

**Alternativas aprobadas:**
- *Small moves. Big picture.*
- *Quiet progress.*
- *Everything compounds.*

### Pronunciación
/ ə·kruː / — igual que "accrue" en inglés.

### Dominios sugeridos
- `acrue.app`
- `useacrue.com`
- `getacrue.app`

---

## 2. Logo

### Concepto
El isotipo es un sistema orbital: un núcleo sólido, dos anillos concéntricos en opacidades decrecientes, y un punto en órbita sobre el anillo exterior.

- **El núcleo** sos vos — el centro desde donde todo parte.
- **Los anillos** son los ciclos de acumulación — cada uno representa una capa más de crecimiento.
- **El punto orbital** es el progreso activo — siempre en movimiento, siempre expandiendo el sistema.

Dibujable a mano en 10 segundos: un punto grande en el centro, un círculo mediano, un círculo grande más tenue, y un punto chico arriba a la derecha sobre el anillo exterior. Cuatro círculos, nada más.

### Especificaciones del isotipo

```
Núcleo        radio: 4u   opacidad: 100%   fill sólido
Anillo 1      radio: 9u   opacidad: 55%    stroke: 2u
Anillo 2      radio: 15u  opacidad: 20%    stroke: 1.5u
Punto orbital radio: 2.5u opacidad: 100%   posición: ~45° sobre anillo 2 (cx:29, cy:7.2)
```

### SVG canónico (viewBox 40×40)

```svg
<svg width="40" height="40" viewBox="0 0 40 40" fill="none">
  <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".20"/>
  <circle cx="20" cy="20" r="9"  fill="none" stroke="currentColor" stroke-width="2"   opacity=".55"/>
  <circle cx="20" cy="20" r="4"  fill="currentColor"/>
  <circle cx="29"  cy="7.2" r="2.5" fill="currentColor"/>
</svg>
```

> Siempre usar `currentColor` — nunca hardcodear el color del isotipo.

### Wordmark

```
Typeface:     Geist ExtraLight (weight 200)
Size:         28px junto al isotipo
Tracking:     -0.035em
Color:        currentColor
Case:         siempre lowercase — "acrue", nunca "Acrue" ni "ACRUE"
```

### Versiones del logo

| Versión | Uso | Fondo |
|---|---|---|
| Isotipo + wordmark | Header de app, documentos, marketing | Claro u oscuro |
| Solo isotipo | App icon, favicon, avatar, nav colapsada | Siempre sobre #0C0C0B o #F6F6F3 |
| Wordmark solo | Contextos donde el isotipo no cabe a menos de 16px | Claro u oscuro |

### Tamaños mínimos

| Contexto | Tamaño | Elementos visibles |
|---|---|---|
| App icon iOS/Android | 64×64px | Isotipo completo |
| Nav / header | 44×44px | Isotipo completo |
| Badge / avatar | 32×32px | Isotipo completo |
| Inline / chip | 20×20px | Núcleo + anillo 1 + punto |
| Favicon | 16×16px | Núcleo + anillo 1 + punto |

> A 16px se elimina el anillo exterior — demasiado tenue para renderizar bien.

### Lo que nunca hacer con el logo

- No rotar el isotipo
- No cambiar las opacidades relativas entre elementos
- No separar el punto orbital del sistema
- No usar el wordmark en uppercase o title case
- No aplicar sombras, gradientes ni efectos
- No colocar el logo sobre fondos de color
- No usar el accent color `#2282fa` en el isotipo — solo monocromático

---

## 3. Paleta de color

### Filosofía
La interfaz es monocromática en el 95% de su superficie. El color existe para comunicar estado e intención — nunca para decorar. Todos los tonos neutros tienen temperatura **cálida** (leve sesgo beige/verde apagado) — nunca frío puro.

### Tokens neutros

| Token | Hex | Uso |
|---|---|---|
| **Core** | `#0C0C0B` | Texto principal, isotipo, fondo dark |
| **Depth** | `#1E1E1C` | Superficies dark secundarias, sidebar dark |
| **Slate** | `#3C3C3A` | Texto secundario dark, bordes sobre oscuro |
| **Stone** | `#888884` | Texto terciario, placeholders, labels deshabilitados |
| **Ash** | `#C8C8C2` | Bordes light, separadores |
| **Linen** | `#EAEAE6` | Superficies secundarias light, hover states |
| **Canvas** | `#F6F6F3` | Background principal light |

### Accent color

```
#2282fa
```

El único color cromático del sistema. Se usa para:
- Links y texto interactivo
- Focus rings
- Estado selected/activo en listas y tabs
- Elementos que necesitan destacar en un contexto específico (ej: el día de hoy en un calendario, el XP ganado hoy, el item más urgente)
- Borde de inputs en focus state

**Reglas de uso del accent:**
- Nunca como background de superficies grandes — solo en elementos puntuales
- Nunca sobre fondos oscuros con opacidad baja (contraste insuficiente) — usar siempre sobre blanco o Canvas
- Nunca en el isotipo ni en el wordmark
- El texto sobre fondo `#2282fa` va siempre en blanco `#FFFFFF`
- Versión reducida para fondos sutiles: `#2282fa` al 10% de opacidad como background, `#2282fa` sólido como texto/borde

### Estados semánticos

Desaturados intencionalmente para no romper la monocromía general.

| Estado | Color | Uso |
|---|---|---|
| Éxito / completado | `#3A7D44` | Tarea completada, meta alcanzada |
| Advertencia / próximo | `#A0742A` | Entrega en menos de 48hs |
| Error / vencido | `#9B3A3A` | Fecha pasada, stock agotado |

### Light mode

```
Página:             Canvas #F6F6F3
Cards / panels:     #FFFFFF
Texto primario:     Core #0C0C0B
Texto secundario:   Stone #888884
Bordes:             Ash #C8C8C2 — siempre 0.5px
Separadores:        Linen #EAEAE6
Hover surfaces:     Linen #EAEAE6
Accent:             #2282fa
```

### Dark mode

```
Página:             Core #0C0C0B
Cards / panels:     Depth #1E1E1C
Texto primario:     Canvas #F6F6F3
Texto secundario:   Stone #888884
Bordes:             Slate #3C3C3A — siempre 0.5px
Separadores:        Depth #1E1E1C
Hover surfaces:     Slate #3C3C3A al 40%
Accent:             #2282fa
```

### Imágenes y contenido visual generado

**Toda imagen que aparezca en la app — ya sea subida por el usuario, generada por IA, o traída desde una integración externa — debe renderizarse en escala de grises.**

Implementación:
```css
img, [data-media] {
  filter: grayscale(100%);
}
```

Esto incluye:
- Fotos de perfil / avatars
- Imágenes adjuntas a tareas o notas
- Miniaturas de documentos
- Cualquier imagen generada o sugerida por la IA
- Imágenes de onboarding o marketing dentro de la app

> Razón: una sola imagen a color rompe visualmente toda la monocromía del sistema. Al forzar grayscale en CSS se garantiza consistencia sin depender de que cada fuente de imagen respete la paleta.

---

## 4. Tipografía

### Typeface: Geist

Open source, de Vercel, diseñada para interfaces de software. Geométrica con personalidad, excelente legibilidad desde 11px.

**Instalación:** `npm install geist` o `next/font/local`
**Fallback:** `Inter, system-ui, -apple-system, sans-serif`

### Escala tipográfica

| Rol | Size | Weight | Tracking | Line-height | Uso |
|---|---|---|---|---|---|
| Display | 32px | 200 | -0.04em | 1.1 | Títulos de pantalla, splash |
| Heading 1 | 24px | 300 | -0.03em | 1.2 | Título de módulo activo |
| Heading 2 | 18px | 400 | -0.02em | 1.3 | Sección dentro de módulo |
| Heading 3 | 15px | 500 | 0 | 1.4 | Subsección, nombre de card |
| Body | 14px | 300 | 0 | 1.65 | Contenido principal |
| Label | 13px | 500 | 0.01em | 1.4 | Etiquetas, botones, tabs |
| Caption | 12px | 400 | 0.01em | 1.5 | Metadatos, timestamps |
| Micro | 11px | 500 | 0.08em | 1.4 | Tags, badges, indicadores |

### Reglas

- Cuanto más pequeño el texto, más weight — un micro de 11px necesita 500 para ser legible.
- Nunca usar weight 600 ni 700 — rompe el registro visual.
- Los números en UI van con `font-variant-numeric: tabular-nums`.
- Labels de sección: uppercase, tracking 0.10em, weight 500 — única excepción al lowercase.
- El wordmark siempre weight 200, tracking -0.035em, lowercase.

---

## 5. Espaciado y layout

### Escala base: 4px

```
4px   — separación mínima inline
8px   — padding de chips, badges, tags
12px  — gap en listas compactas
16px  — padding cards pequeñas, gap estándar
20px  — padding cards medianas
24px  — padding cards grandes
32px  — separación entre secciones
48px  — separación entre módulos
64px  — padding de página desktop
```

### Referencia visual
El estilo de layout sigue la dirección del sistema Untitled UI: sidebar izquierda limpia con íconos + labels, contenido centrado con máximo ancho controlado, uso generoso del espacio negativo como separador principal. Sin dividers decorativos — el espacio hace el trabajo.

### Layout mobile (< 768px) — prioritario

```
Padding horizontal:   16px
Nav:                  bottom tab bar, 5 items
Header:               48px alto — logo izquierda, acciones derecha
Content:              full width menos padding de página
```

### Layout desktop (≥ 1024px)

```
Sidebar:              220px fija, izquierda
Content area:         flex-1, máximo 720px de ancho útil, centrado
Padding horizontal:   32px
```

### Grid de contenido

Stack vertical como patrón principal. Grids de 2 columnas solo para:
- Cards de métricas (ej: saldo / gastos del mes)
- Comparaciones explícitas

El espacio en blanco es el separador principal — no los bordes ni los dividers.

---

## 6. Componentes

### Principio rector
Cada componente debe ser **reconocible de inmediato** aunque sea la primera vez que el usuario lo ve. El minimalismo no puede sacrificar la affordance. Si hay duda de si algo es clickeable, no es minimalista — es ambiguo.

---

### 6.1 Navigation

#### Mobile — Bottom Tab Bar

5 tabs. Activo: `Core` (light) / `Canvas` (dark). Inactivos: `Stone`. Solo íconos excepto en el tab activo que muestra label debajo.

```
Alto:          56px + safe area inferior
Fondo:         Canvas / Core
Borde top:     0.5px Ash / Slate
```

Orden (izquierda a derecha):
1. Dashboard
2. Tareas
3. **Cmd+K** — botón central elevado 4px, fondo Core, isotipo Canvas, sin label
4. Finanzas
5. Más (Despensa, Hábitos, Estudio)

#### Desktop — Sidebar

Estilo Untitled UI: ancho controlado, ítems con ícono + label, secciones agrupadas con label de categoría en uppercase pequeño, mucho espacio negativo.

```
Ancho:         220px fija
Padding:       20px lateral, 12px vertical entre ítems
Fondo:         #FFFFFF (light) / Depth #1E1E1C (dark)
Borde derecho: 0.5px Ash / Slate
```

Estructura:
```
[Logo — isotipo 20px + wordmark 16px]

─── 16px gap ───

[Label sección: "MAIN" — 11px uppercase Stone]
  Dashboard
  Tareas
  Finanzas

[Label sección: "ACADEMIC"]
  Estudio

[Label sección: "HOME"]
  Despensa
  Hábitos

─── flex-1 ───

[Configuración]
[Avatar + nombre usuario]
```

**Item de sidebar:**
```
Alto:          36px
Border-radius: 8px
Padding:       0 10px
Ícono:         16px, Stone cuando inactivo
Label:         13px weight 400, Stone cuando inactivo
Gap ícono-label: 10px
```

**Item activo:**
```
Fondo:         #2282fa al 8% (#2282fa14)
Ícono:         #2282fa
Label:         #2282fa, weight 500
```

**Item hover (inactivo):**
```
Fondo:         Linen (light) / Slate 40% (dark)
```

> El accent `#2282fa` aparece aquí como indicador de navegación activa — es el uso de marca más visible en la app. Sutil pero inmediatamente reconocible.

---

### 6.2 Cards

**Card base**
```css
background: #FFFFFF (light) / #1E1E1C (dark);
border: 0.5px solid #C8C8C2 (light) / #3C3C3A (dark);
border-radius: 12px;
padding: 16px 20px;
```

**Card compacta** — listas de tareas, gastos, entregas
```css
padding: 12px 16px;
border-radius: 8px;
```

**Card de métrica** — números grandes
```css
background: Linen / Depth;
border: none;
border-radius: 10px;
padding: 16px;
```

Estructura interna de card de métrica:
```
[Label — 11px uppercase Stone]
[Número — 28px weight 200 Core/Canvas]
[Delta — 12px Stone — ej: "+12% vs mes anterior" en accent si positivo]
```

---

### 6.3 Lista de ítems

Patrón más usado en Acrue — tareas, gastos, entregas, ingredientes.

```
Alto ítem:          52px (una línea) / 68px (dos líneas)
Padding horizontal: 0 — la lista va flush al container
Separador:          0.5px Ash/Slate entre ítems — no arriba ni abajo
```

Estructura:
```
[Leading 20px]  [Content flex-1]              [Trailing auto]
checkbox/ícono  título 14px weight 400        badge / fecha / monto
                subtítulo 12px Stone (opt.)
```

**Interacciones mobile:**
- Tap → abre detalle o marca como hecho
- Swipe izquierda → eliminar (fondo semántico rojo)
- Swipe derecha → completar / posponer
- Long press → selección múltiple

**Checkbox:**
```
Tamaño:        18×18px visual / 44×44px área táctil
Vacío:         borde 1.5px Stone, sin fill
Completado:    fill Core/Canvas + checkmark blanco/negro 1.5px stroke
Hover:         borde accent #2282fa
Transición:    150ms ease
```

---

### 6.4 Cmd+K — Barra de comandos global

El componente más importante de la app.

**Activación:** `Cmd+K` desktop / botón central mobile / teclado externo iPad.

**Apariencia:**
```
Posición:      modal centrado, top 20% pantalla
Ancho:         560px desktop / 100% - 32px mobile
Background:    #FFFFFF (light) / #1E1E1C (dark)
Border:        0.5px Ash/Slate
Border-radius: 14px
Overlay:       Core al 40% detrás
```

**Input:**
```
Placeholder:   "Ask acrue anything..."
Font:          15px weight 300
Padding:       18px 20px
Isotipo 16px   a la izquierda — desaparece al escribir
Border-bottom: 0.5px Ash/Slate — separa del área de resultados
```

**Focus ring del input:** `#2282fa` 1px — el único lugar donde el accent aparece en el Cmd+K.

**Flujo de procesamiento:**
```
1. Usuario escribe en lenguaje natural
2. Gemini procesa (debounce 400ms) — indicador de 3 puntos animados
3. Preview de acción antes de confirmar:

   ┌─────────────────────────────────────────┐
   │  Gasto registrado                        │
   │  Supermercado · $4.800                   │
   │  [Confirmar ↵]   [Editar]   [Esc]        │
   └─────────────────────────────────────────┘

4. Enter confirma y cierra. Esc cancela.
```

**Comandos directos** (sin IA):
```
/hoy       → vista tareas de hoy
/semana    → vista semanal
/gasto     → formulario rápido de gasto
/tarea     → nueva tarea
/nota      → nueva nota
```

**Resultados de búsqueda:** lista compacta dentro del modal, máximo 6 resultados visibles, scroll interno. El resultado activo tiene fondo `#2282fa` al 8%.

---

### 6.5 Botones

**Primario**
```css
background: #0C0C0B (light) / #F6F6F3 (dark);
color: #F6F6F3 (light) / #0C0C0B (dark);
border: none;
border-radius: 8px;
padding: 10px 18px;
font: 13px weight 500;
```

**Primario accent** — para CTAs que compiten con el primario
```css
background: #2282fa;
color: #FFFFFF;
border: none;
border-radius: 8px;
padding: 10px 18px;
font: 13px weight 500;
```

**Secundario**
```css
background: transparent;
border: 0.5px solid #C8C8C2 (light) / #3C3C3A (dark);
color: Core / Canvas;
border-radius: 8px;
padding: 10px 18px;
font: 13px weight 500;
```

**Ghost**
```css
background: transparent;
border: none;
color: Stone #888884;
font: 13px weight 400;
padding: 8px 12px;
```

**Estados:**
- Hover primario: opacidad 88%
- Hover accent: `#1a6fd4`
- Active: `scale(0.97)` — 100ms
- Disabled: opacidad 35%
- Loading: label reemplazado por `···` animados

**Tamaños:**
```
sm:  padding 7px 14px  — font 12px — acciones en cards
md:  padding 10px 18px — font 13px — estándar
lg:  padding 13px 24px — font 15px — CTA onboarding
```

---

### 6.6 Inputs y formularios

**Input de texto**
```css
height: 40px;
background: #FFFFFF (light) / #1E1E1C (dark);
border: 0.5px solid #C8C8C2 (light) / #3C3C3A (dark);
border-radius: 8px;
padding: 0 14px;
font: 14px weight 300;
```

Focus:
```css
border: 1px solid #2282fa;
outline: none;
box-shadow: 0 0 0 3px rgba(34, 130, 250, 0.12);
```

**Label:** 12px weight 500 uppercase tracking 0.06em, color Stone, margin-bottom 6px.

**Helper / error:** 12px weight 400, Stone (helper) / `#9B3A3A` (error), margin-top 4px.

**Regla:** formularios siempre de una sola columna. Nunca dos inputs lado a lado.

---

### 6.7 Badges y tags

**Badge de estado**
```
Font:          11px weight 500 uppercase tracking 0.06em
Padding:       3px 8px
Border-radius: 20px (pill)
```

| Variante | Background | Color texto |
|---|---|---|
| Pendiente | Linen / Depth | Stone |
| Activo | Core / Canvas | Canvas / Core |
| Seleccionado | `#2282fa` 10% | `#2282fa` |
| Completado | `#3A7D44` 15% | `#3A7D44` |
| Vencido | `#9B3A3A` 15% | `#9B3A3A` |
| Próximo | `#A0742A` 15% | `#A0742A` |

**Tag de contexto** (@hogar, @universidad, @personal)
```
Font:          11px weight 400
Padding:       2px 8px
Border:        0.5px Ash/Slate
Border-radius: 4px
Color:         Stone
Background:    transparent
```

---

### 6.8 Heatmap de hábitos

```
Celda:         12×12px, border-radius 3px
Gap:           3px
Columnas:      7 (días de la semana)
Filas:         últimas 16 semanas
```

Escala de intensidad monocromática:

| Nivel | Light | Dark |
|---|---|---|
| Sin dato | `#EAEAE6` | `#1E1E1C` |
| Nivel 1 | `#C8C8C2` | `#3C3C3A` |
| Nivel 2 | `#888884` | `#888884` |
| Nivel 3 | `#3C3C3A` | `#C8C8C2` |
| Nivel 4 | `#0C0C0B` | `#F6F6F3` |

> El día de hoy lleva un borde de 1px `#2282fa` — única excepción cromática en el heatmap.

---

### 6.9 Empty states

```
Isotipo:       32px, opacidad 20%, centrado
Título:        15px weight 300, centrado, máximo 2 líneas
Subtítulo:     13px Stone, centrado, máximo 2 líneas
CTA:           botón secundario sm, opcional
Imágenes:      ninguna — sin ilustraciones adicionales
```

Ejemplo:
```
    [isotipo 32px, 20% opacidad]

    Nada por hacer hoy.
    Capturá algo con Cmd+K o Telegram.

         [+ Nueva tarea]
```

---

### 6.10 Modo Foco / Pomodoro

El Modo Foco lleva la app a un estado de máxima reducción. La decisión de diseño es **pantalla dedicada completa** — no un overlay ni un modal. Cuando activás el Pomodoro, la interfaz se transforma.

**Apariencia:**
```
Fondo:         Core #0C0C0B (siempre — ignora light/dark mode)
Todo oculto:   sidebar, nav, header, contenido
```

**Contenido centrado verticalmente:**
```
[Tarea activa — 15px weight 300, Canvas al 50%]    ← máximo 1 línea
[Timer — 64px weight 200, Canvas #F6F6F3]           ← "25:00"
[Barra de progreso — línea fina, accent #2282fa]    ← única presencia del accent
[Pausa   Terminar — botones ghost, Canvas al 40%]
```

**Barra de progreso:**
```
Alto:          2px
Border-radius: 1px
Fondo vacío:   Canvas al 10%
Fill activo:   #2282fa
Ancho:         280px fijo (desktop) / 80% (mobile)
```

**Transición de entrada al Modo Foco:**
- Todo el contenido hace `opacity 0` en 300ms
- El fondo transiciona a `#0C0C0B` en 400ms
- El timer y la tarea aparecen con `opacity 0 → 1` + `translateY(8px) → 0` en 300ms
- Delay de 200ms antes de mostrar los controles

**Transición de salida:** inversa, 250ms.

**Al terminar una sesión:**
```
El timer llega a 00:00
Vibración haptica (mobile)
Sonido sutil opcional (configurable)
El número de sesiones completadas aparece brevemente: "2 / 4"
Pausa automática de 5 minutos con countdown en Canvas al 30%
```

> Sin confetti, sin celebraciones ruidosas. El Modo Foco es silencioso por definición.

---

### 6.10 Micro-componente AiThinking

Este componente aparece en **toda** llamada a Gemini — sin excepciones. Es la señal visual de que la IA está procesando. Debe ser coherente con el estilo monocromático de Acrue: sin spinners de colores, sin animaciones llamativas.

**Apariencia:**
```
Tres puntos en línea horizontal
Tamaño: 6×6px cada punto, gap 4px entre ellos
Color: Stone #888884
Animación: los puntos suben y bajan en secuencia (wave), 600ms por ciclo
```

```css
/* AiThinking.tsx */
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #888884;
  animation: wave 0.6s ease-in-out infinite;
}
.dot:nth-child(2) { animation-delay: 0.1s; }
.dot:nth-child(3) { animation-delay: 0.2s; }

@keyframes wave {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-5px); }
}

@media (prefers-reduced-motion: reduce) {
  .dot { animation: none; opacity: 0.5; }
}
```

**Contextos de uso:**

| Contexto | Posición del componente |
|---|---|
| Cmd+K procesando | Debajo del input, alineado a la izquierda |
| Chatbot esperando respuesta | Bubble de chat vacío con los tres puntos |
| Inline en módulo (ej: cargando sugerencias) | Donde aparecería el resultado, centrado |

**Texto acompañante opcional** (solo si el contexto lo requiere):
```
Procesando...    ← para acciones (Cmd+K)
Pensando...      ← para el chatbot
Analizando...    ← para escaneo de tickets
```

Font: 12px weight 400, Stone #888884. Nunca "Usando inteligencia artificial..." ni texto técnico.

---

### 6.11 Affordance en modo monocromático

El minimalismo de Acrue no puede sacrificar la claridad interactiva. Todo elemento interactivo debe tener un estado visual que no dependa únicamente del color.

**Regla central:** si un elemento es clickeable, debe comunicarlo a través de **forma, cursor, y estado hover** — no solo a través del color.

#### Cursor

```css
/* Todo elemento interactivo */
cursor: pointer;

/* Elementos de texto o áreas de contenido */
cursor: default;

/* Inputs */
cursor: text;
```

#### Estados de hover — sin color

```css
/* Botón secundario */
button:hover {
  background: var(--color-background-secondary);  /* Linen / Slate */
  /* Sin cambio de color de texto ni borde */
}

/* Ítem de lista */
.list-item:hover {
  background: var(--color-background-secondary);
}

/* Ítem de sidebar */
.sidebar-item:hover {
  background: var(--color-background-secondary);
  /* El ícono puede aumentar levemente de opacidad: opacity 0.4 → 0.7 */
}

/* Card */
.card:hover {
  border-color: var(--color-border-secondary);  /* De 0.15α a 0.3α */
}
```

#### Focus visible — con accent

El focus ring es el único momento donde el accent aparece sin restricción, incluso sobre elementos que normalmente son monocromáticos:

```css
:focus-visible {
  outline: 2px solid #2282fa;
  outline-offset: 2px;
  border-radius: 4px;
}
```

#### Indicadores de interactividad adicionales

- Los botones tienen `border-radius` consistente — las formas rectangulares con esquinas redondeadas son reconocidas como botones sin necesidad de color
- Los checkboxes tienen borde visible aunque estén vacíos — `1.5px solid Stone` mínimo
- Los inputs tienen borde visible en reposo — `0.5px solid Ash/Slate` mínimo
- Los ítems de lista con acción de swipe muestran un indicador sutil de dirección en el primer uso (onboarding)

#### Qué nunca hacer

- Nunca usar solo el color para indicar que algo es interactivo — debe haber al menos un indicador adicional
- Nunca quitar el borde de un input en reposo — la forma del campo es su affordance principal
- Nunca usar `opacity: 0.3` como único estado de elemento deshabilitado — agregar también `cursor: not-allowed`

---

## 7. Iconografía

**Sistema:** Lucide Icons — open source, stroke-based, consistente.

```
Tamaño estándar:  18×18px en contenido / 16×16px en sidebar
Stroke width:     1.5px
Color:            currentColor — nunca hardcodeado
```

Íconos por módulo:

| Módulo / Acción | Ícono Lucide |
|---|---|
| Dashboard | `layout-dashboard` |
| Tareas | `check-square` |
| Finanzas | `trending-up` |
| Estudio | `book-open` |
| Despensa | `package` |
| Hábitos | `activity` |
| Configuración | `settings` |
| Nueva tarea / ítem | `plus` |
| Completar | `check` |
| Eliminar | `trash-2` |
| Editar | `pencil` |
| Calendario | `calendar` |
| Telegram | `send` |
| Notificación | `bell` |
| Clima | `cloud` |
| Pomodoro / Foco | `timer` |
| Búsqueda | `search` |
| Más opciones | `more-horizontal` |
| Volver | `chevron-left` |
| Cerrar | `x` |

**Regla absoluta:** ningún ícono decorativo. Cada ícono tiene una función — si no tiene función, no aparece.

---

## 8. Movimiento y transiciones

### Principios
- Funcional, no decorativo — las animaciones comunican estado.
- Rápido — la mayoría entre 100ms y 250ms.
- Todo dentro de `@media (prefers-reduced-motion: no-preference)`.

### Valores estándar

| Tipo | Duración | Easing | Uso |
|---|---|---|---|
| Micro | 100ms | `ease-out` | Hover, active, checkbox |
| Rápida | 150ms | `ease-out` | Badges, tooltips, chips |
| Estándar | 200ms | `ease-in-out` | Modales, Cmd+K, drawers |
| Lenta | 300ms | `ease-in-out` | Page transitions, Modo Foco |

### Page transitions

**Patrón: combinado — slide para jerarquía, fade para tabs.**

**Navegación jerárquica** (entrar a un detalle desde una lista):
```
Entrada:  translateX(24px) → 0  +  opacity 0 → 1  —  250ms ease-out
Salida:   translateX(0) → -12px  +  opacity 1 → 0  —  200ms ease-in
```

**Cambio de tab / módulo** (mismo nivel jerárquico):
```
Salida:   opacity 1 → 0  —  100ms ease-in
Entrada:  opacity 0 → 1  —  150ms ease-out
Delay:    50ms entre salida y entrada
```

**Modales y drawers** (siempre desde abajo):
```
Entrada:  translateY(16px) → 0  +  opacity 0 → 1  —  220ms ease-out
Salida:   translateY(0) → 16px  +  opacity 1 → 0  —  180ms ease-in
Overlay:  opacity 0 → 0.4  —  200ms
```

**Cmd+K:**
```
Entrada:  translateY(8px) → 0  +  opacity 0 → 1  —  200ms ease-out
Salida:   opacity 1 → 0  —  150ms ease-in  (sin translate en salida)
```

### Animaciones específicas

**Checkbox al completar:**
1. `scale(0.85) → scale(1)` en 150ms
2. Fill aparece en 100ms
3. Checkmark se dibuja con `stroke-dashoffset` en 150ms

**Card al aparecer en lista:**
- `opacity 0 → 1` + `translateY(4px) → 0` en 200ms
- Stagger 30ms entre ítems, máximo 5 con stagger

**Heatmap al cargar:**
- Columnas de izquierda a derecha, delay 20ms por columna
- Cada celda: `scale(0) → 1` en 150ms

**Timer del Pomodoro:**
- El número hace `scale(1.04) → 1` en 300ms en cada cambio de minuto
- Peso que no cambia — solo la escala, sutil

---

## 9. Voz y tono

### Principios

**Calma, no frialdad.** Habla como alguien que sabe lo que hace, sin alardear.

**Preciso, no verboso.** Cada string debe poder perder la mitad de las palabras sin perder el significado.

**Proactivo, no intrusivo.** Sugiere. No ordena. No celebra en exceso.

**Sin gamificación ruidosa.** El XP existe, pero Acrue no tira confetti ni dice "¡Increíble!" — muestra los números y confía en que el usuario entiende lo que significan.

### Tabla de strings

| ❌ Evitar | ✅ Usar |
|---|---|
| "¡Felicitaciones! Completaste todas tus tareas 🎉" | "Todo listo por hoy." |
| "No tienes ninguna tarea pendiente en este momento" | "Nada por hacer hoy." |
| "Por favor ingresá el monto del gasto" | "¿Cuánto gastaste?" |
| "Tu racha está en riesgo de romperse" | "Hoy todavía no completaste ningún hábito." |
| "Analizando con inteligencia artificial..." | "Procesando..." |
| "Error: no se pudo conectar con el servidor" | "Sin conexión. Los cambios se guardan cuando vuelvas." |
| "¡Nuevo nivel desbloqueado! 🚀" | "Nivel 4." |

### Morning Briefing — tono

```
acrue · buenos días.

3 entregas esta semana — la más cercana el jueves.
Saldo estimado al 30: $44.200.
Leche y arroz bajo stock mínimo.
Hoy en Tandil: 14°, parcialmente nublado.
```

Sin emojis. Sin exclamaciones. Sin padding verbal.

---

## 10. Accesibilidad

### Contraste
- Texto primario Core sobre Canvas: 19.8:1 ✓
- Accent `#2282fa` sobre blanco: 4.6:1 ✓ (AA)
- Stone `#888884` sobre Canvas: 3.8:1 — solo para texto de apoyo, nunca para contenido crítico ni labels de inputs

### Áreas táctiles
- Todo elemento interactivo: mínimo 44×44px de área táctil
- Checkboxes de 18px tienen área táctil de 44×44px centrada

### Focus visible
```css
:focus-visible {
  outline: 2px solid #2282fa;
  outline-offset: 2px;
  border-radius: 4px;
}
```
Nunca `outline: none` sin reemplazo.

### Atributos ARIA
- Isotipo: `alt="Acrue"`
- Íconos funcionales: `aria-label` descriptivo
- Íconos decorativos: `aria-hidden="true"`
- Cmd+K: `role="dialog"` + `aria-label="Comando global"`
- Heatmap: `role="grid"` + celdas con `aria-label="[día]: [n] hábitos completados"`

---

## 11. Dark mode

Dark mode es una variante de primer nivel, igual de cuidada que el light mode.

**Regla principal:** en dark mode el isotipo y el wordmark usan `#F6F6F3` sobre `#0C0C0B`. Los cards suben a `#1E1E1C` para crear profundidad sin llegar a negro puro.

**Implementación con Tailwind:**
```
bg-[#F6F6F3]      dark:bg-[#0C0C0B]
bg-white          dark:bg-[#1E1E1C]
text-[#0C0C0B]    dark:text-[#F6F6F3]
border-[#C8C8C2]  dark:border-[#3C3C3A]
text-[#888884]    dark:text-[#888884]
```

El accent `#2282fa` **no cambia** entre light y dark — es el mismo en ambos modos.

**Detección:** `prefers-color-scheme` del sistema. Toggle manual en Configuración, preferencia guardada en Supabase para persistir entre dispositivos.

---

## 12. PWA

### App icon
Isotipo sobre fondo `#0C0C0B`. Margen interno: 12px sobre el lado más corto.

```
512×512px  — Android / splash
192×192px  — Android
180×180px  — iOS apple-touch-icon
167×167px  — iPad
```

### Splash screen
Fondo `#0C0C0B`. Isotipo centrado en `#F6F6F3`, 64px. Sin texto, sin tagline.

### Meta tags
```html
<meta name="theme-color" content="#0C0C0B">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-capable" content="yes">
```

---

*Acrue Design System v1.1 — para uso interno y entrega a Antigravity.*
