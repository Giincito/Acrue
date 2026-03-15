import { RRule, Frequency } from 'rrule'

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'custom'

// Helper to generate a simple RRULE string based on type
export function generateRRule(type: RecurrenceType, interval: number = 1): string {
  let freq = Frequency.DAILY

  switch (type) {
    case 'weekly':
      freq = Frequency.WEEKLY
      break
    case 'monthly':
      freq = Frequency.MONTHLY
      break
    case 'daily':
    default:
      freq = Frequency.DAILY
      break
  }

  const rule = new RRule({
    freq,
    interval,
  })

  return rule.toString()
}

// Very basic rule to text parser
export function rruleToText(rruleString: string | null): string {
  if (!rruleString) return ''

  try {
    const rule = RRule.fromString(rruleString)
    return rule.toText() 
  } catch (e) {
    return 'Regla repetitiva'
  }
}
