import { daysBetween, parseDay } from './dates'

export type Skips = { skipWeekdays: number[]; excludedDays: string[]; restoredDays?: string[] }

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Fixed-date Malaysian public holidays (movable ones such as Hari Raya or Chinese New Year are not included). */
export const FIXED_HOLIDAYS: { md: string; name: string }[] = [
  { md: '01-01', name: "New Year's Day" },
  { md: '05-01', name: 'Labour Day' },
  { md: '08-31', name: 'Merdeka Day' },
  { md: '09-16', name: 'Malaysia Day' },
  { md: '12-25', name: 'Christmas Day' },
]

/** A restored day is an exception to a skipped weekday; an explicitly excluded day always wins. */
export const isSkipped = (day: string, s: Skips) =>
  s.excludedDays.includes(day) || (s.skipWeekdays.includes(parseDay(day).getDay()) && !s.restoredDays?.includes(day))

/** Days (inclusive) in the plan on which money is set aside. */
export function fundingDays(start: string, target: string, s: Skips) {
  const total = Math.max(0, daysBetween(start, target)) + 1
  let n = 0
  for (let i = 0; i < total; i++) {
    const d = parseDay(start)
    d.setDate(d.getDate() + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (!isSkipped(key, s)) n++
  }
  return n
}

export const dailyFor = (amount: number, days: number) => (days > 0 ? Math.ceil(amount / days) : 0)
