/** Finance module type definitions */

export interface Category {
  id: string
  user_id: string
  name: string
  icon: string | null
  is_default: boolean
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  amount: number
  currency: string
  category_id: string | null
  description: string | null
  date: string
  source: string | null
  deleted_at: string | null
  created_at: string
  /** Joined category data */
  categories?: Category | null
}

export interface Subscription {
  id: string
  user_id: string
  name: string
  amount: number
  currency: string
  renewal_date: string
  active: boolean
  created_at: string
}

export interface SavingGoal {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  created_at: string
}

/** Dollar blue rate from dolarapi.com */
export interface DollarRate {
  compra: number
  venta: number
  fecha: string
  /** ISO timestamp of when this rate was fetched/cached */
  timestamp: string
  /** Whether this data came from Redis cache */
  fromCache: boolean
}

/** Monthly summary for the finance dashboard */
export interface MonthSummary {
  totalIncome: number
  totalExpenses: number
  balance: number
  expenseCount: number
}

/** Category spending summary */
export interface CategorySummary {
  categoryId: string | null
  categoryName: string
  categoryIcon: string | null
  total: number
  count: number
  /** Percentage of total spending this category represents */
  percentage: number
}

/** Month-end prediction result */
export interface MonthPrediction {
  predictedBalance: number
  dailyAverage: number
  daysRemaining: number
  isNegative: boolean
  currentBalance: number
}

/** Expense filter parameters */
export interface ExpenseFilters {
  categoryId?: string
  dateFrom?: string
  dateTo?: string
  datePreset?: 'this_week' | 'this_month' | 'custom'
  amountMin?: number
  amountMax?: number
}
