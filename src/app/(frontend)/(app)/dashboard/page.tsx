import { getAppUser } from '@/lib/app-auth'
import { loadEntries, loadGoals, loadJobs, loadSubscriptions } from '@/lib/data'
import { DashboardClient } from '@/components/DashboardClient'

export default async function DashboardPage() {
  const user = (await getAppUser())!
  const [entries, goals, jobs, subs] = await Promise.all([loadEntries(user), loadGoals(user), loadJobs(user), loadSubscriptions(user)])
  return <DashboardClient entries={entries} goals={goals} jobs={jobs} subs={subs} />
}
