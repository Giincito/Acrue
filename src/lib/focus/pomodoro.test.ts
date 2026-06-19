import { describe, expect, it } from 'vitest'
import {
  buildFocusSettings,
  FOCUS_FREE_SESSION_ID,
  formatFocusTime,
  getFocusProgress,
  getFocusSuggestion,
  getFocusTaskSelectLabel,
  normalizeSpotifyPlaylistUrl,
} from './pomodoro'

describe('focus pomodoro utilities', () => {
  it('uses the classic 25/5 intervals for pomodoro mode', () => {
    expect(buildFocusSettings({ mode: 'pomodoro' })).toMatchObject({
      mode: 'pomodoro',
      workMinutes: 25,
      breakMinutes: 5,
      workSeconds: 1500,
      breakSeconds: 300,
    })
  })

  it('clamps custom intervals into a useful study range', () => {
    expect(buildFocusSettings({ mode: 'custom', workMinutes: 0, breakMinutes: 90 })).toMatchObject({
      workMinutes: 1,
      breakMinutes: 60,
      workSeconds: 60,
      breakSeconds: 3600,
    })
  })

  it('formats timer seconds as stable tabular text', () => {
    expect(formatFocusTime(1500)).toBe('25:00')
    expect(formatFocusTime(9)).toBe('00:09')
  })

  it('shows readable task labels instead of task IDs or sentinel values', () => {
    const tasks = [
      { id: '8e510d08-8e19-4f0e-804d-31104093f5ca', title: 'Leer capítulo de redes' },
    ]

    expect(getFocusTaskSelectLabel(tasks, tasks[0].id)).toBe('Leer capítulo de redes')
    expect(getFocusTaskSelectLabel(tasks, FOCUS_FREE_SESSION_ID)).toBe('Sesión libre')
    expect(getFocusTaskSelectLabel(tasks, 'sin-tarea')).toBe('Sesión libre')
  })

  it('keeps progress bounded between 0 and 100', () => {
    expect(getFocusProgress({ totalSeconds: 1500, remainingSeconds: 750 })).toBe(50)
    expect(getFocusProgress({ totalSeconds: 1500, remainingSeconds: -30 })).toBe(100)
  })

  it('normalizes Spotify playlist URLs to the embed URL', () => {
    expect(normalizeSpotifyPlaylistUrl('https://open.spotify.com/playlist/37i9dQZF1DX8NTLI2TtZa6?si=abc')).toEqual({
      playlistId: '37i9dQZF1DX8NTLI2TtZa6',
      embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX8NTLI2TtZa6',
    })
    expect(normalizeSpotifyPlaylistUrl('spotify:playlist:37i9dQZF1DX8NTLI2TtZa6')?.embedUrl).toBe(
      'https://open.spotify.com/embed/playlist/37i9dQZF1DX8NTLI2TtZa6'
    )
  })

  it('suggests focus when urgent tasks overlap with a good study window', () => {
    const suggestion = getFocusSuggestion({
      now: new Date('2026-06-17T10:30:00-03:00'),
      completedFocusSessionsToday: 0,
      tasks: [
        { title: 'Parcial de redes', priority: 1, due_at: '2026-06-17T18:00:00-03:00' },
        { title: 'TP de sistemas', priority: 1, due_at: '2026-06-18T12:00:00-03:00' },
      ],
    })

    expect(suggestion).toEqual({
      shouldSuggest: true,
      urgentCount: 2,
      suggestedMinutes: 25,
      reason: 'Tenes 2 tareas urgentes y esta es una buena ventana para estudiar.',
    })
  })
})
