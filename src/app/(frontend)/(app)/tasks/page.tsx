import { aiProvider } from '@/lib/ai'
import { getAppUser } from '@/lib/app-auth'
import { loadTasks } from '@/lib/data'
import { AUTOPAY_HARD_CAP } from '@/lib/task-review'
import { TasksClient } from '@/components/TasksClient'

export default async function TasksPage() {
  const user = (await getAppUser())!
  const [tasks, engine] = await Promise.all([loadTasks(user), aiProvider()])
  return <TasksClient tasks={tasks} autopayLimit={Number((user as { autopayLimit?: number }).autopayLimit ?? 0)} hardCap={AUTOPAY_HARD_CAP} engine={engine} />
}
