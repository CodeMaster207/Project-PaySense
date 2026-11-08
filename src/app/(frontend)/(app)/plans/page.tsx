import { getAppUser } from '@/lib/app-auth'
import { aiProvider } from '@/lib/ai'
import { loadEntries, loadGoals, loadJobs } from '@/lib/data'
import { jobIncomeEntries } from '@/lib/jobs'
import { goalCatchUp } from '@/lib/ledger'
import { PlansClient } from '@/components/PlansClient'

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ goal?: string; ai?: string; deficit?: string }> }) {
  const { goal, ai, deficit } = await searchParams
  const user = (await getAppUser())!
  const [goals, entries, jobs] = await Promise.all([loadGoals(user), loadEntries(user), loadJobs(user)])
  const catchUp = Object.fromEntries(goalCatchUp(goals, [...entries, ...jobIncomeEntries(jobs)]).byGoal)
  return <PlansClient goals={goals} catchUp={catchUp} engine={await aiProvider()} initialGoalId={goal ?? null} aiPick={ai === '1' ? { deficit: deficit === '1' } : null} />
}
