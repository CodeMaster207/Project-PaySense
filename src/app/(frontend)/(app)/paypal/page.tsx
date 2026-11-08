import { getAppUser } from '@/lib/app-auth'
import { loadEntries, loadGoals, loadJobs, loadSubscriptions } from '@/lib/data'
import { jobIncomeEntries } from '@/lib/jobs'
import { plannedEntries } from '@/lib/ledger'
import { today } from '@/lib/dates'
import { accountInfo, paypalConfigured } from '@/lib/paypal'
import { PayPalClient } from '@/components/PayPalClient'

export default async function PayPalPage() {
  const user = (await getAppUser())!
  const [entries, subs, goals, jobs] = await Promise.all([loadEntries(user), loadSubscriptions(user), loadGoals(user), loadJobs(user)])
  const t = today()
  const goalFunds = plannedEntries(goals, [...entries, ...jobIncomeEntries(jobs)]).filter((e) => e.date <= t && e.amount > 0)
  const acct = paypalConfigured() ? await accountInfo() : { id: null, currency: null }

  // Records stamped with a different PayPal account than the one connected now.
  const other = acct.id ? (id?: string) => Boolean(id) && id !== acct.id : () => false
  const foreign = [
    ...entries.filter((e) => e.source === 'paypal' && other(e.paypalAccountId)).map((e) => ({ name: e.description, amount: e.amount, date: e.date })),
    ...subs.filter((s) => s.source === 'paypal' && other(s.paypalAccountId)).map((s) => ({ name: s.name, amount: s.amount, date: s.renewDate || s.terminationDate })),
  ]
  // Older records that have never been checked against an account. A Resync checks them.
  const unchecked = acct.id
    ? entries.filter((e) => e.source === 'paypal' && !e.paypalAccountId).length + subs.filter((s) => s.source === 'paypal' && !s.paypalAccountId).length
    : 0

  return (
    <PayPalClient
      connected={user.paypalStatus === 'connected'}
      lastSync={user.paypalLastSync ?? null}
      mode={paypalConfigured() ? 'sandbox' : 'unconfigured'}
      accountId={acct.id}
      accountCurrency={acct.currency}
      foreign={foreign}
      unchecked={unchecked}
      entries={entries}
      subs={subs}
      goalFunds={goalFunds}
    />
  )
}
