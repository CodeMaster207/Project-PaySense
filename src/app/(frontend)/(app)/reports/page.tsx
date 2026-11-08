import { getAppUser } from '@/lib/app-auth'
import { loadEntries, loadSubscriptions } from '@/lib/data'
import { today } from '@/lib/dates'
import { buildMonthReport, shiftMonth } from '@/lib/report'
import { ReportClient } from '@/components/ReportClient'

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams
  const user = (await getAppUser())!
  const current = today().slice(0, 7)
  // Anything that is not a real month, or is in the future, falls back to the current month.
  const month = m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) && m <= current ? m : current
  const [entries, subs] = await Promise.all([loadEntries(user), loadSubscriptions(user)])
  return (
    <ReportClient
      key={month}
      report={buildMonthReport(entries, subs, month, today())}
      prevHref={`/reports?m=${shiftMonth(month, -1)}`}
      nextHref={month < current ? `/reports?m=${shiftMonth(month, 1)}` : null}
    />
  )
}
