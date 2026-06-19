import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SOURCE_FILES = [
  'src/app',
  'src/components',
].flatMap((root) => collectFiles(join(process.cwd(), root)))
const PRODUCTION_FILES = collectFiles(join(process.cwd(), 'src'))

function collectFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) return collectFiles(path)
    return /\.(tsx|ts|css)$/.test(entry) && !entry.endsWith('.test.tsx') && !entry.endsWith('.test.ts')
      ? [path]
      : []
  })
}

function getOpeningTag(block: string): string {
  let braceDepth = 0
  let quote: string | null = null

  for (let index = 0; index < block.length; index++) {
    const char = block[index]
    const previous = block[index - 1]

    if (quote) {
      if (char === quote && previous !== '\\') quote = null
      continue
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }

    if (char === '{') {
      braceDepth++
      continue
    }

    if (char === '}') {
      braceDepth = Math.max(0, braceDepth - 1)
      continue
    }

    if (char === '>' && braceDepth === 0) {
      return block.slice(0, index + 1)
    }
  }

  return ''
}

function getVisibleTextSignal(fragment: string): string {
  const withoutTags = fragment.replace(/<[^>]+>/g, ' ')
  const quotedText = [...withoutTags.matchAll(/["'`]([^"'`{}<>]{2,})["'`]/g)]
    .map((match) => match[1])
    .join(' ')
  const textOutsideExpressions = withoutTags.replace(/\{[\s\S]*?\}/g, ' ')

  return `${textOutsideExpressions} ${quotedText}`
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

function getCssRuleBlock(css: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return css.match(new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? ''
}

const UI_FILES = SOURCE_FILES.filter((file) => !relative(process.cwd(), file).startsWith('src\\app\\api\\'))
const SETTINGS_PAGE = 'src/app/(app)/configuracion/page.tsx'
const AI_WAIT_FILES = [
  'src/components/ui/cmdk.tsx',
  'src/components/ui/chatbot-fab.tsx',
  'src/components/finances/ReceiptScanner.tsx',
  'src/components/recipes/MealPlanView.tsx',
  'src/components/estudio/campus-tab.tsx',
  'src/components/estudio/moodle-feed.tsx',
  'src/components/wishlist/wishlist-view.tsx',
  'src/components/habits/habit-list-view.tsx',
]

describe('Acrue design system static rules', () => {
  it('does not use font weights above 500 in UI source', () => {
    const violations = SOURCE_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      const matches = content.match(/font-(semibold|bold|black|extrabold)|font-weight:\s*(600|700|800|900)/g)
      return matches ? [`${relative(process.cwd(), file)}: ${matches.join(', ')}`] : []
    })

    expect(violations).toEqual([])
  })

  it('does not use oversized rounded-2xl radii in UI source', () => {
    const violations = SOURCE_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      const matches = [
        ...content.matchAll(/rounded-2xl|rounded-\[(?:1[3-9]|[2-9]\d+)px\]/g),
      ].map((match) => match[0])

      return matches.length > 0 ? [`${relative(process.cwd(), file)}: ${matches.join(', ')}`] : []
    })

    expect(violations).toEqual([])
  })

  it('keeps explicit CSS radii within the Design.md card maximum', () => {
    const violations = SOURCE_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      const matches = [...content.matchAll(/border-radius:\s*(\d+)px/g)]
        .map((match) => Number(match[1]))
        .filter((radius) => radius > 12 && radius !== 9999)

      return matches.length > 0
        ? [`${relative(process.cwd(), file)}: ${matches.map((radius) => `${radius}px`).join(', ')}`]
        : []
    })

    expect(violations).toEqual([])
  })

  it('does not use negative letter spacing in visible UI source', () => {
    const negativeTrackingPattern = /\btracking-tight\b|\btracking-\[-|letter-spacing:\s*-/
    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      return negativeTrackingPattern.test(content) ? [relative(process.cwd(), file)] : []
    })

    expect(violations).toEqual([])
  })

  it('does not use emoji glyphs in visible UI source', () => {
    const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      return emojiPattern.test(content) ? [relative(process.cwd(), file)] : []
    })

    expect(violations).toEqual([])
  })

  it('does not ship mojibake in visible UI source', () => {
    const mojibakePattern = /Ã|Â|â[^\w\s]?/u
    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      return mojibakePattern.test(content) ? [relative(process.cwd(), file)] : []
    })

    expect(violations).toEqual([])
  })

  it('does not ship UTF-8 mojibake sentinel chars in visible UI source', () => {
    const mojibakePattern = /\u00c2|\ufffd/u
    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      return mojibakePattern.test(content) ? [relative(process.cwd(), file)] : []
    })

    expect(violations).toEqual([])
  })

  it('does not suppress TypeScript errors in visible UI source', () => {
    const suppressionPattern = /@ts-(?:ignore|expect-error)/
    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      return suppressionPattern.test(content) ? [relative(process.cwd(), file)] : []
    })

    expect(violations).toEqual([])
  })

  it('does not use blocking browser confirmation dialogs in visible UI source', () => {
    const confirmPattern = /\b(?:window\.)?confirm\s*\(/
    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      return confirmPattern.test(content) ? [relative(process.cwd(), file)] : []
    })

    expect(violations).toEqual([])
  })

  it('does not ship known English UI labels in v1 Spanish screens', () => {
    const forbiddenLabels = [
      '"Dashboard"',
      '>Brain<',
      '>Study<',
      '>Wishlist<',
      'Placeholder page',
      'Ajustes (Settings)',
      'Search for a command to run',
      'Telegram Bot',
      'Chat ID',
      'Vincular Cuenta',
      'Vincular de Nuevo',
      'Modo Oscuro',
      'Pruebas Locales',
      'Toggle theme',
      'Meal Tracker',
      'Acrue AI',
      '"Dia"',
      'Nueva Tarea',
      'Nueva Materia',
      'Nuevo Proyecto',
      'Añadir Recordatorio',
      'Sin Fecha',
      'Fecha Inicio',
      'Hora Inicio',
      'Fecha Fin',
      'Hora Fin',
      'Hora Inicio (Opcional)',
      'Fecha Fin (Opcional)',
      'Hora Fin (Opcional)',
      'Tarea Práctica',
      'Lectura Obligatoria',
      'Notas Adicionales',
      'Promedio General',
      'Gestionar Sesiones de Clase',
      'Actividad Reciente',
      'Resumen Inteligente',
      'Plan Sugerido',
      'Editar Materia',
      'Nueva Evaluacion',
      'Alta Prioridad',
      'Prioridad Media',
      'Prioridad Baja',
      '>Codigo<',
      '>Comision<',
      'Extraido por el Agente Moodle',
      'Comision {subject.commission}',
      'Evaluacion eliminada',
      'Agregar evaluacion',
      'Eliminar evaluacion',
      'Editar Horarios',
      'Ocultar Hechos',
      'Ver Hechos',
      'Cronograma de Cursada',
      'Error de conexion',
      'mas tarde',
      'Cerrar Asistente AI',
      'Abrir Asistente AI',
      'Escribi un mensaje',
      'Trabajo Practico',
      'Titulo *',
      'Primer Parcial',
      'Detalles del Recordatorio',
      'Recordatorio Activo',
      'Eliminar Recordatorio',
      'Proyecto (Opcional)',
      'Crear Proyecto',
      'Detalles de Proyecto',
      'Notas del Proyecto',
      'Tareas del Proyecto',
      'Notas del Evento',
      'Editar Notas',
      'Anadir Notas',
      'Materia actualizada con exito',
      'Materia agregada con exito',
      'Calendario sincronizado exitosamente',
      'Todavia no tenes',
      'Recetas basadas en lo que tenes',
      'Agregar Materia',
      'Plan Semanal',
      '"Mas"',
      'Crear Evento',
      'Tu Bandeja está limpia. ¡Excelente!',
      '¡Conectado a Moodle UNICEN!',
      '¡Meta alcanzada! +50 XP',
    ]
    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      const matches = forbiddenLabels.filter((label) => content.includes(label))
      return matches.length > 0 ? [`${relative(process.cwd(), file)}: ${matches.join(', ')}`] : []
    })

    expect(violations).toEqual([])
  })

  it('uses explicit Spanish labels for configurable modules instead of raw keys', () => {
    const settings = readFileSync(join(process.cwd(), SETTINGS_PAGE), 'utf8')

    expect(settings).not.toContain('Módulo {mod}')
    expect(settings).not.toContain('className="text-base capitalize cursor-pointer"')
    expect(settings).toContain('const moduleLabels')
    expect(settings).toContain('Hábitos')
  })

  it('makes the full configurable module row toggleable', () => {
    const settings = readFileSync(join(process.cwd(), SETTINGS_PAGE), 'utf8')

    expect(settings).toContain('htmlFor={`toggle-${mod}`}')
    expect(settings).toContain('type="checkbox"')
    expect(settings).toContain('sr-only peer')
    expect(settings).not.toContain('<div key={mod} className="flex items-center justify-between p-4">')
  })

  it('uses Spanish labels for base close controls', () => {
    const primitiveFiles = [
      'src/components/ui/dialog.tsx',
      'src/components/ui/sheet.tsx',
    ]
    const violations = primitiveFiles.flatMap((file) => {
      const content = readFileSync(join(process.cwd(), file), 'utf8')
      return />\s*Close\s*</.test(content) ? [file] : []
    })

    expect(violations).toEqual([])
  })

  it('keeps modal and drawer scrims strong enough to isolate foreground content', () => {
    const overlayFiles = [
      'src/components/ui/dialog.tsx',
      'src/components/ui/sheet.tsx',
    ]
    const weakScrimPattern = /\bbg-black\/(?:0|5|10|20|30)\b/
    const acceptableScrimPattern = /\bbg-black\/(?:40|50|60)\b/

    const violations = overlayFiles.flatMap((file) => {
      const content = readFileSync(join(process.cwd(), file), 'utf8')
      return weakScrimPattern.test(content) ? [file] : []
    })

    expect(violations).toEqual([])

    for (const file of overlayFiles) {
      const content = readFileSync(join(process.cwd(), file), 'utf8')
      expect(content).toMatch(acceptableScrimPattern)
    }
  })

  it('does not disable browser zoom in the root viewport metadata', () => {
    const layout = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8')

    expect(layout).not.toContain('maximumScale')
    expect(layout).not.toContain('userScalable: false')
  })

  it('keeps the Acrue accent token fixed instead of user-configurable', () => {
    const forbiddenAccentOverrides = [
      'acrue_accent',
      'theme-mono',
      'ACCENT_COLORS',
      "setProperty('--accent'",
      'Color de Acento',
    ]
    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      const matches = forbiddenAccentOverrides.filter((token) => content.includes(token))
      return matches.length > 0 ? [`${relative(process.cwd(), file)}: ${matches.join(', ')}`] : []
    })

    expect(violations).toEqual([])
  })

  it('does not wrap hex color CSS variables in hsl()', () => {
    const violations = SOURCE_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      return content.includes('hsl(var(--accent))') ? [relative(process.cwd(), file)] : []
    })

    expect(violations).toEqual([])
  })

  it('uses semantic color tokens instead of raw chromatic Tailwind palettes in visible UI source', () => {
    const rawChromaticClassPattern =
      /\b(?:hover:|dark:|dark:hover:)?(?:bg|text|border)-(?:red|yellow|blue|emerald|green|orange|purple|pink|indigo|violet|cyan|teal|lime|amber|rose|sky)-\d{2,3}(?:\/\d+)?\b/g
    const rawProjectPalettePattern = /#(?:ef4444|f97316|eab308|22c55e|10b981|a855f7|ec4899)\b/gi
    const rawCalendarPalettePattern =
      /#(?:E7000B|18181b|4b5563|ECECEC|0284c7|38bdf8|7e22ce|c084fc|a16207|facc15|be185d|f472b6|15803d|4ade80|c2410c|fb923c|bae6fd|0369a1|ffedd5|fef9c3|dcfce7|dbeafe|f3e8ff|ffe4e6)\b|rgba\((?:14,\s*165,\s*233|168,\s*85,\s*247|234,\s*179,\s*8|236,\s*72,\s*153|34,\s*197,\s*94|249,\s*115,\s*22|56,\s*189,\s*248|224,\s*242,\s*254)/gi
    const globals = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      const matches = [
        ...content.matchAll(rawChromaticClassPattern),
        ...content.matchAll(rawProjectPalettePattern),
        ...content.matchAll(rawCalendarPalettePattern),
      ].map((match) => match[0])

      return matches.length > 0 ? [`${relative(process.cwd(), file)}: ${[...new Set(matches)].join(', ')}`] : []
    })

    expect(globals).toContain('--color-success: var(--success)')
    expect(globals).toContain('--color-warning: var(--warning)')
    expect(globals).toContain('--success: #3A7D44')
    expect(globals).toContain('--warning: #A0742A')
    expect(violations).toEqual([])
  })

  it('keeps clickable controls visually discoverable with pointer cursors', () => {
    const button = readFileSync(join(process.cwd(), 'src/components/ui/button.tsx'), 'utf8')
    const globals = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

    expect(button).toContain('cursor-pointer')
    expect(globals).toContain('button:not(:disabled)')
    expect(globals).toContain('cursor: pointer')
  })

  it('keeps disabled button controls visibly non-interactive', () => {
    const button = readFileSync(join(process.cwd(), 'src/components/ui/button.tsx'), 'utf8')
    const globals = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

    expect(button).toContain('disabled:cursor-not-allowed')
    expect(button).not.toContain('disabled:pointer-events-none')
    expect(globals).toContain('button:disabled')
    expect(globals).toContain('cursor: not-allowed')
  })

  it('does not hide the disabled cursor on core interactive primitives', () => {
    const controls = [
      {
        file: 'src/components/ui/input.tsx',
        required: ['disabled:cursor-not-allowed'],
        forbidden: ['disabled:pointer-events-none'],
      },
      {
        file: 'src/components/ui/tabs.tsx',
        required: ['disabled:cursor-not-allowed', 'aria-disabled:cursor-not-allowed'],
        forbidden: ['disabled:pointer-events-none', 'aria-disabled:pointer-events-none'],
      },
      {
        file: 'src/components/ui/textarea.tsx',
        required: ['disabled:cursor-not-allowed'],
        forbidden: ['disabled:pointer-events-none'],
      },
      {
        file: 'src/components/ui/select.tsx',
        required: ['disabled:cursor-not-allowed'],
        forbidden: ['disabled:pointer-events-none'],
      },
    ]

    const violations = controls.flatMap(({ file, required, forbidden }) => {
      const content = readFileSync(join(process.cwd(), file), 'utf8')
      return [
        ...required.filter((token) => !content.includes(token)).map((token) => `${file}: missing ${token}`),
        ...forbidden.filter((token) => content.includes(token)).map((token) => `${file}: contains ${token}`),
      ]
    })

    expect(violations).toEqual([])
  })

  it('does not hide disabled cursor feedback in visible UI source', () => {
    const disabledPointerPattern = /\b(?:(?:disabled|aria-disabled|peer-disabled):pointer-events-none|group-data-\[disabled=true\]:pointer-events-none)\b/
    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      return disabledPointerPattern.test(content) ? [relative(process.cwd(), file)] : []
    })

    expect(violations).toEqual([])
  })

  it('keeps disabled cursor feedback explicit instead of default or auto in visible UI source', () => {
    const weakDisabledCursorPattern = /\b(?:disabled|aria-disabled):cursor-(?:default|auto)\b/
    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      return weakDisabledCursorPattern.test(content) ? [relative(process.cwd(), file)] : []
    })

    expect(violations).toEqual([])
  })

  it('keeps clickable controls at the Design.md minimum touch target', () => {
    const button = readFileSync(join(process.cwd(), 'src/components/ui/button.tsx'), 'utf8')
    const globals = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

    expect(button).toContain('min-h-11')
    expect(button).toContain('min-w-11')
    expect(globals).toContain('min-height: 44px')
    expect(globals).toContain('min-width: 44px')
    expect(globals).toContain('touch-action: manipulation')
  })

  it('keeps core form and navigation primitives at the minimum touch target', () => {
    const controls = [
      {
        file: 'src/components/ui/input.tsx',
        required: ['min-h-11'],
      },
      {
        file: 'src/components/ui/select.tsx',
        required: ['min-h-11', 'min-w-11'],
      },
      {
        file: 'src/components/ui/tabs.tsx',
        required: ['group-data-horizontal/tabs:min-h-11', 'min-h-11', 'min-w-11'],
      },
      {
        file: 'src/components/ui/textarea.tsx',
        required: ['min-h-16'],
      },
    ]

    const violations = controls.flatMap(({ file, required }) => {
      const content = readFileSync(join(process.cwd(), file), 'utf8')
      return required
        .filter((token) => !content.includes(token))
        .map((token) => `${file}: missing ${token}`)
    })

    expect(violations).toEqual([])
  })

  it('keeps command and select menu affordances explicitly clickable', () => {
    const controls = [
      {
        file: 'src/components/ui/command.tsx',
        required: ['cursor-pointer', 'data-[disabled=true]:cursor-not-allowed'],
        forbidden: ['cursor-default', 'data-[disabled=true]:pointer-events-none'],
      },
      {
        file: 'src/components/ui/select.tsx',
        required: [
          'data-slot="select-scroll-up-button"',
          'data-slot="select-scroll-down-button"',
          'cursor-pointer',
          'min-h-11',
          'data-disabled:cursor-not-allowed',
        ],
        forbidden: ['cursor-default'],
      },
    ]

    const violations = controls.flatMap(({ file, required, forbidden }) => {
      const content = readFileSync(join(process.cwd(), file), 'utf8')
      return [
        ...required.filter((token) => !content.includes(token)).map((token) => `${file}: missing ${token}`),
        ...forbidden.filter((token) => content.includes(token)).map((token) => `${file}: contains ${token}`),
      ]
    })

    expect(violations).toEqual([])
  })

  it('keeps native form controls at the minimum touch target globally', () => {
    const globals = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
    const formControlBlock = getCssRuleBlock(globals, 'input, textarea, select')

    expect(formControlBlock).toContain('min-height: 44px')
    expect(formControlBlock).toContain('min-width: 44px')
    expect(formControlBlock).toContain('touch-action: manipulation')
  })

  it('gives icon-only buttons an accessible name', () => {
    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      const relativePath = relative(process.cwd(), file)
      const matches = [...content.matchAll(/<Button\b(?=[^>]*\bsize=["']icon(?:-[^"']*)?["'])[\s\S]*?<\/Button>/g)]

      return matches.flatMap((match) => {
        const block = match[0]
        const hasAccessibleName =
          block.includes('aria-label=') ||
          block.includes('title=') ||
          block.includes('sr-only')

        if (hasAccessibleName) return []

        const line = content.slice(0, match.index).split(/\r?\n/).length
        return [`${relativePath}:${line}`]
      })
    })

    expect(violations).toEqual([])
  })

  it('gives native icon-only buttons an accessible name', () => {
    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      const relativePath = relative(process.cwd(), file)
      const matches = [
        ...content.matchAll(/<button\b[\s\S]*?<\/button>/g),
        ...content.matchAll(/<button\b[^>]*\/>/g),
      ]

      return matches.flatMap((match) => {
        const block = match[0]
        const openingTag = getOpeningTag(block)
        const inner = openingTag.length > 0
          ? block.slice(openingTag.length).replace(/<\/button>/, '')
          : block
        const hasAccessibleName =
          openingTag.includes('aria-label=') ||
          openingTag.includes('title=') ||
          block.includes('sr-only')
        const visibleText = getVisibleTextSignal(inner)

        if (hasAccessibleName || visibleText.length > 0) return []

        const line = content.slice(0, match.index).split(/\r?\n/).length
        return [`${relativePath}:${line}`]
      })
    })

    expect(violations).toEqual([])
  })

  it('does not rely on title-only labels for native icon-only buttons', () => {
    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      const relativePath = relative(process.cwd(), file)
      const matches = [...content.matchAll(/<button\b[\s\S]*?<\/button>/g)]

      return matches.flatMap((match) => {
        const block = match[0]
        const openingTag = getOpeningTag(block)
        const inner = openingTag.length > 0
          ? block.slice(openingTag.length).replace(/<\/button>/, '')
          : block
        const isIconOnly = getVisibleTextSignal(inner).length === 0
        const hasProgrammaticName =
          openingTag.includes('aria-label=') ||
          block.includes('sr-only')
        const reliesOnTitleOnly =
          openingTag.includes('title=') &&
          !hasProgrammaticName

        if (!isIconOnly || !reliesOnTitleOnly) return []

        const line = content.slice(0, match.index).split(/\r?\n/).length
        return [`${relativePath}:${line}`]
      })
    })

    expect(violations).toEqual([])
  })

  it('uses destructive tokens for native trash icon buttons', () => {
    const redUtilityPattern = /\b(?:text|bg|border|hover:text|hover:bg|hover:border)-red-\d{2,3}\b/
    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      const relativePath = relative(process.cwd(), file)
      const matches = [...content.matchAll(/<(?:button|Button)\b[\s\S]*?<\/(?:button|Button)>/g)]

      return matches.flatMap((match) => {
        const block = match[0]
        if (!block.includes('<Trash2') || !redUtilityPattern.test(block)) return []

        const line = content.slice(0, match.index).split(/\r?\n/).length
        return [`${relativePath}:${line}`]
      })
    })

    expect(violations).toEqual([])
  })

  it('keeps native and motion click buttons from submitting forms accidentally', () => {
    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      const relativePath = relative(process.cwd(), file)
      const matches = [
        ...content.matchAll(/<button\b[\s\S]*?<\/button>/g),
        ...content.matchAll(/<motion\.button\b[\s\S]*?<\/motion\.button>/g),
      ]

      return matches.flatMap((match) => {
        const openingTag = getOpeningTag(match[0])
        const handlesClick = openingTag.includes('onClick=')
        const hasExplicitType = /\btype=/.test(openingTag)

        if (!handlesClick || hasExplicitType) return []

        const line = content.slice(0, match.index).split(/\r?\n/).length
        return [`${relativePath}:${line}`]
      })
    })

    expect(violations).toEqual([])
  })

  it('keeps Button popover triggers inside forms from submitting accidentally', () => {
    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      const relativePath = relative(process.cwd(), file)
      const formMatches = [...content.matchAll(/<form\b[\s\S]*?<\/form>/g)]

      return formMatches.flatMap((formMatch) => {
        const formBlock = formMatch[0]
        const triggerMatches = [...formBlock.matchAll(/<PopoverTrigger\b[\s\S]*?<Button\b([\s\S]*?)(?:>|\/>)/g)]

        return triggerMatches.flatMap((triggerMatch) => {
          const buttonAttrs = triggerMatch[1]
          if (/\btype=/.test(buttonAttrs)) return []

          const absoluteIndex = (formMatch.index ?? 0) + (triggerMatch.index ?? 0)
          const line = content.slice(0, absoluteIndex).split(/\r?\n/).length
          return [`${relativePath}:${line}`]
        })
      })
    })

    expect(violations).toEqual([])
  })

  it('gives native icon-only links an accessible name and touch target', () => {
    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      const relativePath = relative(process.cwd(), file)
      const matches = [...content.matchAll(/<a\b[\s\S]*?<\/a>/g)]

      return matches.flatMap((match) => {
        const block = match[0]
        const openingTag = getOpeningTag(block)
        const inner = block
          .slice(openingTag.length)
          .replace(/<\/a>/, '')
        const visibleText = inner
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, '')

        if (visibleText.length > 0) return []

        const hasAccessibleName =
          openingTag.includes('aria-label=') ||
          openingTag.includes('title=') ||
          block.includes('sr-only')
        const hasTouchTarget =
          /(?:min-h-11|h-11|size-11)/.test(openingTag) &&
          /(?:min-w-11|w-11|size-11)/.test(openingTag)

        if (hasAccessibleName && hasTouchTarget) return []

        const line = content.slice(0, match.index).split(/\r?\n/).length
        return [`${relativePath}:${line}`]
      })
    })

    expect(violations).toEqual([])
  })

  it('keeps the project color picker accessible', () => {
    const form = readFileSync(join(process.cwd(), 'src/components/projects/create-project-form.tsx'), 'utf8')

    expect(form).toContain('aria-label="Elegir color del proyecto"')
    expect(form).toContain('aria-label={`Seleccionar color ${c}`}')
  })

  it('keeps settings integration icons monochrome', () => {
    const settings = readFileSync(join(process.cwd(), SETTINGS_PAGE), 'utf8')

    expect(settings).not.toContain('text-[#229ED9]')
    expect(settings).not.toContain('text-[#34A853]')
  })

  it('implements AiThinking as the required monochrome three-dot component', () => {
    const aiThinking = readFileSync(join(process.cwd(), 'src/components/ui/ai-thinking.tsx'), 'utf8')
    const globals = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

    expect(aiThinking).not.toContain('lucide-react')
    expect(aiThinking).not.toContain('BrainCircuit')
    expect(aiThinking).toContain('Array.from({ length: 3 })')
    expect(aiThinking).toContain('motion-reduce:animate-none')
    expect(globals).toContain('@keyframes ai-thinking-wave')
  })

  it('keeps rendered images grayscale without color hover overrides', () => {
    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      return /hover:grayscale-0|group-hover:grayscale-0|filter:\s*none/.test(content)
        ? [relative(process.cwd(), file)]
        : []
    })

    expect(violations).toEqual([])
  })

  it('uses AiThinking for known Gemini waits', () => {
    const violations = AI_WAIT_FILES.flatMap((file) => {
      const content = readFileSync(join(process.cwd(), file), 'utf8')
      return content.includes('AiThinking') ? [] : [file]
    })

    expect(violations).toEqual([])
  })

  it('keeps calendar event styling scoped and free of side-stripe accents', () => {
    const globals = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
    const calendarCss = readFileSync(join(process.cwd(), 'src/components/calendar/calendar-view.css'), 'utf8')
    const calendarView = readFileSync(join(process.cwd(), 'src/components/calendar/calendar-view.tsx'), 'utf8')

    expect(globals).not.toContain('.rbc-event')
    expect(globals).not.toContain('Calendar view')
    expect(calendarCss).not.toMatch(/box-shadow:\s*inset\s+[2-9]px\s+0\s+0\s+0\s+var\(--event-fg\)/)
    expect(calendarCss).not.toMatch(/border-left:\s*[2-9]px\s+solid\s+var\(--agenda-event-fg\)/)
    expect(calendarCss).not.toMatch(/border-left:\s*[2-9]px\s+solid\s+var\(--event-fg\)/)
    expect(calendarCss).not.toContain('agenda-event-accent')
    expect(calendarView).not.toContain('left accent stripe')
    expect(calendarView).not.toContain('agenda-event-accent')
  })

  it('keeps calendar date chrome neutral and uses accent only for today', () => {
    const calendarCss = readFileSync(join(process.cwd(), 'src/components/calendar/calendar-view.css'), 'utf8')
    const calendarView = readFileSync(join(process.cwd(), 'src/components/calendar/calendar-view.tsx'), 'utf8')

    expect(calendarCss).not.toContain('rbc-header:nth-child(6)')
    expect(calendarCss).not.toContain('rbc-header:nth-child(7)')
    expect(calendarCss).toContain('border: 1px solid var(--accent)')
    expect(calendarView).not.toContain('isWeekend')
    expect(calendarView).not.toContain('bg-destructive text-destructive-foreground')
    expect(calendarView).not.toContain('border-destructive')
    expect(calendarView).toContain('border-accent bg-accent/10 text-accent')
  })

  it('keeps task navigation and task rows visually proportional', () => {
    const sidebar = readFileSync(join(process.cwd(), 'src/components/layout/sidebar.tsx'), 'utf8')
    const taskItem = readFileSync(join(process.cwd(), 'src/components/tasks/task-item.tsx'), 'utf8')
    const taskListView = readFileSync(join(process.cwd(), 'src/components/tasks/task-list-view.tsx'), 'utf8')
    const login = readFileSync(join(process.cwd(), 'src/app/login/page.tsx'), 'utf8')
    const brandMark = readFileSync(join(process.cwd(), 'src/components/ui/brand-mark.tsx'), 'utf8')

    expect(sidebar).toContain('w-56')
    expect(sidebar).not.toContain('w-64')
    expect(sidebar).toContain('justify-center')
    expect(sidebar).toContain('BrandMark')

    expect(taskItem).toContain('min-h-[56px]')
    expect(taskItem).toContain('h-5 w-5')
    expect(taskItem).not.toContain('w-6 h-6')
    expect(taskListView).toContain('h-[56px]')
    expect(taskListView).not.toContain('h-[72px]')

    expect(login).toContain('BrandMark')
    expect(brandMark).toContain('Acrue')
    expect(brandMark).toContain('font-medium lowercase tracking-normal text-foreground')
    expect(brandMark).not.toContain('font-light lowercase tracking-normal text-foreground')
  })

  it('keeps login mobile composition constrained for installed PWA use', () => {
    const login = readFileSync(join(process.cwd(), 'src/app/login/page.tsx'), 'utf8')

    expect(login).toContain('min-h-dvh')
    expect(login).toContain('px-4')
    expect(login).toContain('max-w-[360px]')
    expect(login).not.toContain('sm:w-[350px]')
  })

  it('keeps the full top-level sidebar module row clickable', () => {
    const sidebar = readFileSync(join(process.cwd(), 'src/components/layout/sidebar.tsx'), 'utf8')

    expect(sidebar).toContain('absolute inset-0')
    expect(sidebar).toContain('aria-label={`Ir a ${item.name}`}')
    expect(sidebar).toContain('pointer-events-none')
  })

  it('keeps top-level sidebar module rows compact while preserving the 44px target', () => {
    const sidebar = readFileSync(join(process.cwd(), 'src/components/layout/sidebar.tsx'), 'utf8')

    expect(sidebar).toContain('"relative flex min-h-11 items-center justify-between rounded-md px-2.5 transition-[background-color,color,box-shadow]')
    expect(sidebar).not.toContain('"relative flex min-h-11 items-center justify-between rounded-md px-2.5 py-1.5')
    expect(sidebar).not.toContain('pointer-events-none flex min-h-11 items-center')
  })

  it('keeps the sidebar scrollable without showing a visual scrollbar', () => {
    const sidebar = readFileSync(join(process.cwd(), 'src/components/layout/sidebar.tsx'), 'utf8')
    const globals = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

    expect(sidebar).toContain('flex-1 overflow-y-auto no-scrollbar py-3')
    expect(globals).toContain('.no-scrollbar')
    expect(globals).toContain('scrollbar-width: none')
    expect(globals).toContain('-ms-overflow-style: none')
    expect(globals).toContain('.no-scrollbar::-webkit-scrollbar')
    expect(globals).toContain('display: none')
  })

  it('lets recipe ingredients be marked as required or optional', () => {
    const form = readFileSync(join(process.cwd(), 'src/components/recipes/RecipeForm.tsx'), 'utf8')
    const detail = readFileSync(join(process.cwd(), 'src/components/recipes/RecipeDetail.tsx'), 'utf8')

    expect(form).toContain('is_optional')
    expect(form).toContain('Obligatorio')
    expect(form).toContain('Opcional')
    expect(form).toContain('aria-label={`Marcar ingrediente ${index + 1} como ${ing.is_optional ? "obligatorio" : "opcional"}`}')
    expect(detail).toContain('Opcional')
  })

  it('does not write browser console messages in visible UI source', () => {
    const consolePattern = /console\.(log|debug|info|warn|error)/
    const violations = UI_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      return consolePattern.test(content) ? [relative(process.cwd(), file)] : []
    })

    expect(violations).toEqual([])
  })

  it('does not use console.log in production source', () => {
    const violations = PRODUCTION_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      return content.includes('console.log') ? [relative(process.cwd(), file)] : []
    })

    expect(violations).toEqual([])
  })
})
