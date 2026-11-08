import { getAppUser } from '@/lib/app-auth'
import { aiProvider } from '@/lib/ai'
import { loadEntries, loadGoals, loadJobs } from '@/lib/data'
import { paypalConfigured } from '@/lib/paypal'
import { Ledger } from '@/components/Ledger'

export default async function HomePage() {
  const user = (await getAppUser())!
  const [entries, goals, jobs] = await Promise.all([loadEntries(user), loadGoals(user), loadJobs(user)])
  return <Ledger currency={user.currency ?? 'MYR'} entries={entries} goals={goals} jobs={jobs} engine={await aiProvider()} email={user.email} paypalMode={paypalConfigured() ? 'Sandbox API' : 'Not configured'} />
}
