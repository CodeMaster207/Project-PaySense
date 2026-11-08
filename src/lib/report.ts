import type { EntryView, SubscriptionView } from './types'

export type ReportRow = { date: string; type: 'income' | 'expense'; description: string; client: string; amount: number; fee: number; source: string }
export type Share = { name: string; amount: number; share: number }

export type MonthReport = {
  month: string
  revenue: number
  fees: number
  netRevenue: number
  expenses: number
  /** Active subscriptions counted once for the current month only. An estimate, since the cycle date is not stored. */
  subscriptions: number
  netProfit: number
  prev: { month: string; revenue: number; netProfit: number } | null
  clients: Share[]
  expenseItems: Share[]
  rows: ReportRow[]
}

const r2 = (n: number) => Math.round(n * 100) / 100

/** The month before or after `month` ("YYYY-MM"). */
export function shiftMonth(month: string, by: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + by, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function group(rows: ReportRow[], key: (r: ReportRow) => string): Share[] {
  const map = new Map<string, { name: string; amount: number }>()
  let total = 0
  for (const r of rows) {
    const name = key(r).trim()
    if (!name) continue
    const g = map.get(name.toLowerCase()) ?? { name, amount: 0 }
    g.amount += r.amount
    map.set(name.toLowerCase(), g)
    total += r.amount
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount).map((g) => ({ name: g.name, amount: r2(g.amount), share: total > 0 ? g.amount / total : 0 }))
}

function totals(entries: EntryView[], month: string, todayKey: string) {
  const rows: ReportRow[] = entries
    .filter((e) => e.source !== 'goal' && e.date.startsWith(month) && e.date <= todayKey)
    .map((e) => ({ date: e.date, type: e.type, description: e.description, client: e.counterparty ?? '', amount: e.amount, fee: e.fee ?? 0, source: e.source }))
    .sort((a, b) => a.date.localeCompare(b.date))
  const revenue = r2(rows.filter((r) => r.type === 'income').reduce((a, r) => a + r.amount, 0))
  const fees = r2(rows.reduce((a, r) => a + r.fee, 0))
  const expenses = r2(rows.filter((r) => r.type === 'expense').reduce((a, r) => a + r.amount, 0))
  return { rows, revenue, fees, expenses }
}

/** Profit and loss for one month. Goal funding is savings, not an expense, so it is left out. */
export function buildMonthReport(entries: EntryView[], subs: SubscriptionView[], month: string, todayKey: string): MonthReport {
  const t = totals(entries, month, todayKey)
  const subscriptions = month === todayKey.slice(0, 7) ? r2(subs.filter((s) => s.status === 'active').reduce((a, s) => a + s.amount, 0)) : 0
  const netRevenue = r2(t.revenue - t.fees)
  const netProfit = r2(netRevenue - t.expenses - subscriptions)

  const before = shiftMonth(month, -1)
  const p = totals(entries, before, todayKey)
  const prev = p.rows.length ? { month: before, revenue: p.revenue, netProfit: r2(p.revenue - p.fees - p.expenses) } : null

  return {
    month,
    revenue: t.revenue,
    fees: t.fees,
    netRevenue,
    expenses: t.expenses,
    subscriptions,
    netProfit,
    prev,
    clients: group(t.rows.filter((r) => r.type === 'income'), (r) => r.client || r.description).slice(0, 5),
    expenseItems: group(t.rows.filter((r) => r.type === 'expense'), (r) => r.description).slice(0, 6),
    rows: t.rows,
  }
}

export const toCsv = (report: MonthReport) => {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const head = ['Date', 'Type', 'Description', 'Client', 'Amount (RM)', 'PayPal fee (RM)', 'Source']
  const lines = report.rows.map((r) => [r.date, r.type, r.description, r.client, r.amount.toFixed(2), r.fee.toFixed(2), r.source].map(esc).join(','))
  return [head.map(esc).join(','), ...lines].join('\r\n')
}
