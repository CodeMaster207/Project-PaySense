export type ForecastEvent = {
  date: string
  label: string
  /** Signed: money in is positive, money out is negative. RM. */
  amount: number
  kind: 'job' | 'invoice' | 'subscription' | 'goal' | 'scheduled'
}
export type ForecastPoint = { date: string; balance: number }
export type Scenario = {
  series: ForecastPoint[]
  lowest: ForecastPoint
  /** First day the balance is below zero, or null if it never is. */
  firstNegative: string | null
  at30: number
  end: number
}
export type Forecast = {
  today: string
  days: number
  start: number
  /** Typical day-to-day spending, an average of recent days. RM per day. */
  dailySpend: number
  withInvoices: Scenario
  withoutInvoices: Scenario
  events: ForecastEvent[]
}

const r2 = (n: number) => Math.round(n * 100) / 100

function plus(day: string, n: number) {
  const [y, m, d] = day.split('-').map(Number)
  const t = new Date(y, m - 1, d + n)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

function run(today: string, days: number, start: number, dailySpend: number, events: ForecastEvent[]): Scenario {
  const byDay = new Map<string, number>()
  for (const e of events) byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.amount)
  const series: ForecastPoint[] = [{ date: today, balance: r2(start) }]
  let balance = start
  for (let i = 1; i <= days; i++) {
    const date = plus(today, i)
    balance += (byDay.get(date) ?? 0) - dailySpend
    series.push({ date, balance: r2(balance) })
  }
  const lowest = series.reduce((a, p) => (p.balance < a.balance ? p : a), series[0])
  return { series, lowest, firstNegative: series.find((p) => p.balance < 0)?.date ?? null, at30: series[Math.min(30, days)].balance, end: series[days].balance }
}

/**
 * Projects the balance day by day. Known events (paydays, subscriptions, goal funding, pending invoices on their due
 * date) are applied on their dates, and typical day-to-day spending comes off every day. No new income is assumed
 * beyond jobs and pending invoices, so the result leans cautious. A second run leaves the invoices out, to show how
 * much the forecast depends on being paid.
 */
export function buildForecast(input: { today: string; days: number; start: number; dailySpend: number; events: ForecastEvent[] }): Forecast {
  const horizon = plus(input.today, input.days)
  const events = input.events.filter((e) => e.date > input.today && e.date <= horizon).sort((a, b) => a.date.localeCompare(b.date))
  return {
    today: input.today,
    days: input.days,
    start: r2(input.start),
    dailySpend: r2(input.dailySpend),
    withInvoices: run(input.today, input.days, input.start, input.dailySpend, events),
    withoutInvoices: run(input.today, input.days, input.start, input.dailySpend, events.filter((e) => e.kind !== 'invoice')),
    events,
  }
}
