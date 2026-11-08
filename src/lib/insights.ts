import { addDays } from './dates'
import type { EntryView } from './types'

export type ClientShare = { name: string; amount: number; share: number }

/** Income grouped by who paid it, over the last `days` days up to `until`. A client is the payer when PayPal gives one, otherwise the description. */
export function incomeByClient(entries: EntryView[], until: string, days = 90): { total: number; clients: ClientShare[] } {
  const since = addDays(until, -days)
  const groups = new Map<string, { name: string; amount: number }>()
  let total = 0
  for (const e of entries) {
    if (e.type !== 'income' || e.source === 'goal' || e.date < since || e.date > until) continue
    const name = (e.counterparty || e.description).trim()
    if (!name) continue
    const key = name.toLowerCase()
    const g = groups.get(key) ?? { name, amount: 0 }
    g.amount += e.amount
    groups.set(key, g)
    total += e.amount
  }
  const clients = [...groups.values()]
    .sort((a, b) => b.amount - a.amount)
    .map((g) => ({ name: g.name, amount: Math.round(g.amount * 100) / 100, share: total > 0 ? g.amount / total : 0 }))
  return { total: Math.round(total * 100) / 100, clients }
}

/** PayPal fees paid and what is left of your income after them, over the last `days` days. */
export function feeSummary(entries: EntryView[], until: string, days = 90) {
  const since = addDays(until, -days)
  let fees = 0
  let paypalIncome = 0
  let income = 0
  for (const e of entries) {
    if (e.type !== 'income' || e.source === 'goal' || e.date < since || e.date > until) continue
    income += e.amount
    if (e.source === 'paypal') {
      paypalIncome += e.amount
      fees += e.fee ?? 0
    }
  }
  const round = (n: number) => Math.round(n * 100) / 100
  return { fees: round(fees), paypalIncome: round(paypalIncome), net: round(income - fees), rate: paypalIncome > 0 ? fees / paypalIncome : 0 }
}
