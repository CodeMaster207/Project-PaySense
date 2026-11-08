import { getAppUser } from '@/lib/app-auth'
import { loadEntries, loadJobs } from '@/lib/data'
import { IncomesClient } from '@/components/IncomesClient'

export default async function IncomesPage() {
  const user = (await getAppUser())!
  const [entries, jobs] = await Promise.all([loadEntries(user), loadJobs(user)])
  return <IncomesClient incomes={entries.filter((e) => e.type === 'income')} jobs={jobs} />
}
