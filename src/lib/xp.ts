import { logger } from '@/lib/server/logger'
/**
 * XP (Experience Points) system for gamification.
 * xp_events table is APPEND-ONLY — never UPDATE or DELETE.
 * @module lib/xp
 */

import { SupabaseClient } from '@supabase/supabase-js'

/** Inserts an XP event. Append-only by design. */
export async function addXP(
  supabase: SupabaseClient,
  userId: string,
  sourceType: string,
  sourceId: string | null,
  delta: number,
  description: string
) {
  const { error } = await supabase.from('xp_events').insert({
    user_id: userId,
    source_type: sourceType,
    source_id: sourceId,
    xp_delta: delta,
    description,
  })

  if (error) {
    logger.error('[XP] Failed to add XP event:', error.message)
  }
}

/** Returns total accumulated XP for a user. */
export async function getTotalXP(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data, error } = await supabase.rpc('get_total_xp', {
    p_user_id: userId,
  })

  if (error) {
    // Fallback: manual SUM query
    const { data: events } = await supabase
      .from('xp_events')
      .select('xp_delta')
      .eq('user_id', userId)

    if (!events) return 0
    return events.reduce((sum, e) => sum + (e.xp_delta || 0), 0)
  }

  return data || 0
}

/** XP level thresholds and titles. */
const LEVELS = [
  { min: 0, title: 'Aprendiz' },
  { min: 100, title: 'Constante' },
  { min: 300, title: 'Sistematico' },
  { min: 600, title: 'Dedicado' },
  { min: 1000, title: 'Experto' },
  { min: 2000, title: 'Maestro' },
  { min: 5000, title: 'Leyenda' },
] as const

/** Returns the user's level number and title based on XP total. */
export function getUserLevel(xp: number): { level: number; title: string } {
  let level = 1
  let title: string = LEVELS[0].title

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].min) {
      level = i + 1
      title = LEVELS[i].title
      break
    }
  }

  return { level, title }
}

export function getLevelProgress(xp: number) {
  const { level, title } = getUserLevel(xp)
  const currentLevel = LEVELS[level - 1]
  const nextLevel = LEVELS[level] ?? currentLevel
  const xpIntoLevel = Math.max(0, xp - currentLevel.min)
  const xpForNextLevel = Math.max(0, nextLevel.min - currentLevel.min)
  const progress = xpForNextLevel > 0
    ? Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100))
    : 100

  return {
    totalXP: xp,
    level,
    title,
    currentLevelMin: currentLevel.min,
    nextLevelMin: nextLevel.min,
    xpIntoLevel,
    xpForNextLevel,
    progress,
  }
}

export async function recalibrateXP(
  supabase: SupabaseClient,
  userId: string,
  targetXP: number,
  description = 'Recalibracion de XP'
): Promise<{ previousXP: number; targetXP: number; delta: number }> {
  const previousXP = await getTotalXP(supabase, userId)
  const delta = Math.round(targetXP - previousXP)

  if (delta !== 0) {
    await addXP(supabase, userId, 'recalibration', null, delta, description)
  }

  return {
    previousXP,
    targetXP,
    delta,
  }
}
