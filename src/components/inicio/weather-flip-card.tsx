'use client'

import { useState } from 'react'
import type { BriefingWeather } from '@/lib/gemini/briefing'
import { cn } from '@/lib/utils'

function formatWeather(weather: BriefingWeather) {
  return weather.temperature === null
    ? weather.description
    : `${weather.temperature}°, ${weather.description}`
}

function WeatherFace({
  city,
  detail,
  weather,
  className,
}: {
  city: string
  detail: string
  weather: BriefingWeather
  className?: string
}) {
  return (
    <span
      className={cn(
        'absolute inset-0 flex h-full flex-col justify-between p-4 text-left [backface-visibility:hidden]',
        className
      )}
    >
      <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{city}</span>
      <span className="mt-3 text-2xl font-light tabular-nums text-foreground">{formatWeather(weather)}</span>
      <span className="mt-1 text-sm leading-5 text-muted-foreground">{detail}</span>
    </span>
  )
}

export function WeatherFlipCard({
  tandil,
  marDelPlata,
}: {
  tandil: BriefingWeather
  marDelPlata: BriefingWeather
}) {
  const [showMarDelPlata, setShowMarDelPlata] = useState(false)
  const nextCity = showMarDelPlata ? 'Tandil' : 'Mar del Plata'

  return (
    <button
      type="button"
      aria-label={`Mostrar clima de ${nextCity}`}
      aria-pressed={showMarDelPlata}
      className="flex h-full min-h-28 w-full cursor-pointer overflow-hidden rounded-lg border border-border/70 bg-card text-left outline-none transition-[background-color,border-color,transform] duration-150 ease-out [perspective:900px] hover:border-border hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
      onClick={() => setShowMarDelPlata((current) => !current)}
    >
      <span
        className={cn(
          'relative block h-full min-h-28 w-full transition-transform duration-200 ease-out [transform-style:preserve-3d] motion-reduce:transition-none',
          showMarDelPlata && '[transform:rotateY(180deg)]'
        )}
      >
        <WeatherFace city="Tandil" weather={tandil} detail="clima para planificar el día" />
        <WeatherFace
          city="Mar del Plata"
          weather={marDelPlata}
          detail="segunda ciudad guardada"
          className="[transform:rotateY(180deg)]"
        />
      </span>
    </button>
  )
}
