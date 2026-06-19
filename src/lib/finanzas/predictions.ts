/**
 * Predictive saldo analysis for the finance dashboard.
 * Uses historical spending patterns to estimate end-of-month balance.
 * @module lib/finanzas/predictions
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { MonthPrediction } from '@/types/finance'

/**
 * Predicts the end-of-month balance based on current spending patterns.
 *
 * Algorithm:
 * 1. Get total income and expenses for current month so far
 * 2. Calculate daily average spending from the days elapsed
 * 3. Project remaining spending for the rest of the month
 * 4. Return: current_balance - (daily_avg × days_remaining)
 */
export async function predictMonthEnd(
  userId: string,
  supabase: SupabaseClient
): Promise<MonthPrediction> {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed
  const dayOfMonth = now.getDate()

  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const daysRemaining = lastDay - dayOfMonth

  // Fetch all this month's transactions
  const endDate = month === 11
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 2).padStart(2, '0')}-01`

  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, date')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('date', startDate)
    .lt('date', endDate)

  const rows = expenses ?? []

  // Separate income (positive) from expenses (negative)
  const totalIncome = rows
    .filter(e => e.amount > 0)
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const totalExpenses = rows
    .filter(e => e.amount < 0)
    .reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0)

  const currentBalance = totalIncome - totalExpenses

  // Calculate daily average spending based on days elapsed
  const daysElapsed = Math.max(dayOfMonth, 1)
  const dailyAverage = totalExpenses / daysElapsed

  // Project to end of month
  const projectedRemainingSpend = dailyAverage * daysRemaining
  const predictedBalance = currentBalance - projectedRemainingSpend

  return {
    predictedBalance: Math.round(predictedBalance * 100) / 100,
    dailyAverage: Math.round(dailyAverage * 100) / 100,
    daysRemaining,
    isNegative: predictedBalance < 0,
    currentBalance: Math.round(currentBalance * 100) / 100,
  }
}
