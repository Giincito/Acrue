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
- [ ] API routes para `subjects` y `assignments`.
- [ ] Vistas de lista de materias, exámenes, formulario con correlativas o pesos.

### 3.2 Calculadora de promedio ponderado
- [ ] Lógica `calculateWeightedAverage()`.
- [ ] Recálculo en tiempo real.

### 3.3 Carga horaria y alertas
- [ ] Vista semanal.
- [ ] Alertas telegram para inscripciones a exámenes y entregas.

### 3.4 Integración Moodle UNICEN
- [ ] Formulario credenciales + encriptación.
- [ ] Script Moodle REST API para extraer entregas y avisos.
- [ ] Vercel Cron cada 2h.

### 3.5 IA en Estudio
- [ ] Sugerir plan de estudio desde Gemini.
- [ ] Resumir noticias del campus.
- [ ] Conectar chatbot al contexto de materias y exámenes.
