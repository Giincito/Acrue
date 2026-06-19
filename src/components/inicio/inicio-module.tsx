import Link from 'next/link'
import type { ReactNode } from 'react'
import { ModuleEyebrow } from '@/components/layout/module-header'
import { ModuleShell } from '@/components/layout/module-shell'
import { GmailTaskImporter } from '@/components/inicio/gmail-task-importer'
import { WeatherFlipCard } from '@/components/inicio/weather-flip-card'
import { DegradedNotice } from '@/components/shared/degraded-notice'
import type { DailyBriefing, WeeklySummary } from '@/lib/gemini/briefing'
import { cn } from '@/lib/utils'

const WEEKDAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const PANEL_TITLE_CLASS = 'text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground'

type SignalTone = 'accent' | 'danger' | 'neutral' | 'success'

const SIGNAL_TONE_CLASSES: Record<SignalTone, { bar: string; text: string }> = {
  accent: {
    bar: 'bg-accent',
    text: 'text-accent',
  },
  danger: {
    bar: 'bg-destructive',
    text: 'text-destructive',
  },
  neutral: {
    bar: 'bg-muted-foreground/50',
    text: 'text-muted-foreground',
  },
  success: {
    bar: 'bg-success',
    text: 'text-success',
  },
}

function formatCurrency(amount: number) {
  return `$${Math.round(amount).toLocaleString('es-AR')}`
}

function getMeterWidth(value: number, max: number) {
  if (value <= 0) return 0
  return Math.max(28, Math.min(100, Math.round((value / Math.max(1, max)) * 100)))
}

function MetricLink({
  href,
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  href: string
  label: string
  value: string
  detail: string
  tone?: SignalTone
}) {
  const toneClasses = SIGNAL_TONE_CLASSES[tone]

  return (
    <Link
      href={href}
      className={cn(
        'flex h-full min-h-28 cursor-pointer flex-col justify-between rounded-lg border border-border/70 bg-card p-4 transition-[background-color,border-color,transform] duration-150 ease-out hover:border-border hover:bg-muted/40 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100'
      )}
    >
      <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <span className={cn('mt-3 text-2xl font-light tabular-nums', toneClasses.text)}>{value}</span>
      <span className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</span>
    </Link>
  )
}

function SignalMeter({
  label,
  max,
  tone,
  value,
  valueLabel = String(value),
}: {
  label: string
  max: number
  tone: SignalTone
  value: number
  valueLabel?: string
}) {
  const toneClasses = SIGNAL_TONE_CLASSES[tone]

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn('text-xs font-medium tabular-nums', toneClasses.text)}>{valueLabel}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <span
          className={cn('block h-full rounded-full', toneClasses.bar)}
          style={{ width: `${getMeterWidth(value, max)}%` }}
        />
      </div>
    </div>
  )
}

function Section({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-lg border border-border/70 bg-card p-5', className)}>
      <h2 className={PANEL_TITLE_CLASS}>{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function getBuenosAiresDateParts(value: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value))

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value ?? '1970'),
    month: Number(parts.find((part) => part.type === 'month')?.value ?? '1'),
    day: Number(parts.find((part) => part.type === 'day')?.value ?? '1'),
  }
}

function getMonthMetadata(generatedAt: string) {
  const { year, month, day } = getBuenosAiresDateParts(generatedAt)
  const firstDay = new Date(`${year}-${String(month).padStart(2, '0')}-01T12:00:00-03:00`)
  const firstWeekday = firstDay.getUTCDay() === 0 ? 6 : firstDay.getUTCDay() - 1
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const monthLabel = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(firstDay)

  return { day, daysInMonth, firstWeekday, monthLabel }
}

function getHeatmapIntensity(value: number, max: number, isFuture: boolean) {
  if (isFuture) return 'border-border/50 bg-secondary/40'
  if (value === 0) return 'border-border/70 bg-secondary/80'

  const ratio = value / max
  if (ratio < 0.34) return 'border-accent/40 bg-accent/30'
  if (ratio < 0.67) return 'border-accent/70 bg-accent/60'
  return 'border-accent bg-accent'
}

