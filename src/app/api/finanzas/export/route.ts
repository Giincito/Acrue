import { createClient } from '@/utils/supabase/server'
import { convertArsToUsd } from '@/lib/finanzas/dolar'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/server/logger'

interface ExpenseExportRow {
  amount: number | string
  currency: string
  categories?: {
    name?: string | null
  } | null
  date: string
  description: string | null
  source: string | null
}

/**
 * GET /api/finanzas/export?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Exports expenses as CSV.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json({ error: 'Parámetros from y to requeridos' }, { status: 400 })
    }

    const query = supabase
      .from('expenses')
      .select('*, categories(name)')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false })

    const { data: expenses, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const header = 'Fecha,Descripción,Categoría,Monto ARS,Monto USD,Moneda,Fuente'
    const expenseRows = (expenses ?? []) as ExpenseExportRow[]
    const rows = await Promise.all(
      expenseRows.map(async (expense) => {
        const amount = Number(expense.amount)
        const arsAmount = Math.abs(amount)
        const usdAmount = expense.currency === 'ARS' ? await convertArsToUsd(arsAmount) : arsAmount
        const categoryName = expense.categories?.name ?? 'Sin categoría'
        const sign = amount < 0 ? '-' : ''
        const description = (expense.description || 'Sin descripción').replace(/"/g, '""')

        return [
          expense.date,
          `"${description}"`,
          `"${categoryName}"`,
          `${sign}${arsAmount}`,
          usdAmount !== null ? `${sign}${usdAmount}` : 'N/A',
          expense.currency,
          expense.source || 'manual',
        ].join(',')
      })
    )

    const csv = [header, ...rows].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="acrue-gastos-${from}-a-${to}.csv"`,
      },
    })
  } catch (err) {
    logger.error('[api/finanzas/export] Error:', err)
    return NextResponse.json({ error: 'Error al exportar' }, { status: 500 })
  }
}
