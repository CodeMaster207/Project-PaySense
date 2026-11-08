import { addDays, daysBetween, today } from './dates'
import { isSkipped } from './plan'
import type { EntryView, GoalView } from './types'

export type CatchUp = { defaulted: number; extra: number; remainingDays: number }

const fundingDates = (g: GoalView) =>
  Array.from({ length: Math.max(0, daysBetween(g.startDate, g.targetDate)) + 1 }, (_, i) => addDays(g.startDate, i)).filter((d) => !isSkipped(d, g))

/**
 * Goal funding follows income. Each day up to today, the money left after recorded expenses is shared
 * between the goals funded that day in proportion to their daily amounts. Whatever is not covered is
 * "defaulted", and each goal then raises its remaining daily funding to make the shortfall up
 * (funding only ever increases).
 */
export function goalCatchUp(goals: GoalView[], recorded: EntryView[], until = today()) {
  const net = new Map<string, number>()
  for (const e of recorded) {
    if (e.date > until || e.source === 'goal') continue
    net.set(e.date, (net.get(e.date) ?? 0) + (e.type === 'income' ? e.amount : -e.amount))
  }
  const dates = goals.map(fundingDates)
  const defaultedByDay = new Map<string, number>() // `${goalId}|${date}` -> amount not covered
  const defaulted = new Map<string, number>()
  const all = [...new Set(dates.flat())].filter((d) => d <= until).sort()
  for (const d of all) {
    const active = goals.filter((_, i) => dates[i].includes(d))
    const due = active.reduce((a, g) => a + g.dailyAmount, 0)
    const shortfall = Math.max(0, due - Math.max(0, net.get(d) ?? 0))
    if (shortfall <= 0) continue
    for (const g of active) {
      const amt = shortfall * (g.dailyAmount / due) // proportional share of the shortfall
      defaultedByDay.set(`${g.id}|${d}`, amt)
      defaulted.set(g.id, (defaulted.get(g.id) ?? 0) + amt)
    }
  }
  const byGoal = new Map<string, CatchUp>()
  goals.forEach((g, i) => {
    const remainingDays = dates[i].filter((d) => d > until).length
    const lost = defaulted.get(g.id) ?? 0
    const extra = remainingDays > 0 && lost > 0 ? Math.ceil((lost / remainingDays) * 100) / 100 : 0
    byGoal.set(g.id, { defaulted: Math.round(lost * 100) / 100, extra, remainingDays })
  })
  return { byGoal, defaultedByDay }
}

/** Planned daily funding from each active goal, shown as its own section on every funded day. */
export function plannedEntries(goals: GoalView[], recorded: EntryView[] = []): EntryView[] {
  const { byGoal, defaultedByDay } = goalCatchUp(goals, recorded)
  const t = today()
  return goals.flatMap((g) => {
    const c = byGoal.get(g.id)
    return fundingDates(g).map((date) => {
      const missed = defaultedByDay.get(`${g.id}|${date}`)
      const extra = date > t ? c?.extra ?? 0 : 0
      return {
        id: `goal-${g.id}-${date}`,
        date,
        type: 'expense' as const,
        description: `Goal: ${g.title}`,
        // Up to today only the covered part is actually funded; later days carry any catch-up.
        amount: Math.round((g.dailyAmount + extra - (missed ?? 0)) * 100) / 100,
        source: 'goal' as const,
        goalId: g.id,
        ...(missed ? { defaulted: Math.round(missed * 100) / 100 } : {}),
        ...(extra ? { extra } : {}),
      }
    })
  })
}

/** Days up to and including today where recorded expenses exceed incomes (goal funding is planned, so it is not counted). */
export function deficitDays(entries: EntryView[], until: string): Set<string> {
  const net = new Map<string, number>()
  for (const e of entries) {
    if (e.date > until || e.source === 'goal') continue
    net.set(e.date, (net.get(e.date) ?? 0) + (e.type === 'income' ? e.amount : -e.amount))
  }
  return new Set([...net].filter(([, v]) => v < 0).map(([d]) => d))
}
