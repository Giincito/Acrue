# Fase 3 — Estudio y Proyectos (Visual Audit & Refactor)

## Progreso Actual: INICIANDO FASE 3

### 3.0 Auditoría Visual y Refactorización
- [x] Refactor global de `globals.css` (Colores exactos: Canvas, Core, Depth, Ash, Accent).
- [x] Aplicar `<div className="grayscale">` global o regla CSS global `img, [data-media] { filter: grayscale(100%); }`.
- [x] Eliminar fuentes con Serif (`font-serif`) y pesos mayores a 500 (`font-semibold`, `font-bold`, `font-extrabold`). Asegurar uso exclusivo de Geist Sans.
- [x] Suavizar sombras: quitar gruesos `border-2`, `border-black` y usar drop-shadows sutiles y bordes de 0.5px.
- [x] Eliminar `bg-gradient-*` en todos los componentes.
- [x] Auditoría de espaciado: Nada pegado a los bordes.

### 3.1 Módulo Estudio — CRUD base
- [x] API routes para `subjects` y `assignments`.
- [x] Vistas de lista de materias, exámenes, formulario con correlativas o pesos.

### 3.2 Calculadora de promedio ponderado
- [x] Lógica `calculateWeightedAverage()`.
- [x] Recálculo en tiempo real.

### 3.3 Carga horaria y alertas
- [x] Vista semanal.
- [x] Alertas telegram para inscripciones a exámenes y entregas.

### 3.4 Integración Moodle UNICEN
- [x] Formulario credenciales + encriptación.
- [x] Script Moodle REST API para extraer entregas y avisos.
- [x] Vercel Cron cada 2h.

### 3.5 IA en Estudio
- [x] Sugerir plan de estudio desde Gemini.
- [x] Resumir noticias del campus.
- [x] Conectar chatbot al contexto de materias y exámenes.
