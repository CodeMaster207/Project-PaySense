'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { draftPlanAction, saveGoalAction } from '@/app/(frontend)/actions'
import { addDays, today } from '@/lib/dates'
import type { PlanDraft, PlanItem } from '@/lib/types'
import type { TagColor } from '@/lib/tagColors'
import { Icon } from './Icon'
import { TagColorPicker } from './TagColor'
import { DatePicker } from './DatePicker'
import { GoalEditor } from './GoalEditor'
import { currencySymbol, localize, toBase, toDisplay } from '@/lib/money'
import { MoneyInput } from './MoneyInput'
import { btnDanger, btnGhost, btnPrimary, card, Feedback, PageTitle, useAction } from './ui'

export function GoalsClient({ initial, engine }: { initial: { title: string; amount: string; days: number }; engine: string }) {
  const router = useRouter()
  const [title, setTitle] = useState(initial.title)
  const [targetDate, setTargetDate] = useState(addDays(today(), initial.days))
  const [amount, setAmount] = useState(initial.amount ? String(Math.round(toDisplay(Number(initial.amount)) * 100) / 100) : '')
  const [description, setDescription] = useState('')
  const [tag, setTag] = useState('')
  const [tagColor, setTagColor] = useState<TagColor>('banana')
  const [draft, setDraft] = useState<PlanDraft | null>(null)
  const [refined, setRefined] = useState<PlanItem[] | null>(null)
  const act = useAction()

  const build = (refine?: PlanDraft) =>
    act.run(
      () => draftPlanAction({ title, description, targetDate, targetAmount: toBase(Number(amount)), refine }),
      (r) => r.data && setDraft(r.data),
    )

  if (draft) {
    return (
      <div className="max-w-5xl">
        <PageTitle icon="flag" title="The plan will be created as follows:" sub={`Drafted by ${engine}. Adjust anything below before saving.`} />
        <div className={`${card} space-y-6 p-6`}>
          <section>
            <h2 className="mb-2 inline-block rounded-t-xl border-2 border-b-0 border-banana-200 bg-banana-100 px-5 py-1.5 font-bold">Summary</h2>
            <ul className="list-disc space-y-1 rounded-b-xl rounded-tr-xl border-2 border-banana-200 p-4 pl-9">
              {draft.summary.map((s, i) => <li key={i}>{localize(s)}</li>)}
            </ul>
          </section>
          <GoalEditor
            goal={{
              title: draft.title,
              tag,
              tagColor,
              startDate: draft.startDate,
              targetDate: draft.targetDate,
              targetAmount: draft.targetAmount,
              dailyAmount: draft.dailyAmount,
              items: draft.items,
              skipWeekdays: [],
              excludedDays: [],
              restoredDays: [],
            }}
            aiItems={refined ?? undefined}
            submitLabel="Confirm!"
            onSubmit={(v) => saveGoalAction(draft, v)}
            onDone={() => router.push('/plans')}
            extraActions={
              <>
                <button
                  type="button"
                  className={btnGhost}
                  disabled={act.pending}
                  onClick={() => act.run(() => draftPlanAction({ title, description, targetDate, targetAmount: toBase(Number(amount)), refine: draft }), (r) => r.data && setRefined(r.data.items))}
                >
                  <Icon name="sparkle" /> {act.pending ? 'Thinking...' : 'Break it down further for me'}
                </button>
                <button type="button" className={btnDanger} disabled={act.pending} onClick={() => { setDraft(null); setRefined(null) }}>Cancel</button>
              </>
            }
          />
          <Feedback error={act.error} />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      <PageTitle icon="flag" title="Personal AI" sub="Write the goal here!" />
      <form
        className={`${card} space-y-4 p-6`}
        onSubmit={(e) => {
          e.preventDefault()
          build()
        }}
      >
        <label className="block">
          <span className="text-xl font-extrabold italic">Goal:</span>
          <input className="mt-1 w-full" required maxLength={120} placeholder="e.g. Save for a Japan trip" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xl font-extrabold">Tag:</span>
          <input className="mt-1 w-full" maxLength={40} placeholder="Optional, e.g. travel" value={tag} onChange={(e) => setTag(e.target.value)} />
          <span className="mt-2 block"><TagColorPicker value={tagColor} onChange={setTagColor} /></span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div className="block">
            <span className="text-xl font-extrabold">Target Date:</span>
            <div className="mt-1"><DatePicker ariaLabel="Target date" min={addDays(today(), 1)} value={targetDate} onChange={setTargetDate} /></div>
          </div>
          <label className="block">
            <span className="text-xl font-extrabold">Target Amount ({currencySymbol()}):</span>
            <MoneyInput className="mt-1" required min="1" step="1" placeholder="5000" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
        </div>
        <label className="block">
          <span className="text-2xl font-extrabold">Description:</span>
          <textarea className="mt-1 h-64 w-full resize-none" maxLength={4000} placeholder="Tell the AI more. **Markdown** is welcome: - bullet points, *emphasis*, constraints..." value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <Feedback error={act.error} />
        <div className="flex items-center justify-between">
          <span className="text-sm italic text-peel-700">Formatting: Markdown Text</span>
          <button className={btnPrimary} disabled={act.pending}>
            <Icon name="sparkle" /> {act.pending ? 'Planning...' : 'Ask AI to create plans for you!'}
          </button>
        </div>
      </form>
    </div>
  )
}
