import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const PRODUCTION_FILES = collectFiles(join(process.cwd(), 'src'))
const ALLOWED_CONSOLE_FILES = new Set(['src\\lib\\server\\logger.ts'])
const ALLOWED_SERVICE_ROLE_FILES = new Set(['src\\utils\\supabase\\service.ts'])

function collectFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) return collectFiles(path)
    return /\.(tsx|ts)$/.test(entry) && !entry.endsWith('.test.tsx') && !entry.endsWith('.test.ts')
      ? [path]
      : []
  })
}

function collectSqlFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) return collectSqlFiles(path)
    return entry.endsWith('.sql') ? [path] : []
  })
}

describe('Acrue project hygiene static rules', () => {
  it('keeps Sentry config environment-driven and privacy-safe', () => {
    const sentryFiles = [
      'sentry.client.config.ts',
      'sentry.server.config.ts',
      'sentry.edge.config.ts',
      'src/instrumentation-client.ts',
      'next.config.ts',
    ]
    const violations = sentryFiles.flatMap((file) => {
      const content = readFileSync(join(process.cwd(), file), 'utf8')
      const issues = [
        /https:\/\/[^'"\s]+\.sentry\.io\/\d+/.test(content) ? 'hardcoded DSN' : null,
        /sendDefaultPii:\s*true/.test(content) ? 'PII enabled' : null,
        /tunnelRoute\s*:/.test(content) ? 'browser tunnel enabled' : null,
      ].filter(Boolean)

      return issues.length > 0 ? [`${file}: ${issues.join(', ')}`] : []
    })

    expect(violations).toEqual([])
  })

  it('keeps active Sentry initializers privacy-safe and low volume', () => {
    const sentryFiles = [
      'sentry.server.config.ts',
      'sentry.edge.config.ts',
      'src/instrumentation-client.ts',
    ]

    const violations = sentryFiles.flatMap((file) => {
      const content = readFileSync(join(process.cwd(), file), 'utf8')
      if (!/Sentry\.init\(/.test(content)) return []

      const issues = [
        content.includes('sendDefaultPii: false') ? null : 'missing sendDefaultPii false',
        /tracesSampleRate:\s*0\.1\b/.test(content) ? null : 'trace sample is not 0.1',
      ].filter(Boolean)

      return issues.length > 0 ? [`${file}: ${issues.join(', ')}`] : []
    })

    expect(violations).toEqual([])
  })

  it('keeps browser Sentry disabled on local app origins', () => {
    const browserSentryFiles = [
      'src/instrumentation-client.ts',
    ]

    const violations = browserSentryFiles.flatMap((file) => {
      const content = readFileSync(join(process.cwd(), file), 'utf8')
      const issues = [
        content.includes('isLocalSentryHost') ? null : 'missing local host guard',
        /['"]localhost['"]/.test(content) ? null : 'missing localhost',
        /['"]127\.0\.0\.1['"]/.test(content) ? null : 'missing 127.0.0.1',
        /['"]::1['"]/.test(content) ? null : 'missing ::1',
        content.includes('enabled: Boolean(browserSentryDsn) && !isLocalSentryHost')
          ? null
          : 'missing enabled gate',
      ].filter(Boolean)

      return issues.length > 0 ? [`${file}: ${issues.join(', ')}`] : []
    })

    expect(violations).toEqual([])
  })

  it('initializes browser Sentry from a single client entrypoint', () => {
    const browserSentryFiles = [
      'sentry.client.config.ts',
      'src/instrumentation-client.ts',
    ]
    const initializers = browserSentryFiles.filter((file) => {
      const content = readFileSync(join(process.cwd(), file), 'utf8')
      return /Sentry\.init\(/.test(content)
    })

    expect(initializers).toEqual(['src/instrumentation-client.ts'])
  })

  it('keeps local env files out of Vercel CLI uploads', () => {
    const vercelIgnore = readFileSync(join(process.cwd(), '.vercelignore'), 'utf8')

    expect(vercelIgnore).toContain('.env*')
    expect(vercelIgnore).toContain('!.env.example')
  })

  it('does not keep local debugging artifacts in the repository workspace', () => {
    const forbiddenArtifacts = [
      'dev.log',
      'nextjs_logs.txt',
      'ts_errors.txt',
      'trpc_error.html',
      'replace_visuals.mjs',
      'scripts/test-db-error.ts',
      'scripts/test-moodle-calendar.ts',
      'supabase/.temp/cli-latest',
    ]

    const existingArtifacts = forbiddenArtifacts.filter((artifact) =>
      existsSync(join(process.cwd(), artifact))
    )

    expect(existingArtifacts).toEqual([])
  })

  it('routes production diagnostics through the central logger', () => {
    const consolePattern = /console\.(log|debug|info|warn|error)/
    const violations = PRODUCTION_FILES.flatMap((file) => {
      const relativePath = relative(process.cwd(), file)
      if (ALLOWED_CONSOLE_FILES.has(relativePath)) return []

      const content = readFileSync(file, 'utf8')
      return consolePattern.test(content) ? [relativePath] : []
    })

    expect(violations).toEqual([])
  })

  it('uses noopener and noreferrer for new browser tabs', () => {
    const unsafeBlankTargets = PRODUCTION_FILES.flatMap((file) => {
      const relativePath = relative(process.cwd(), file)
      const content = readFileSync(file, 'utf8')
      const matches = content.match(/window\.open\([^)]*['_"]_blank['_"][^)]*\)/g) ?? []
      const unsafeMatches = matches.filter((match) => !/noopener/.test(match) || !/noreferrer/.test(match))

      return unsafeMatches.length > 0 ? [`${relativePath}: ${unsafeMatches.join(', ')}`] : []
    })

    expect(unsafeBlankTargets).toEqual([])
  })

  it('schedules the daily morning briefing at 8 AM Buenos Aires time', () => {
    const vercelConfig = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
      crons?: Array<{ path: string; schedule: string }>
    }

    expect(vercelConfig.crons).toContainEqual({
      path: '/api/cron/morning-briefing',
      schedule: '0 11 * * *',
    })
  })

  it('schedules the weekly summary at 8 PM Buenos Aires time on Sundays', () => {
    const vercelConfig = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
      crons?: Array<{ path: string; schedule: string }>
    }

    expect(vercelConfig.crons).toContainEqual({
      path: '/api/cron/weekly-summary',
      schedule: '0 23 * * 0',
    })
  })

  it('schedules recurring task generation at midnight Buenos Aires time', () => {
    const vercelConfig = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
      crons?: Array<{ path: string; schedule: string }>
    }

    expect(vercelConfig.crons).toContainEqual({
      path: '/api/cron/recurrence',
      schedule: '0 3 * * *',
    })
  })

  it('exposes GET handlers for every Vercel Cron path', () => {
    const vercelConfig = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
      crons?: Array<{ path: string; schedule: string }>
    }

    const missingHandlers = (vercelConfig.crons ?? []).flatMap((cron) => {
      const routePath = join(
        process.cwd(),
        'src/app',
        cron.path.replace(/^\/+/, ''),
        'route.ts'
      )
      if (!existsSync(routePath)) return [`${cron.path}: missing route.ts`]

      const route = readFileSync(routePath, 'utf8')
      return /\bexport\s+async\s+function\s+GET\b/.test(route)
        ? []
        : [`${cron.path}: missing GET handler`]
    })

    expect(missingHandlers).toEqual([])
  })

  it('keeps Vercel Cron schedules compatible with the Hobby plan', () => {
    const vercelConfig = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
      name?: string
      crons?: Array<{ path: string; schedule: string }>
    }
    const nonDailySchedules = (vercelConfig.crons ?? []).flatMap((cron) => {
      const fields = cron.schedule.trim().split(/\s+/)
      const runsMoreThanDaily =
        fields.length !== 5 ||
        fields[0].includes('/') ||
        fields[1].includes('/') ||
        fields[0] === '*' ||
        fields[1] === '*'

      return runsMoreThanDaily ? [`${cron.path}: ${cron.schedule}`] : []
    })

    expect(vercelConfig.name).toBeUndefined()
    expect(nonDailySchedules).toEqual([])
  })

  it('uses the configured public app URL for production Supabase OAuth redirects', () => {
    const loginPage = readFileSync(join(process.cwd(), 'src/app/login/page.tsx'), 'utf8')

    expect(loginPage).toContain('NEXT_PUBLIC_APP_URL')
    expect(loginPage).toContain('/auth/callback')
    expect(loginPage).not.toContain('redirectTo: `${window.location.origin}/auth/callback`')
  })

  it('keeps trash cleanup cron on the service-role Supabase client', () => {
    const route = readFileSync(
      join(process.cwd(), 'src/app/api/cron/cleanup-trash/route.ts'),
      'utf8'
    )
    const vercelConfig = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
      crons?: Array<{ path: string; schedule: string }>
    }

    expect(route).not.toContain("@/utils/supabase/server")
    expect(route).toContain('@/utils/supabase/service')
    expect(route).toContain("'calendar_events'")
    expect(vercelConfig.crons).toContainEqual({
      path: '/api/cron/cleanup-trash',
      schedule: '0 3 * * *',
    })
  })

  it('does not let cron jobs fall back to Supabase anon keys', () => {
    const cronFiles = collectFiles(join(process.cwd(), 'src/app/api/cron'))
    const violations = cronFiles.flatMap((file) => {
      const relativePath = relative(process.cwd(), file)
      const content = readFileSync(file, 'utf8')
      const forbiddenTokens = [
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_ANON_KEY',
      ].filter((token) => content.includes(token))

      return forbiddenTokens.length > 0
        ? [`${relativePath}: ${forbiddenTokens.join(', ')}`]
        : []
    })

    expect(violations).toEqual([])
  })

  it('keeps cron Supabase admin access on the shared service client helper', () => {
    const cronFiles = collectFiles(join(process.cwd(), 'src/app/api/cron'))
    const violations = cronFiles.flatMap((file) => {
      const relativePath = relative(process.cwd(), file)
      const content = readFileSync(file, 'utf8')

      return content.includes("from '@supabase/supabase-js'")
        ? [relativePath]
        : []
    })

    expect(violations).toEqual([])
  })

  it('does not initialize Supabase service-role clients at cron module scope', () => {
    const cronFiles = collectFiles(join(process.cwd(), 'src/app/api/cron'))
    const violations = cronFiles.flatMap((file) => {
      const relativePath = relative(process.cwd(), file)
      const content = readFileSync(file, 'utf8')
      const handlerIndex = content.search(/\bexport\s+async\s+function\s+(GET|POST)\b/)
      const moduleScope = handlerIndex === -1 ? content : content.slice(0, handlerIndex)

      return /createClient\([\s\S]*SUPABASE_SERVICE_ROLE_KEY/.test(moduleScope)
        ? [relativePath]
        : []
    })

    expect(violations).toEqual([])
  })

  it('uses the dedicated telegram_chat_id column instead of settings JSON', () => {
    const violations = PRODUCTION_FILES.flatMap((file) => {
      const relativePath = relative(process.cwd(), file)
      const content = readFileSync(file, 'utf8')

      return /settings\?\.\s*telegram_chat_id/.test(content)
        ? [relativePath]
        : []
    })

    expect(violations).toEqual([])
  })

  it('keeps project documentation aligned with dedicated Telegram storage', () => {
    const documentationFiles = [
      'Roadmap.md',
      'AUDIT_2026-06-13.md',
      'README.md',
    ]
    const violations = documentationFiles.flatMap((file) => {
      const content = readFileSync(join(process.cwd(), file), 'utf8')
      return /(telegram|chat_id)[^.\n]*users\.settings|users\.settings[^.\n]*(telegram|chat_id)/i.test(content)
        ? [file]
        : []
    })

    expect(violations).toEqual([])
  })

  it('does not expose Google refresh tokens to client components', () => {
    const violations = PRODUCTION_FILES.flatMap((file) => {
      const relativePath = relative(process.cwd(), file)
      const content = readFileSync(file, 'utf8')
      const isClientFile = /^\s*['"]use client['"]/.test(content)

      return isClientFile && content.includes('google_refresh_token')
        ? [relativePath]
        : []
    })

    expect(violations).toEqual([])
  })

  it('keeps Google refresh tokens out of user settings JSON', () => {
    const tokenHandlingFiles = [
      'src/app/api/auth/google/callback/route.ts',
      'src/app/api/cron/google-sync/route.ts',
      'src/app/api/integrations/status/route.ts',
      'src/lib/google-calendar.ts',
    ]
    const violations = tokenHandlingFiles.flatMap((file) => {
      const content = readFileSync(join(process.cwd(), file), 'utf8')
      const storesTokenInSettings = /settings\s*:\s*\{[\s\S]*google_refresh_token/.test(content)
      const readsTokenFromSettings = /settings\??\.[\s\S]*google_refresh_token/.test(content)
      const selectsUserSettingsForToken = /select\(['"`]id,\s*settings['"`]\)|select\(['"`]settings/.test(content)

      return storesTokenInSettings || readsTokenFromSettings || selectsUserSettingsForToken
        ? [file]
        : []
    })

    const migrations = collectSqlFiles(join(process.cwd(), 'supabase/migrations'))
    const hasDedicatedTable = migrations.some((file) =>
      readFileSync(file, 'utf8').includes('CREATE TABLE IF NOT EXISTS public.google_integrations')
    )

    expect(violations).toEqual([])
    expect(hasDedicatedTable).toBe(true)
  })

  it('uses the service Supabase helper for service-role keys', () => {
    const violations = PRODUCTION_FILES.flatMap((file) => {
      const relativePath = relative(process.cwd(), file)
      const content = readFileSync(file, 'utf8')

      return /createServerClient\([\s\S]*SUPABASE_SERVICE_ROLE_KEY/.test(content)
        ? [relativePath]
        : []
    })

    expect(violations).toEqual([])
  })

  it('keeps raw Supabase service-role keys inside the service helper', () => {
    const violations = PRODUCTION_FILES.flatMap((file) => {
      const relativePath = relative(process.cwd(), file)
      if (ALLOWED_SERVICE_ROLE_FILES.has(relativePath)) return []

      const content = readFileSync(file, 'utf8')
      return content.includes('SUPABASE_SERVICE_ROLE_KEY') ? [relativePath] : []
    })

    expect(violations).toEqual([])
  })

  it('routes server external integration clients through the shared fallback helper', () => {
    const integrationFiles = [
      'src/app/api/auth/google/callback/route.ts',
      'src/lib/google-gmail.ts',
      'src/lib/gemini/vision.ts',
      'src/lib/google-calendar.ts',
      'src/lib/moodle/client.ts',
      'src/lib/telegram.ts',
    ]
    const violations = integrationFiles.flatMap((file) => {
      const content = readFileSync(join(process.cwd(), file), 'utf8')

      return content.includes("@/lib/integrations/resilience") && /\bwithFallback\b/.test(content)
        ? []
        : [file]
    })

    expect(violations).toEqual([])
  })

  it('requests Gmail readonly scope during Google OAuth linking', () => {
    const authRoute = readFileSync(join(process.cwd(), 'src/app/api/auth/google/route.ts'), 'utf8')
    const settingsPage = readFileSync(join(process.cwd(), 'src/app/(app)/configuracion/page.tsx'), 'utf8')

    expect(authRoute).toContain('https://www.googleapis.com/auth/gmail.readonly')
    expect(settingsPage).toContain('Google Calendar y Gmail')
    expect(settingsPage).toContain('Gmail se usa para armar el digest')
  })

  it('keeps daily and weekly briefing crons on the shared briefing service', () => {
    const dailyCron = readFileSync(join(process.cwd(), 'src/app/api/cron/morning-briefing/route.ts'), 'utf8')
    const weeklyCron = readFileSync(join(process.cwd(), 'src/app/api/cron/weekly-summary/route.ts'), 'utf8')
    const briefing = readFileSync(join(process.cwd(), 'src/lib/gemini/briefing.ts'), 'utf8')

    expect(dailyCron).toContain('buildDailyBriefing')
    expect(dailyCron).toContain('formatDailyBriefingTelegram')
    expect(weeklyCron).toContain('buildWeeklySummary')
    expect(weeklyCron).toContain('formatWeeklySummaryTelegram')
    expect(briefing).toContain('export async function buildDailyBriefing')
    expect(briefing).toContain('export async function buildWeeklySummary')
  })

  it('keeps recoverable Gemini failures out of the Next.js error overlay', () => {
    const client = readFileSync(join(process.cwd(), 'src/lib/gemini/client.ts'), 'utf8')

    expect(client).toContain('withFallback')
    expect(client).not.toContain("logger.error('Gemini error:'")
    expect(client).not.toContain('console.error')
  })

  it('ships Inicio as the default app surface instead of redirecting to tareas', () => {
    const appPage = readFileSync(join(process.cwd(), 'src/app/(app)/page.tsx'), 'utf8')
    const sidebar = readFileSync(join(process.cwd(), 'src/components/layout/sidebar.tsx'), 'utf8')
    const bottomNav = readFileSync(join(process.cwd(), 'src/components/layout/bottom-nav.tsx'), 'utf8')

    expect(appPage).toContain('InicioModule')
    expect(appPage).not.toContain("redirect('/tareas')")
    expect(appPage).not.toContain('redirect("/tareas")')
    expect(sidebar).toContain('name: "Inicio"')
    expect(bottomNav).toContain('href: "/"')
  })

  it('shows UndoToast when Gmail digest tasks are added from Inicio', () => {
    const inicio = readFileSync(join(process.cwd(), 'src/components/inicio/inicio-module.tsx'), 'utf8')
    const importer = readFileSync(join(process.cwd(), 'src/components/inicio/gmail-task-importer.tsx'), 'utf8')
    const route = readFileSync(join(process.cwd(), 'src/app/api/gmail/tasks/route.ts'), 'utf8')

    expect(inicio).toContain('GmailTaskImporter')
    expect(importer).toContain("'use client'")
    expect(importer).toContain('showUndoToast')
    expect(importer).toContain('/api/gmail/tasks')
    expect(route).toContain('createTasksFromGmailDigest')
    expect(route).toContain('enableUndo: true')
  })

  it('keeps automatic Gmail briefing task creation reversible', () => {
    const briefing = readFileSync(join(process.cwd(), 'src/lib/gemini/briefing.ts'), 'utf8')

    expect(briefing).toContain('createTasksFromGmailDigest(userId, digest.extractedTasks, supabase, {')
    expect(briefing).toContain('enableUndo: true')
  })

  it('uses a shared degraded-state notice instead of silent integration failures', () => {
    const notice = readFileSync(join(process.cwd(), 'src/components/shared/degraded-notice.tsx'), 'utf8')
    const inicio = readFileSync(join(process.cwd(), 'src/components/inicio/inicio-module.tsx'), 'utf8')
    const dollarWidget = readFileSync(join(process.cwd(), 'src/components/finances/DollarWidget.tsx'), 'utf8')
    const predictionWidget = readFileSync(join(process.cwd(), 'src/components/finances/PredictionWidget.tsx'), 'utf8')
    const calendarView = readFileSync(join(process.cwd(), 'src/components/calendar/calendar-view.tsx'), 'utf8')
    const campusTab = readFileSync(join(process.cwd(), 'src/components/estudio/campus-tab.tsx'), 'utf8')
    const settingsPage = readFileSync(join(process.cwd(), 'src/app/(app)/configuracion/page.tsx'), 'utf8')

    expect(notice).toContain("'use client'")
    expect(notice).toContain('role="status"')
    expect(notice).toContain('cursor-pointer')
    expect(inicio).toContain('DegradedNotice')
    expect(dollarWidget).toContain('DegradedNotice')
    expect(predictionWidget).toContain('DegradedNotice')
    expect(calendarView).toContain('DegradedNotice')
    expect(campusTab).toContain('DegradedNotice')
    expect(settingsPage).toContain('DegradedNotice')
    expect(calendarView).toContain('Google Calendar no disponible')
    expect(campusTab).toContain('Moodle no disponible')
    expect(predictionWidget).not.toContain('if (error || !prediction) return null')
  })

  it('keeps settings integration status failures visible and retryable', () => {
    const settingsPage = readFileSync(join(process.cwd(), 'src/app/(app)/configuracion/page.tsx'), 'utf8')

    expect(settingsPage).toContain('integrationStatusError')
    expect(settingsPage).toContain('Integraciones no disponibles')
    expect(settingsPage).toContain('onRetry={() => void fetchUserAndIntegrationSettings()}')
    expect(settingsPage).toMatch(/try\s*{[\s\S]*fetch\("\/api\/integrations\/status"\)[\s\S]*}\s*catch/)

    const statusRoute = readFileSync(join(process.cwd(), 'src/app/api/integrations/status/route.ts'), 'utf8')
    expect(statusRoute).not.toContain('Unauthorized')
    expect(statusRoute).toContain('No autenticado')
  })

  it('shows degraded services for both daily and weekly briefing surfaces in Inicio', () => {
    const inicio = readFileSync(join(process.cwd(), 'src/components/inicio/inicio-module.tsx'), 'utf8')

    expect(inicio).toContain('briefing.degradedServices')
    expect(inicio).toContain('weeklySummary.degradedServices')
    expect(inicio).toContain('Resumen semanal incompleto')
  })

  it('keeps Inicio daily briefing visible with monthly habit rhythm and flippable weather', () => {
    const inicio = readFileSync(join(process.cwd(), 'src/components/inicio/inicio-module.tsx'), 'utf8')
    const weatherCardPath = join(process.cwd(), 'src/components/inicio/weather-flip-card.tsx')
    const weatherCard = existsSync(weatherCardPath) ? readFileSync(weatherCardPath, 'utf8') : ''

    expect(inicio).toContain('WeatherFlipCard')
    expect(inicio).toContain('briefing.marDelPlataWeather')
    expect(inicio).toContain('<HeaderDailyQuote quote={briefing.quote} />')
    expect(inicio).toContain('className="mt-4 w-full text-center"')
    expect(inicio).toContain('&mdash; {quote.author}')
    expect(inicio).not.toContain('description="Lo importante de hoy')
    expect(inicio).not.toContain('<DailyQuote text={briefing.quote.text}')
    expect(inicio).toContain('<OperationalSummaryPanel summary={briefing.operationalSummary} />')
    expect(inicio).toContain('function OperationalSummaryPanel')
    expect(inicio).toContain("const PANEL_TITLE_CLASS = 'text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground'")
    expect(inicio).toContain('Briefing diario')
    expect(inicio).toContain('IA')
    expect(inicio).toContain('<h2 className={PANEL_TITLE_CLASS}>Briefing diario</h2>')
    expect(inicio).toContain('<span className={cn(PANEL_TITLE_CLASS,')
    expect(inicio).toContain('<h2 className={PANEL_TITLE_CLASS}>{title}</h2>')
    expect(inicio).toContain('generatedAt={briefing.generatedAt}')
    expect(inicio).toContain('function SignalMeter')
    expect(inicio).not.toContain('function OperationalSignals')
    expect(inicio).not.toContain('function BriefingList')
    expect(inicio).toContain('function GmailStatusPanel')
    expect(inicio).not.toContain("'warning'")
    expect(inicio).not.toContain('bg-warning')
    expect(inicio).not.toContain('border-warning')
    expect(inicio).not.toContain('text-warning')
    expect(inicio).not.toContain('bg-success/15')
    expect(inicio).not.toContain('toneClasses.soft')
    expect(inicio).not.toContain('toneClasses.border')
    expect(inicio).not.toContain('toneClasses.dot')
    expect(inicio).toContain('if (value <= 0) return 0')
    expect(inicio).toContain('className="mt-2 grid w-full max-w-[16.5rem] grid-cols-7 gap-1"')
    expect(inicio).toContain("'aspect-square min-h-5 w-full rounded-[4px] border transition-colors sm:min-h-6'")
    expect(inicio).toContain("if (value === 0) return 'border-border/70 bg-secondary/80'")
    expect(inicio).not.toContain("if (value === 0) return 'bg-muted'")
    expect(inicio).toContain('lg:grid-cols-[0.9fr_1.1fr]')
    expect(inicio).toContain('className="grid gap-3 sm:auto-rows-fr sm:grid-cols-2"')
    expect(weatherCard).toContain('flex h-full min-h-28 w-full')
    expect(weatherCard).toContain('relative block h-full min-h-28 w-full')
    expect(inicio).toContain('className="font-medium text-accent"')
    expect(inicio).not.toContain('underline decoration-accent')
    expect(inicio.indexOf('<DegradedNotice detail=')).toBeGreaterThan(
      inicio.indexOf('<Section title="Resumen semanal">')
    )
    expect(inicio).toContain('<Section title="Ritmo de hábitos" className="min-h-[14rem]">')
    expect(inicio).not.toMatch(/href="\/calendario"[\s\S]{0,240}label="Tandil"/)
    expect(weatherCard).toContain("'use client'")
    expect(weatherCard).toContain('cursor-pointer')
    expect(weatherCard).toContain('rotateY(180deg)')
    expect(weatherCard).toContain('Mar del Plata')
  })

  it('keeps local daily quotes source-backed and avoids loose attributions', () => {
    const briefing = readFileSync(join(process.cwd(), 'src/lib/gemini/briefing.ts'), 'utf8')

    expect(briefing).toContain("source: 'Meditaciones 4.17'")
    expect(briefing).toContain("source: 'Sobre la brevedad de la vida 1.1'")
    expect(briefing).toContain("source: 'Discursos 3.23.1'")
    expect(briefing).not.toContain('No expliques tu filosofia. Encarnala.')
    expect(briefing).not.toContain("author: 'Acrue'")
  })

  it('keeps protected app routers from calling cron endpoints over HTTP', () => {
    const routerFiles = collectFiles(join(process.cwd(), 'src/server/routers'))
    const violations = routerFiles.flatMap((file) => {
      const relativePath = relative(process.cwd(), file)
      const content = readFileSync(file, 'utf8')
      const issues = [
        content.includes('/api/cron/') ? 'cron endpoint self-call' : null,
        content.includes('CRON_SECRET') ? 'cron secret dependency' : null,
      ].filter(Boolean)

      return issues.length > 0 ? [`${relativePath}: ${issues.join(', ')}`] : []
    })

    expect(violations).toEqual([])
  })

  it('redirects legacy English app routes to Spanish canonical routes', () => {
    const legacyRoutes: Record<string, string> = {
      brain: '/cerebro',
      finances: '/finanzas',
      habits: '/habitos',
      pantry: '/despensa',
      recipes: '/recetas',
      settings: '/configuracion',
      study: '/estudio',
    }

    const violations = Object.entries(legacyRoutes).flatMap(([legacyRoute, canonicalRoute]) => {
      const file = `src/app/(app)/${legacyRoute}/page.tsx`
      const content = readFileSync(join(process.cwd(), file), 'utf8')
      const issues = [
        content.includes('next/navigation') && content.includes('redirect') ? null : 'missing redirect import',
        content.includes(`redirect('${canonicalRoute}')`) || content.includes(`redirect("${canonicalRoute}")`)
          ? null
          : `missing redirect to ${canonicalRoute}`,
      ].filter(Boolean)

      return issues.length > 0 ? [`${file}: ${issues.join(', ')}`] : []
    })

    expect(violations).toEqual([])
  })

  it('keeps Spanish canonical module routes from re-exporting legacy redirects', () => {
    const canonicalRoutes: Record<string, string> = {
      finanzas: 'FinanceTabs',
      despensa: 'PantryTabs',
      recetas: 'RecipeTabs',
    }

    const violations = Object.entries(canonicalRoutes).flatMap(([route, componentName]) => {
      const file = `src/app/(app)/${route}/page.tsx`
      const content = readFileSync(join(process.cwd(), file), 'utf8')
      const issues = [
        /\.\.\/(?:finances|pantry|recipes)\/page/.test(content) ? 're-exports legacy redirect' : null,
        content.includes(componentName) ? null : `missing ${componentName}`,
      ].filter(Boolean)

      return issues.length > 0 ? [`${file}: ${issues.join(', ')}`] : []
    })

    expect(violations).toEqual([])
  })

  it('versions optional recipe ingredients across schema and routers', () => {
    const migrations = collectSqlFiles(join(process.cwd(), 'supabase/migrations'))
    const migrationSql = migrations.map((file) => readFileSync(file, 'utf8')).join('\n')
    const schema = readFileSync(join(process.cwd(), 'src/server/schema/recipes.ts'), 'utf8')
    const recipeRouter = readFileSync(join(process.cwd(), 'src/server/routers/recipes.ts'), 'utf8')
    const mealLogRouter = readFileSync(join(process.cwd(), 'src/server/routers/mealLog.ts'), 'utf8')
    const suggester = readFileSync(join(process.cwd(), 'src/lib/recetas/suggester.ts'), 'utf8')

    expect(migrationSql).toContain('ADD COLUMN IF NOT EXISTS is_optional boolean NOT NULL DEFAULT false')
    expect(schema).toContain('is_optional: z.boolean().default(false)')
    expect(recipeRouter).toContain('is_optional')
    expect(mealLogRouter).toContain('is_optional')
    expect(suggester).toContain('requiredIngredients')
  })

  it('keeps AI chat history ephemeral instead of persisted in Supabase', () => {
    const migrations = collectSqlFiles(join(process.cwd(), 'supabase/migrations'))
    const migrationSql = migrations.map((file) => readFileSync(file, 'utf8')).join('\n')
    const productionText = PRODUCTION_FILES
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n')

    expect(productionText).not.toContain('ai_chat_messages')
    expect(migrationSql).toContain('DROP TABLE IF EXISTS public.ai_chat_messages')
  })

  it('scopes protected Moodle manual sync to the authenticated user', () => {
    const router = readFileSync(join(process.cwd(), 'src/server/routers/moodle.ts'), 'utf8')
    const syncService = readFileSync(join(process.cwd(), 'src/lib/moodle/sync.ts'), 'utf8')

    expect(router).toContain('syncMoodleUsers({ userId: ctx.user.id })')
    expect(syncService).toContain('type MoodleSyncOptions')
    expect(syncService).toContain(".eq('user_id', options.userId)")
  })

  it('versions Moodle storage schema and keeps Moodle event sync idempotent', () => {
    const migrations = collectSqlFiles(join(process.cwd(), 'supabase/migrations'))
    const migrationSql = migrations.map((file) => readFileSync(file, 'utf8')).join('\n')
    const syncService = readFileSync(join(process.cwd(), 'src/lib/moodle/sync.ts'), 'utf8')

    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS public.moodle_credentials')
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS public.moodle_events')
    expect(migrationSql).toContain('idx_moodle_events_user_moodle_id_type')
    expect(migrationSql).toContain('CREATE OR REPLACE FUNCTION public.store_moodle_creds')
    expect(migrationSql).toContain('DROP FUNCTION IF EXISTS public.decrypt_moodle_creds(uuid, text)')
    expect(migrationSql).toContain('CREATE OR REPLACE FUNCTION public.decrypt_moodle_creds')
    expect(migrationSql).toContain('CREATE OR REPLACE FUNCTION public.delete_moodle_creds')
    expect(syncService).not.toMatch(/\.from\('moodle_events'\)[\s\S]{0,120}\.insert\(/)
  })

  it('versions every Supabase RPC used by production code', () => {
    const migrations = collectSqlFiles(join(process.cwd(), 'supabase/migrations'))
    const migrationSql = migrations.map((file) => readFileSync(file, 'utf8')).join('\n')
    const rpcNames = new Set<string>()

    for (const file of PRODUCTION_FILES) {
      const content = readFileSync(file, 'utf8')
      for (const match of content.matchAll(/\.rpc\('([^']+)'/g)) {
        rpcNames.add(match[1])
      }
    }

    const missingFunctions = [...rpcNames]
      .sort()
      .filter((rpcName) => {
        const functionPattern = new RegExp(
          `CREATE\\s+OR\\s+REPLACE\\s+FUNCTION\\s+(public\\.)?${rpcName}\\b`,
          'i'
        )

        return !functionPattern.test(migrationSql)
      })

    expect(missingFunctions).toEqual([])
  })

  it('keeps AI undo timing aligned with the 5-second PRD window', () => {
    const undoToast = readFileSync(join(process.cwd(), 'src/components/ui/undo-toast.tsx'), 'utf8')
    const geminiActions = readFileSync(join(process.cwd(), 'src/lib/gemini/actions.ts'), 'utf8')
    const roadmap = readFileSync(join(process.cwd(), 'Roadmap.md'), 'utf8')

    expect(undoToast).toContain('duration = 5000')
    expect(undoToast).not.toContain('7500')
    expect(geminiActions).toContain('const UNDO_TTL_SECONDS = 5')
    expect(geminiActions).not.toContain('UNDO_TTL_SECONDS = 8')
    expect(roadmap).not.toContain('7.5 segundos')
  })

  it('keeps morning briefing copy aligned with Design.md tone', () => {
    const briefingFiles = [
      'src/app/api/cron/morning-briefing/route.ts',
      'src/app/api/cron/telegram-briefing/route.ts',
    ]
    const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
    const violations = briefingFiles.flatMap((file) => {
      const content = readFileSync(join(process.cwd(), file), 'utf8')
      const stringLiterals = content.match(/(['"`])(?:\\.|(?!\1)[^\r\n])*\1/g) ?? []
      const issues = [
        emojiPattern.test(content) ? 'emoji' : null,
        stringLiterals.some((literal) => /[!¡]/.test(literal)) ? 'exclamation' : null,
        /Ã|â|ð|�/.test(content) ? 'mojibake' : null,
      ].filter(Boolean)

      return issues.length > 0 ? [`${file}: ${issues.join(', ')}`] : []
    })

    expect(violations).toEqual([])
  })

  it('keeps production user-facing success copy restrained', () => {
    const forbiddenCopy = [
      '¡Dato registrado exitosamente!',
      '¡Quizás ya terminaste todo!',
    ]
    const violations = PRODUCTION_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      const matches = forbiddenCopy.filter((copy) => content.includes(copy))

      return matches.length > 0 ? [`${relative(process.cwd(), file)}: ${matches.join(', ')}`] : []
    })

    expect(violations).toEqual([])
  })

  it('keeps Campus sync copy user-facing and aligned with deployed cron cadence', () => {
    const campusTab = readFileSync(join(process.cwd(), 'src/components/estudio/campus-tab.tsx'), 'utf8')
    const campusRoute = readFileSync(join(process.cwd(), 'src/app/api/integrations/moodle/route.ts'), 'utf8')
    const vercelConfig = readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')

    expect(vercelConfig).toContain('"schedule": "0 8 * * *"')
    expect(campusTab).not.toContain('Gemini AI')
    expect(campusTab).not.toContain('cada 2h')
    expect(campusTab).not.toContain('Se recorren cada 2h')
    expect(campusRoute).not.toContain('Username and password required')
    expect(campusRoute).not.toContain('Failed to connect to Moodle')
    expect(campusRoute).not.toContain('Credentials stored successfully')
    expect(campusRoute).toContain('Usuario y contraseña requeridos')
    expect(campusRoute).toContain('No se pudo conectar con Moodle')
  })

  it('keeps Telegram user-facing copy properly accented in Spanish', () => {
    const telegramCopyFiles = [
      'src/app/api/cron/telegram-briefing/route.ts',
      'src/app/api/cron/pantry-prediction/route.ts',
      'src/lib/telegram.ts',
    ]
    const forbiddenCopy = [
      'Podes pedirme',
      'tu dia',
      'Tenes ${tasks.length}',
      'No pude completar la accion',
      'Proba de nuevo',
      'informacion clara',
      'mas nitida',
      'monto valido',
      'Prediccion de stock',
      'se agotara',
      'dias. Quedan',
      'Se agrego automaticamente',
      'Ingresa a la app',
      'Intenta de nuevo',
      'Vincula tu cuenta',
    ]

    const violations = telegramCopyFiles.flatMap((file) => {
      const content = readFileSync(join(process.cwd(), file), 'utf8')
      const matches = forbiddenCopy.filter((copy) => content.includes(copy))

      return matches.length > 0 ? [`${file}: ${matches.join(', ')}`] : []
    })

    expect(violations).toEqual([])
  })

  it('keeps known Spanish user-facing copy accented across production source', () => {
    const forbiddenCopy = [
      'Intenta de nuevo',
      'Podes hacer ahora',
      'buenos dias',
      'Tenes ${count}',
      'La accion detectada no tiene un formato valido.',
      '7 dias',
      'no esta disponible',
      'Tu suscripcion',
      'vence en 7 dias',
      'manana',
      'Sin descripcion',
      'OBJETIVO CALORICO',
      'Cada dia',
      'Varia las comidas',
      'ultimas semanas',
      'Inclui una estimacion',
      'JSON valido',
      'operacion offline',
      'Parametros from y to requeridos',
      'Descripcion',
      'Categoria',
      'Sin categoria',
      'Calorias',
      'Estas categorias estan',
      'Nuevo item',
      'Wishlist vacia',
      'Guarda compras posibles',
      'revisa si encajan',
      'Todos los dias',
      'Dias fijos por semana',
      'Cada N dias',
      'Dias habiles',
      'Dias no habiles',
      'Constancia semanal y dias',
      'Ano',
      'Habitos',
      'Nuevo habito',
      'Sin habitos activos.',
      'Habito completado',
      'No se pudo completar el habito',
      'El habito ya estaba sin marcar.',
      'No se pudo desmarcar el habito',
      'Habito archivado',
      'No se pudo archivar el habito',
      'Crear habito',
      'Sin titulo',
      'Nota sin titulo',
      'El titulo',
      'No se pudo cargar la configuracion',
      'No se pudo cargar la integracion',
      'Sincronizacion',
      'academicas',
      'avance academico',
    ]
    const violations = PRODUCTION_FILES.flatMap((file) => {
      const content = readFileSync(file, 'utf8')
      const matches = forbiddenCopy.filter((copy) => content.includes(copy))

      return matches.length > 0 ? [`${relative(process.cwd(), file)}: ${matches.join(', ')}`] : []
    })

    expect(violations).toEqual([])
  })

  it('keeps cron notification copy free of mojibake and decorative emoji', () => {
    const cronFiles = collectFiles(join(process.cwd(), 'src/app/api/cron'))
    const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
    const violations = cronFiles.flatMap((file) => {
      const relativePath = relative(process.cwd(), file)
      const content = readFileSync(file, 'utf8')
      const issues = [
        emojiPattern.test(content) ? 'emoji' : null,
        /Ã|â|ð|ï¿½|Â/.test(content) ? 'mojibake' : null,
      ].filter(Boolean)

      return issues.length > 0 ? [`${relativePath}: ${issues.join(', ')}`] : []
    })

    expect(violations).toEqual([])
  })

  it('keeps cron Telegram notifications on the shared bot client', () => {
    const cronFiles = collectFiles(join(process.cwd(), 'src/app/api/cron'))
    const violations = cronFiles.flatMap((file) => {
      const relativePath = relative(process.cwd(), file)
      const content = readFileSync(file, 'utf8')

      return content.includes('api.telegram.org/bot') ? [relativePath] : []
    })

    expect(violations).toEqual([])
  })

  it('keeps production Telegram notifications on the shared bot client', () => {
    const violations = PRODUCTION_FILES.flatMap((file) => {
      const relativePath = relative(process.cwd(), file)

      const content = readFileSync(file, 'utf8')
      return content.includes('api.telegram.org/bot') ? [relativePath] : []
    })

    expect(violations).toEqual([])
  })

  it('routes production Telegram sendMessage calls through the fallback helper', () => {
    const allowedFallbackHelper = 'src\\lib\\telegram.ts'
    const violations = PRODUCTION_FILES.flatMap((file) => {
      const relativePath = relative(process.cwd(), file)
      if (relativePath === allowedFallbackHelper) return []

      const content = readFileSync(file, 'utf8')
      return content.includes('bot.telegram.sendMessage') ? [relativePath] : []
    })

    expect(violations).toEqual([])
  })

  it('keeps Telegram webhook replies behind safe fallback helpers', () => {
    const telegram = readFileSync(join(process.cwd(), 'src/lib/telegram.ts'), 'utf8')

    expect(telegram).toContain('async function safeTelegramReply')
    expect(telegram).toContain('async function safeTelegramChatAction')
    expect(telegram).toContain('async function safeTelegramEditMessageText')
    expect(telegram).toContain('async function safeTelegramGetFileLink')
    expect(telegram.match(/ctx\.reply\(/g) ?? []).toHaveLength(1)
    expect(telegram.match(/ctx\.sendChatAction\(/g) ?? []).toHaveLength(1)
    expect(telegram.match(/ctx\.telegram\.editMessageText\(/g) ?? []).toHaveLength(1)
    expect(telegram.match(/ctx\.telegram\.getFileLink\(/g) ?? []).toHaveLength(1)
  })

  it('does not use unused auth.users joins in debt reminder cron', () => {
    const route = readFileSync(
      join(process.cwd(), 'src/app/api/cron/debt-reminders/route.ts'),
      'utf8'
    )

    expect(route).not.toContain('auth_users:user_id')
  })

  it('ships dedicated public PWA icon assets referenced by the manifest', async () => {
    const manifest = (await import('../app/manifest')).default()
    const expectedIcons = [
      { src: '/icons/icon-192.png', sizes: '192x192' },
      { src: '/icons/icon-512.png', sizes: '512x512' },
      { src: '/icons/icon-180.png', sizes: '180x180' },
      { src: '/icons/icon-167.png', sizes: '167x167' },
    ]

    expect(manifest.icons).toEqual(
      expect.arrayContaining(
        expectedIcons.map((icon) =>
          expect.objectContaining({
            ...icon,
            type: 'image/png',
          })
        )
      )
    )

    const missingAssets = expectedIcons
      .map((icon) => icon.src.replace(/^\//, ''))
      .filter((assetPath) => !existsSync(join(process.cwd(), 'public', assetPath)))

    expect(missingAssets).toEqual([])

    const invalidDimensions = expectedIcons.flatMap((icon) => {
      const assetPath = join(process.cwd(), 'public', icon.src.replace(/^\//, ''))
      const image = readFileSync(assetPath)
      const [width, height] = icon.sizes.split('x').map(Number)

      return image.readUInt32BE(16) === width && image.readUInt32BE(20) === height
        ? []
        : [`${icon.src}: expected ${icon.sizes}`]
    })

    expect(invalidDimensions).toEqual([])
  })
})