function HabitHeatmap({ values, generatedAt }: { values: number[]; generatedAt: string }) {
  const { day: today, daysInMonth, firstWeekday, monthLabel } = getMonthMetadata(generatedAt)
  const days = Array.from({ length: daysInMonth }, (_, index) => values[index] ?? 0)
  const max = Math.max(1, ...days)
  const monthlyTotal = days.reduce((sum, value) => sum + value, 0)

  return (
    <div className="h-full">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{monthLabel}</p>
        <p className="text-xs tabular-nums text-muted-foreground">{monthlyTotal} este mes</p>
      </div>
      <div className="mt-3 grid w-full max-w-[16.5rem] grid-cols-7 gap-1" aria-hidden="true">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="text-center text-[10px] font-medium text-muted-foreground">
            {label}
          </span>
        ))}
      </div>
      <div
        role="grid"
        aria-label={`Hábitos completados durante ${monthLabel}`}
        className="mt-2 grid w-full max-w-[16.5rem] grid-cols-7 gap-1"
      >
        {Array.from({ length: firstWeekday }, (_, index) => (
          <span key={`empty-${index}`} aria-hidden="true" className="aspect-square min-h-5 w-full sm:min-h-6" />
        ))}
        {days.map((value, index) => {
          const day = index + 1
          const isToday = day === today
          const isFuture = day > today

          return (
            <span
              key={`${day}-${value}`}
              role="gridcell"
              aria-label={`${day} de ${monthLabel}: ${value} hábitos completados`}
              className={cn(
                'aspect-square min-h-5 w-full rounded-[4px] border transition-colors sm:min-h-6',
                getHeatmapIntensity(value, max, isFuture),
                isToday && 'ring-1 ring-accent ring-offset-1 ring-offset-card'
              )}
            />
          )
        })}
      </div>
    </div>
  )
}

function HeaderDailyQuote({ quote }: { quote: DailyBriefing['quote'] }) {
  return (
    <figure className="mt-4 w-full text-center">
      <blockquote className="text-balance text-base font-light leading-7 text-foreground sm:text-lg sm:leading-8">
        &ldquo;{quote.text}&rdquo;
      </blockquote>
      {quote.author ? (
        <figcaption className="mt-2 text-sm font-medium text-foreground">
          &mdash; {quote.author}
        </figcaption>
      ) : null}
    </figure>
  )
}

function OperationalSummaryPanel({ summary }: { summary: DailyBriefing['operationalSummary'] }) {
  const periodLabel = summary.period === 'morning' ? 'mañana' : 'tarde'

  return (
    <section className="rounded-lg border border-border/70 bg-card px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className={PANEL_TITLE_CLASS}>Briefing diario</h2>
        <span className={cn(PANEL_TITLE_CLASS, 'shrink-0')}>
          IA · {periodLabel}
        </span>
      </div>
      <p className="max-w-[75ch] text-sm leading-7 text-foreground">
        {summary.segments.map((segment, index) => (
          segment.highlight ? (
            <strong key={`${segment.text}-${index}`} className="font-medium text-accent">
              {segment.text}
            </strong>
          ) : (
            <span key={`${segment.text}-${index}`}>{segment.text}</span>
          )
        ))}
      </p>
    </section>
  )
}

function GmailStatusPanel({ digest }: { digest: DailyBriefing['gmailDigest'] }) {
  const taskCount = digest?.extractedTasks.length ?? 0
  const statusTone: SignalTone = !digest || digest.degraded ? 'danger' : taskCount > 0 ? 'accent' : 'success'
  const statusLabel = !digest ? 'Sin vincular' : digest.degraded ? 'Parcial' : 'Revisado'
  const summary = digest?.degraded
    ? 'Gmail no se pudo leer por completo. Si aparece invalid_grant, vinculá Google de nuevo.'
    : digest?.summary ?? 'Conectá Google para sumar el resumen de Gmail al briefing.'
  const toneClasses = SIGNAL_TONE_CLASSES[statusTone]

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-muted/30 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="truncate text-sm font-medium text-foreground">Gmail {statusLabel}</span>
          </div>
          <span className={cn('text-xs font-medium tabular-nums', toneClasses.text)}>
            {taskCount} tareas
          </span>
        </div>
        <div className="mt-3">
          <SignalMeter
            label="Tareas detectadas"
            value={taskCount}
            max={Math.max(1, taskCount)}
            tone={taskCount > 0 ? 'accent' : 'neutral'}
          />
        </div>
      </div>

      <p className="text-sm leading-6 text-foreground">{summary}</p>

      {!digest ? (
        <Link href="/configuracion" className="inline-flex cursor-pointer text-sm font-medium text-accent underline-offset-4 hover:underline">
          Vincular Google
        </Link>
      ) : null}

      {digest?.extractedTasks.length ? (
        <GmailTaskImporter tasks={digest.extractedTasks} />
      ) : null}
    </div>
  )
}

