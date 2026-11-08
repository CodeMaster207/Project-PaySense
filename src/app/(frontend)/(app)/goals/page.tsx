import { aiProvider } from '@/lib/ai'
import { GoalsClient } from '@/components/GoalsClient'

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ title?: string; amount?: string; months?: string }> }) {
  const q = await searchParams
  const months = Math.min(36, Math.max(1, Number(q.months) || 6))
  return (
    <GoalsClient
      engine={await aiProvider()}
      initial={{ title: (q.title ?? '').slice(0, 120), amount: /^\d+$/.test(q.amount ?? '') ? q.amount! : '', days: months * 30 }}
    />
  )
}
