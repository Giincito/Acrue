import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { callGemini } from '@/lib/gemini/client'
import { logger } from '@/lib/server/logger'

interface RecentMeal {
  description: string | null
  recipes?: {
    name?: string | null
  } | null
}

interface UserSettings {
  daily_calorie_target?: number
}

/**
 * POST /api/recetas/meal-plan
 * Generates a 7-day meal plan using Gemini based on pantry, recent meals,
 * and the user's daily calorie target.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: pantryItems } = await supabase
      .from('pantry_items')
      .select('name, quantity, unit')
      .eq('user_id', user.id)
      .gt('quantity', 0)

    const pantryList = (pantryItems ?? [])
      .map((item) => `${item.name}: ${item.quantity} ${item.unit}`)
      .join(', ')

    const today = new Date().toISOString().split('T')[0]
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: recentMeals } = await supabase
      .from('meal_log')
      .select('description, meal_type, recipes(name)')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .gte('logged_at', `${twoWeeksAgo}T00:00:00`)
      .limit(30)

    const recentMealRows = (recentMeals ?? []) as RecentMeal[]
    const recentMealsList = recentMealRows
      .map((meal) => meal.recipes?.name ?? meal.description ?? 'Sin descripción')
      .join(', ')

    const { data: userData } = await supabase
      .from('users')
      .select('settings')
      .eq('id', user.id)
      .single()

    const settings = userData?.settings as UserSettings | null
    const dailyCalorieTarget = settings?.daily_calorie_target ?? 2000

    const prompt = `Generá un plan de comidas para 7 días, empezando desde ${today}.

INVENTARIO ACTUAL: ${pantryList || 'Sin datos de inventario'}

COMIDAS RECIENTES (para variar): ${recentMealsList || 'Sin historial'}

OBJETIVO CALÓRICO DIARIO: ${dailyCalorieTarget} kcal

REGLAS:
- Cada día tiene 3 comidas: desayuno, almuerzo, cena.
- Prioriza usar ingredientes del inventario.
- Variá las comidas y no repitas lo de las últimas semanas.
- Incluí una estimación de calorías por comida.
- Respondé SOLO con JSON válido, sin texto adicional ni backticks.

FORMATO DE RESPUESTA:
[
  {
    "date": "YYYY-MM-DD",
    "dayName": "lunes",
    "meals": [
      { "type": "desayuno", "name": "Tostadas con mermelada", "calories": 300 },
      { "type": "almuerzo", "name": "Pasta con verduras", "calories": 550 },
      { "type": "cena", "name": "Ensalada de pollo", "calories": 400 }
    ]
  }
]`

    const { text, error } = await callGemini(prompt, {
      systemInstruction: 'Sos un nutricionista digital. Generás planes de comida balanceados. Respondé SOLO con JSON.',
      temperature: 0.7,
      maxOutputTokens: 2048,
    })

    if (!text || error) {
      return NextResponse.json(
        { error: 'No se pudo generar el plan. La IA no está disponible.' },
        { status: 503 }
      )
    }

    const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
    const plan = JSON.parse(cleaned)

    return NextResponse.json({ plan })
  } catch (err: unknown) {
    logger.error('[meal-plan] Error:', err)
    return NextResponse.json(
      { error: 'Error interno al generar el plan semanal' },
      { status: 500 }
    )
  }
}