function WeeklySummaryChart({ summary }: { summary: WeeklySummary }) {
  const habitRate = summary.habitsExpected > 0
    ? Math.round((summary.habitsCompleted / summary.habitsExpected) * 100)
    : 0
  const expenseLoad = summary.weeklyExpenses > 0 ? Math.min(100, Math.round(summary.weeklyExpenses / 1000)) : 0

  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2">
      <SignalMeter
        label="XP"
        value={summary.xpEarned}
        max={Math.max(100, summary.xpEarned)}
        tone={summary.xpEarned > 0 ? 'accent' : 'neutral'}
      />
      <SignalMeter
        label="Hábitos"
        value={habitRate}
        max={100}
        tone={habitRate >= 80 ? 'success' : habitRate > 0 ? 'accent' : 'neutral'}
        valueLabel={`${habitRate}%`}
      />
      <SignalMeter
        label="Gastos"
        value={expenseLoad}
        max={100}
        tone={summary.weeklyExpenses > 0 ? 'danger' : 'success'}
        valueLabel={formatCurrency(summary.weeklyExpenses)}
      />
      <SignalMeter
        label="Racha"
        value={summary.longestStreak}
        max={Math.max(7, summary.longestStreak)}
        tone={summary.longestStreak > 0 ? 'success' : 'neutral'}
        valueLabel={`${summary.longestStreak} días`}
      />
    </div>
  )
}

export function InicioModule({
  briefing,
  weeklySummary,
}: {
  briefing: DailyBriefing
  weeklySummary: WeeklySummary
}) {
  return (
    <ModuleShell width="wide">
      <header className="mb-6 pt-8">
        <ModuleEyebrow>Inicio</ModuleEyebrow>
        <h1 className="mt-2 text-2xl font-medium text-foreground">Resumen operativo</h1>
        <HeaderDailyQuote quote={briefing.quote} />
      </header>

      <OperationalSummaryPanel summary={briefing.operationalSummary} />

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-3 sm:auto-rows-fr sm:grid-cols-2">
          <MetricLink
            href="/tareas"
            label="Hoy"
            value={String(briefing.tasksToday.length)}
            detail="tareas con vencimiento o foco inmediato"
            tone={briefing.tasksToday.length > 0 ? 'danger' : 'success'}
          />
          <MetricLink
            href="/finanzas"
            label="Saldo"
            value={formatCurrency(briefing.finance.balance)}
            detail={`${briefing.finance.expenseCount} movimientos este mes`}
            tone={briefing.finance.balance >= 0 ? 'success' : 'danger'}
          />
          <MetricLink
            href="/habitos"
            label="Hábitos"
            value={`${briefing.habits.completedToday}/${briefing.habits.totalActive}`}
            detail="completados hoy"
            tone={
              briefing.habits.totalActive === 0
                ? 'neutral'
                : briefing.habits.completedToday >= briefing.habits.totalActive
                  ? 'success'
                  : 'danger'
            }
          />
          <WeatherFlipCard tandil={briefing.weather} marDelPlata={briefing.marDelPlataWeather} />
        </div>

        <Section title="Ritmo de hábitos" className="min-h-[14rem]">
          <div className="flex flex-col gap-4">
            <HabitHeatmap values={briefing.habits.heatmap} generatedAt={briefing.generatedAt} />
            <p className="text-sm leading-6 text-muted-foreground">
              {briefing.habits.completedToday} de {briefing.habits.totalActive} hábitos completados hoy.
            </p>
          </div>
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Gmail digest">
          <GmailStatusPanel digest={briefing.gmailDigest} />
        </Section>

        <Section title="Resumen semanal">
          <WeeklySummaryChart summary={weeklySummary} />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">XP</dt>
              <dd className="mt-1 font-medium tabular-nums text-foreground">{weeklySummary.xpEarned}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Hábitos</dt>
              <dd className="mt-1 font-medium tabular-nums text-foreground">
                {weeklySummary.habitsCompleted}/{weeklySummary.habitsExpected}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Gastos</dt>
              <dd className="mt-1 font-medium tabular-nums text-foreground">
                {formatCurrency(weeklySummary.weeklyExpenses)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Racha</dt>
              <dd className="mt-1 font-medium tabular-nums text-foreground">
                {weeklySummary.longestStreak} días
              </dd>
            </div>
          </dl>
          {weeklySummary.degradedServices.length > 0 ? (
            <p className="mt-4 rounded-md bg-muted/45 px-3 py-2 text-sm leading-6 text-muted-foreground">
              <span className="font-medium text-foreground">Resumen semanal incompleto.</span>{' '}
              Faltan datos de {weeklySummary.degradedServices.join(', ')}.
            </p>
          ) : null}
        </Section>
      </div>

      {briefing.degradedServices.length > 0 ? (
        <DegradedNotice detail={`Algunos datos pueden estar incompletos: ${briefing.degradedServices.join(', ')}.`} />
      ) : null}
    </ModuleShell>
  )
}
