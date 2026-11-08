import { getAppUser } from '@/lib/app-auth'
import { loadEntries, loadGoals, loadJobs, loadSubscriptions } from '@/lib/data'
import { jobIncomeEntries } from '@/lib/jobs'
import { plannedEntries } from '@/lib/ledger'
import { today } from '@/lib/dates'
import { accountCurrency, paypalConfigured } from '@/lib/paypal'
import { PayPalClient } from '@/components/PayPalClient'

export default async function PayPalPage() {
  const user = (await getAppUser())!
  const [entries, subs, goals, jobs] = await Promise.all([loadEntries(user), loadSubscriptions(user), loadGoals(user), loadJobs(user)])
  const t = today()
  const goalFunds = plannedEntries(goals, [...entries, ...jobIncomeEntries(jobs)]).filter((e) => e.date <= t && e.amount > 0)
  return (
    <PayPalClient
      connected={user.paypalStatus === 'connected'}
      lastSync={user.paypalLastSync ?? null}
      mode={paypalConfigured() ? 'sandbox' : 'unconfigured'}
      accountCurrency={paypalConfigured() ? await accountCurrency() : null}
      entries={entries}
      subs={subs}
      goalFunds={goalFunds}
    />
  )
}
