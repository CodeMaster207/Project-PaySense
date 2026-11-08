import { getAppUser } from '@/lib/app-auth'
import { loadEntries, loadJobs, loadPaymentRequests } from '@/lib/data'
import { IncomesClient } from '@/components/IncomesClient'

export default async function IncomesPage() {
  const user = (await getAppUser())!
  const [entries, jobs, requests] = await Promise.all([loadEntries(user), loadJobs(user), loadPaymentRequests(user)])
  // Exclude PayPal-sourced entries (refunds etc.) — those appear on the dashboard only.
  const incomes = entries.filter((e) => e.type === 'income' && e.source !== 'paypal')
  return <IncomesClient incomes={incomes} jobs={jobs} requests={requests} autoFollowUp={Boolean((user as { autoFollowUp?: boolean }).autoFollowUp)} />
}
