import 'server-only'
import type { getAppUser } from './app-auth'
import { loadEntries, loadGoals, loadJobs, loadPaymentRequests, loadSubscriptions } from './data'
import { addDays, today } from './dates'
import { buildForecast, type Forecast, type ForecastEvent } from './forecast'
import { jobIncomeEntries } from './jobs'
import { plannedEntries } from './ledger'

type AppUser = NonNullable<Awaited<ReturnType<typeof getAppUser>>>

/** Collects what is known about the next `days` days from the user's own records, then projects the balance. */
export async function loadForecast(user: AppUser, days = 60): Promise<Forecast> {
  const [manual, subs, jobs, goals, requests] = await Promise.all([loadEntries(user), loadSubscriptions(user), loadJobs(user), loadGoals(user), loadPaymentRequests(user)])
  const t = today()
  const horizon = addDays(t, days)
  const jobIncomes = jobIncomeEntries(jobs)
  const planned = plannedEntries(goals, [...manual, ...jobIncomes])
  const all = [...manual, ...jobIncomes, ...planned]

  // Where the balance stands today: everything recorded up to now, the same way the rest of the app counts it.
  const start = all.filter((e) => e.date <= t).reduce((a, e) => a + (e.type === 'income' ? e.amount : -e.amount), 0)

  // Typical spending: the daily average of ordinary expenses over the last 60 days. Goal funding and subscriptions are
  // projected separately, so they are not counted twice.
  const since = addDays(t, -60)
  const spent = manual.filter((e) => e.type === 'expense' && e.date > since && e.date <= t).reduce((a, e) => a + e.amount, 0)
  const dailySpend = spent / 60

  const events: ForecastEvent[] = []
  for (const e of jobIncomes) if (e.date > t && e.date <= horizon) events.push({ date: e.date, label: `${e.description} pay`, amount: e.amount, kind: 'job' })
  for (const e of planned) if (e.source === 'goal' && e.date > t && e.date <= horizon) events.push({ date: e.date, label: e.description.startsWith('Goal') ? e.description : `Goal: ${e.description}`, amount: -e.amount, kind: 'goal' })
  for (const e of manual) {
    if (e.date > t && e.date <= horizon) events.push({ date: e.date, label: e.description, amount: e.type === 'income' ? e.amount : -e.amount, kind: 'scheduled' })
  }
  for (const s of subs) {
    if (s.status !== 'active' || !s.renewDate) continue
    // Subscriptions renew about every 30 days. Roll the stored date forward to the next renewal, then repeat.
    let d = s.renewDate
    for (let i = 0; i < 500 && d <= t; i++) d = addDays(d, 30)
    for (let i = 0; i < 20 && d <= horizon; i++, d = addDays(d, 30)) events.push({ date: d, label: `${s.name} renews`, amount: -s.amount, kind: 'subscription' })
  }
  // A pending invoice is expected on its due date, or tomorrow if that date has already passed.
  const tomorrow = addDays(t, 1)
  for (const r of requests) {
    if (r.status !== 'sent') continue
    events.push({ date: r.dueDate && r.dueDate > tomorrow ? r.dueDate : tomorrow, label: `Invoice: ${r.description}`, amount: r.amount, kind: 'invoice' })
  }

  return buildForecast({ today: t, days, start, dailySpend, events })
}
