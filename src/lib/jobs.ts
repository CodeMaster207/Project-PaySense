import { addDays, iso, parseDay, today } from './dates'
import type { EntryView, Frequency, JobView } from './types'

export const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Every month' },
  { value: 'yearly', label: 'Every year' },
]
export const frequencyLabel = (f: Frequency) => FREQUENCIES.find((x) => x.value === f)?.label ?? f

/** n-th payday: monthly and yearly paydays clamp to the month's last day (31st becomes 28th in Feb). */
function nth(start: string, f: Frequency, n: number) {
  if (f === 'daily') return addDays(start, n)
  if (f === 'weekly') return addDays(start, 7 * n)
  if (f === 'biweekly') return addDays(start, 14 * n)
  const s = parseDay(start)
  const months = f === 'monthly' ? n : 12 * n
  const last = new Date(s.getFullYear(), s.getMonth() + months + 1, 0).getDate()
  return iso(new Date(s.getFullYear(), s.getMonth() + months, Math.min(s.getDate(), last)))
}

/** Paydays from the start date until the end date (or one year ahead for indefinite jobs). */
export function paydays(job: JobView, horizon = addDays(today(), 366)) {
  const until = job.endDate && job.endDate < horizon ? job.endDate : horizon
  const out: string[] = []
  for (let n = 0; n < 4000; n++) {
    const d = nth(job.startDate, job.frequency, n)
    if (d > until) break
    out.push(d)
  }
  return out
}

export function nextPayday(job: JobView) {
  const t = today()
  for (let n = 0; n < 4000; n++) {
    const d = nth(job.startDate, job.frequency, n)
    if (job.endDate && d > job.endDate) return null
    if (d >= t) return d
  }
  return null
}

export function jobIncomeEntries(jobs: JobView[]): EntryView[] {
  return jobs.flatMap((j) =>
    paydays(j).map((date) => ({ id: `job-${j.id}-${date}`, date, type: 'income' as const, description: j.name, amount: j.amount, source: 'job' as const, jobId: j.id })),
  )
}
