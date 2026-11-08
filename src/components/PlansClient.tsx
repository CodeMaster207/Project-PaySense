'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { archiveGoalAction, pickGoalToEditAction, suggestGoalsAction, draftPlanAction, updateGoalAction } from '@/app/(frontend)/actions'
import { prettyDay, rm } from '@/lib/dates'
import type { GoalView, PlanItem } from '@/lib/types'
import { localize } from '@/lib/money'
import { asTagColor } from '@/lib/tagColors'
import { DatePicker } from './DatePicker'
import { Icon } from './Icon'
import { TagBadge } from './TagColor'
import { GoalEditor } from './GoalEditor'
import { AiNote, btnDanger, btnGhost, btnPrimary, card, Feedback, PageTitle, useAction } from './ui'

type Suggestion = { title: string; targetAmount: number; months: number; why: string }

export function PlansClient({
  goals,
  catchUp,
  engine,
  initialGoalId,
  aiPick,
}: {
  goals: GoalView[]
  catchUp: Record<string, { defaulted: number; extra: number; remainingDays: number }>
  engine: string
  initialGoalId: string | null
  aiPick: { deficit: boolean } | null
}) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [tagFilter, setTagFilter] = useState('all')
  const [sort, setSort] = useState<'end-asc' | 'end-desc' | 'tag' | 'name'>('end-asc')
  const tags = [...new Set(goals.map((g) => g.tag).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const activeTag = tagFilter === 'all' || tagFilter === 'none' || tags.includes(tagFilter) ? tagFilter : 'all'
  const visible = goals
    .filter((g) => (!from || g.targetDate >= from) && (!to || g.startDate <= to))
    .filter((g) => activeTag === 'all' || (activeTag === 'none' ? !g.tag : g.tag === activeTag))
    .sort((a, b) =>
      sort === 'end-desc' ? b.targetDate.localeCompare(a.targetDate)
      : sort === 'tag' ? (a.tag || '\uffff').localeCompare(b.tag || '\uffff') || a.targetDate.localeCompare(b.targetDate)
      : sort === 'name' ? a.title.localeCompare(b.title)
      : a.targetDate.localeCompare(b.targetDate),
    )
  const [selectedId, setSelectedId] = useState<string | null>(initialGoalId)
  const selected = visible.find((g) => g.id === selectedId) ?? visible[0] ?? null
  const [aiItems, setAiItems] = useState<Record<string, PlanItem[]>>({})
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const act = useAction()
  const [aiNote, setAiNote] = useState<{ text: string; busy: boolean } | null>(aiPick ? { text: '', busy: true } : null)
  const [flash, setFlash] = useState(false)
  const started = useRef(false)

  // Arriving from the Dashboard's AI planner: let the AI choose which goal to modify.
  useEffect(() => {
    if (!aiPick || started.current) return
    started.current = true
    pickGoalToEditAction(aiPick.deficit).then((r) => {
      if (!r.ok) return setAiNote({ text: r.error, busy: false })
      if (!r.data) return setAiNote({ text: 'You have no goals yet. Create one on the Goal page and the AI planner can tune it.', busy: false })
      setTagFilter('all')
      setFrom('')
      setTo('')
      setSelectedId(r.data.goalId)
      setAiNote({ text: r.data.reason, busy: false })
      setFlash(true)
      setTimeout(() => setFlash(false), 3500)
    })
  }, [aiPick])

  return (
    <div>
      <PageTitle icon="calendar" title="Plan overview" sub="Manage your plans here!" />
      <AiNote>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Further refine the goal for me.</b> The AI takes your saved plan and breaks it into finer weekly checkpoints. The checkpoints are validated, so every date falls between the start and target date.</li>
          <li><b>Suggest goals for me.</b> The AI reads a summary of your finances and proposes a few realistic savings goals with an amount, a timeframe and a reason. You choose whether to use one.</li>
          <li><b>Which goal to edit (AI planner).</b> From the Dashboard, the AI picks the one goal whose change would help your budget most, and explains why.</li>
        </ul>
        <p>Calendars, daily amounts and the skip-days you set are ordinary calculations. Without a connected AI account, even splits, fixed suggestions and a "heaviest goal" pick are used instead.</p>
      </AiNote>
      <div className="mb-4 flex items-center gap-3">
        <span className="font-bold">Date Range:</span>
        <div className="w-48"><DatePicker clearable ariaLabel="From" placeholder="Any date" max={to || undefined} value={from} onChange={setFrom} /></div>
        <span>to</span>
        <div className="w-48"><DatePicker clearable ariaLabel="To" placeholder="Any date" min={from || undefined} value={to} onChange={setTo} /></div>
        {(from || to) && <button className="text-sm font-bold text-peel-700 underline" onClick={() => { setFrom(''); setTo('') }}>Clear</button>}
      </div>
      <div className="grid grid-cols-1 gap-6 min-[1400px]:grid-cols-[22rem_minmax(0,1fr)]">
        <section className={`${card} overflow-hidden`}>
          <h2 className="border-b-2 border-banana-200 bg-banana-100 px-4 py-3 text-lg font-extrabold italic">Manage your plans here!</h2>
          <div className="grid grid-cols-2 gap-2 border-b-2 border-banana-100 p-3 text-xs font-bold">
            <label className="flex flex-col gap-1">
              Filter by tag
              <select value={activeTag} onChange={(e) => setTagFilter(e.target.value)}>
                <option value="all">All tags</option>
                {tags.map((t) => <option key={t} value={t}>{t}</option>)}
                <option value="none">No tag</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              Sort by
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                <option value="end-asc">End date: soonest</option>
                <option value="end-desc">End date: latest</option>
                <option value="tag">Tag (A-Z)</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </label>
          </div>
          <ul>
            {visible.length === 0 && (
              <li className="p-4 text-sm text-peel-700">
                No plans match these filters. <Link href="/goals" className="font-bold underline">Create one with AI</Link>.
              </li>
            )}
            {visible.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(g.id)}
                  className={`block w-full border-b border-banana-100 px-4 py-3 text-left transition ${selected?.id === g.id ? 'bg-banana-200' : 'hover:bg-banana-50'}`}
                >
                  <span className="flex items-center gap-2 font-extrabold">{g.title}<TagBadge tag={g.tag} color={asTagColor(g.tagColor)} /></span>
                  <span className="block text-sm text-peel-700">{rm(g.dailyAmount + (catchUp[g.id]?.extra ?? 0))}/day, by {prettyDay(g.targetDate)}</span>
                  {catchUp[g.id]?.extra ? <span className="mt-0.5 block text-xs font-bold text-red-500">Catching up: +{rm(catchUp[g.id].extra)}/day</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-4">
          {aiNote && (
            <div role="status" className="flex items-start gap-3 rounded-2xl border-2 border-peel-900 bg-banana-300 p-4 shadow-[0_4px_0_0_var(--color-peel-900)]">
              <Icon name="sparkle" className={`mt-0.5 size-5 shrink-0 ${aiNote.busy ? 'animate-spin' : ''}`} />
              <div className="flex-1">
                <p className="font-extrabold">{aiNote.busy ? 'AI planner is choosing a goal to modify...' : 'AI planner picked this goal'}</p>
                {!aiNote.busy && <p className="text-sm">{localize(aiNote.text)}</p>}
              </div>
              {!aiNote.busy && (
                <button type="button" aria-label="Dismiss" className="text-peel-700 hover:text-peel-900" onClick={() => setAiNote(null)}>
                  <Icon name="close" className="size-5" />
                </button>
              )}
            </div>
          )}
          <section className={`${card} p-5 transition ${flash ? 'ring-4 ring-banana-400 ring-offset-2' : ''}`}>
            {selected ? (
              <>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-extrabold">Modify goal</h2>
                    <ul className="mt-1 list-disc pl-5 text-sm text-peel-700">{selected.summary.map((s, i) => <li key={i}>{localize(s)}</li>)}</ul>
                  </div>
                  <button className={btnDanger} disabled={act.pending} onClick={() => act.run(() => archiveGoalAction(selected.id))}>
                    <Icon name="delete" className="size-4" /> Remove
                  </button>
                </div>
                {catchUp[selected.id]?.defaulted ? (
                  <div role="status" className="mb-4 rounded-xl border-2 border-red-500 bg-red-50 p-3 text-sm">
                    <p className="font-extrabold text-red-600">Funding was not covered</p>
                    <p>
                      {rm(catchUp[selected.id].defaulted)} of this goal's funding was not covered by your recorded income. To make it up, the daily
                      funding rises by {rm(catchUp[selected.id].extra)} for the remaining {catchUp[selected.id].remainingDays} funding days
                      ({rm(selected.dailyAmount)} becomes {rm(selected.dailyAmount + catchUp[selected.id].extra)}). It only ever goes up.
                    </p>
                  </div>
                ) : null}
                <div className="@container">
                  <GoalEditor
                    key={selected.id}
                    goal={selected}
                    aiItems={aiItems[selected.id]}
                    onSubmit={(v) => updateGoalAction(selected.id, v)}
                    onDone={() => setAiItems(({ [selected.id]: _, ...rest }) => rest)}
                  />
                </div>
              </>
            ) : (
              <p className="py-10 text-center text-peel-700">Select or create a plan to see its calendar.</p>
            )}
          </section>

          <section className={`${card} overflow-hidden`}>
            <h2 className="flex items-center justify-between border-b-2 border-banana-200 bg-banana-100 px-4 py-2 font-extrabold">
              Personal AI <span className="text-xs font-bold text-peel-500">{engine}</span>
            </h2>
            <div className="space-y-3 p-4">
              <div className="flex gap-3">
                <button
                  className="rounded-xl border-2 border-berry-500 bg-berry-100 px-4 py-3 font-bold text-berry-500 hover:bg-berry-500 hover:text-white disabled:opacity-50"
                  disabled={!selected || act.pending}
                  onClick={() =>
                    selected &&
                    act.run(
                      () => draftPlanAction({ title: selected.title, description: selected.description, targetDate: selected.targetDate, targetAmount: selected.targetAmount, refine: selected }),
                      (r) => r.data && setAiItems({ ...aiItems, [selected.id]: r.data.items }),
                    )
                  }
                >
                  Further refine the goal for me
                </button>
                <button
                  className="rounded-xl border-2 border-banana-500 bg-banana-100 px-4 py-3 font-bold text-peel-700 hover:bg-banana-300 disabled:opacity-50"
                  disabled={act.pending}
                  onClick={() => act.run(() => suggestGoalsAction(), (r) => setSuggestions(r.data ?? []))}
                >
                  Suggest goals for me
                </button>
              </div>
              {selected && <p className="text-xs text-peel-500">Refinement adds weekly checkpoints. Review them above, then Save changes.</p>}
              <Feedback error={act.error} />
              {suggestions && (
                <ul className="space-y-2">
                  {suggestions.map((s, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-xl bg-banana-50 p-3">
                      <div>
                        <p className="font-bold">{s.title} - {rm(s.targetAmount)} in {s.months} months</p>
                        <p className="text-sm text-peel-700">{s.why}</p>
                      </div>
                      <Link className={btnGhost} href={`/goals?title=${encodeURIComponent(s.title)}&amount=${s.targetAmount}&months=${s.months}`}>Use</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
