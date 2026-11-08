'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { jobIncomeEntries } from '@/lib/jobs'
import { deficitDays, plannedEntries } from '@/lib/ledger'
import { parseDay, prettyDay, rm, today } from '@/lib/dates'
import type { EntryView, GoalView, JobView, SubscriptionView } from '@/lib/types'
import { Icon } from './Icon'
import { MonthCalendar } from './MonthCalendar'
import { PieChart, type Slice } from './PieChart'
import { StatGrid } from './StatGrid'
import { AiNote, btnGhost, card, PageTitle } from './ui'

type Period = 'day' | 'month' | 'year'
type Pie = 'income' | 'out' | 'goal'
type Item = { label: string; value: number; slice?: string }
// Green is reserved for incomes, red for expenses and yellow for goals.
const PALETTES: Record<Pie, string[]> = {
  income: ['#4f6213', '#7f9a22', '#a3bf3a', '#c4d968', '#dfeaa6', '#eaf1c8'],
  goal: ['#a47c00', '#d9a900', '#f7cd0e', '#ffe135', '#ffec8a', '#fff5bf'],
  out: ['#a8322a', '#d9544a', '#e8786f', '#f09a92', '#f6bcb6', '#fbdcd8'],
}

function toSlices(pie: Pie, items: { label: string; value: number }[], other: string, max = 5): Slice[] {
  const rest = items.slice(max).reduce((a, i) => a + i.value, 0)
  return [...items.slice(0, max), ...(rest > 0 ? [{ label: other, value: rest }] : [])]
    .filter((x) => x.value > 0)
    .map((x, i) => ({ ...x, color: PALETTES[pie][i % PALETTES[pie].length] }))
}

const group = (list: EntryView[], name = (e: EntryView) => e.description.trim()) => {
  const m = new Map<string, number>()
  for (const e of list) m.set(name(e), (m.get(name(e)) ?? 0) + e.amount)
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}

export function DashboardClient({ entries: manual, goals, jobs, subs }: { entries: EntryView[]; goals: GoalView[]; jobs: JobView[]; subs: SubscriptionView[] }) {
  const [period, setPeriod] = useState<Period>('month')
  const [day, setDay] = useState(today())
  const [month, setMonth] = useState(() => parseDay(today()))
  const [calOpen, setCalOpen] = useState(true)
  const calRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!calOpen) return
    const close = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [calOpen])
  const [pieChoice, setPie] = useState<Pie>('out')
  const [hover, setHover] = useState<{ pie: Pie; label: string } | null>(null)

  const jobIncomes = jobIncomeEntries(jobs)
  const entries = [...manual, ...plannedEntries(goals, [...manual, ...jobIncomes]), ...jobIncomes]
  const overspent = deficitDays(entries, today())
  const prefix = period === 'day' ? day : period === 'month' ? day.slice(0, 7) : day.slice(0, 4)
  const inPeriod = (d: string) => d.startsWith(prefix)
  const periodLabel =
    period === 'day' ? prettyDay(day) : period === 'month' ? parseDay(day).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : day.slice(0, 4)

  // Nothing has been recorded after today, so every view only counts today and earlier days.
  const todayKey = today()
  const isFuture = period === 'day' && day > todayKey
  const rows = entries.filter((e) => inPeriod(e.date) && e.date <= todayKey)
  const incomeItems = group(rows.filter((r) => r.type === 'income'))
  const expenseItems = group(rows.filter((r) => r.type === 'expense' && r.source !== 'goal'))
  const subItems = subs.filter((s) => s.status === 'active' && s.renewDate && inPeriod(s.renewDate) && s.renewDate <= todayKey).map((s) => ({ label: s.name, value: s.amount }))
  // Goal funds show in month and year views (they only count up to today), and in the day view for today
  // and earlier days that were actually funded.
  const goalRows = rows.filter((r) => r.source === 'goal')
  const goalVisible = period !== 'day' || day === today() || (day < today() && goalRows.length > 0)
  const goalItems = goalVisible ? group(goalRows, (e) => e.description.replace(/^Goal: /, '')) : []

  const incomeSlices = toSlices('income', incomeItems, 'Other incomes')
  const pie: Pie = pieChoice === 'goal' && !goalVisible ? 'out' : pieChoice
  const goalSlices = toSlices('goal', goalItems, 'Other goals')
  const outSlices = toSlices('out', [...expenseItems, ...(subItems.length ? [{ label: 'Subscriptions due', value: subItems.reduce((a, s) => a + s.value, 0) }] : [])].sort((a, b) => b.value - a.value), 'Other expenses')
  const sum = (l: { value: number }[]) => l.reduce((a, i) => a + i.value, 0)
  const income = sum(incomeItems)
  const out = sum(expenseItems) + sum(subItems)
  const goal = sum(goalItems)
  const balance = income - out - goal
  // In a deficit, flag whichever outflow is larger as the main cause.
  const culprit: Pie | null = balance < 0 ? (out >= goal ? 'out' : 'goal') : null

  // All-time account balance (independent of the selected period).
  const allRows = entries.filter((e) => e.date <= todayKey)
  const allIncome = sum(group(allRows.filter((r) => r.type === 'income')))
  const allOut = sum(group(allRows.filter((r) => r.type === 'expense' && r.source !== 'goal'))) + sum(subs.filter((s) => s.status === 'active').map((s) => ({ value: s.amount })))
  const allGoal = sum(group(allRows.filter((r) => r.source === 'goal'), (e) => e.description.replace(/^Goal: /, '')))
  const totalBalance = allIncome - allOut - allGoal
  const culpritName = culprit === 'out' ? 'expenses' : 'goal funds'

  const slicesOf = (p: Pie) => (p === 'income' ? incomeSlices : p === 'goal' ? goalSlices : outSlices)
  const sliceOf = (p: Pie, label: string, fallback: string) => (slicesOf(p).some((s) => s.label === label) ? label : fallback)
  const colorFor = (p: Pie) => (label?: string) => slicesOf(p).find((s) => s.label === label)?.color
  const activeFor = (pie: Pie) => (hover?.pie === pie ? hover.label : null)

  return (
    <div>
      <PageTitle icon="chart" title="Dashboard" sub="Where your money goes. Pick a date on the calendar to move around." />
      <AiNote>
        <p>The numbers and charts on this page are <b>not</b> produced by AI. Balances, totals, pie slices and deficit warnings are plain calculations on your recorded incomes, expenses and goal funding.</p>
        <p>AI comes in through the <b>AI planner</b> button at the bottom right. It opens the Plans page, where the AI looks at your finances and picks which savings goal to adjust first, with a short reason, such as moving a target date or skipping weekdays. If no AI account is connected, the goal that takes the most per day is suggested instead.</p>
      </AiNote>

      <div className={`${card} mb-6 flex flex-wrap items-center justify-between gap-4 p-6`}>
        <div className="flex items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-banana-300 text-peel-900">
            <Icon name="wallet" className="size-6" />
          </span>
          <div>
            <p className="text-sm font-bold text-peel-700">Account Balance · All time</p>
            <p className={`text-3xl font-extrabold tracking-tight ${totalBalance >= 0 ? 'text-leaf-700' : 'text-berry-500'}`}>
              {totalBalance < 0 ? '−' : ''}{rm(Math.abs(totalBalance))}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-bold">
          <span className="rounded-xl bg-leaf-100 px-3 py-1.5 text-leaf-700">+{rm(allIncome)} income</span>
          <span className="rounded-xl bg-berry-100 px-3 py-1.5 text-berry-500">−{rm(allOut)} expenses</span>
          {allGoal > 0 && (
            <span className="rounded-xl bg-banana-100 px-3 py-1.5 text-peel-500">−{rm(allGoal)} goals</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-6">
        <section className={`${card} flex min-w-0 flex-col p-6`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-extrabold">{periodLabel}</h2>
            <div role="group" aria-label="Period" className="flex overflow-hidden rounded-xl border-2 border-banana-300 text-sm font-bold">
              {(['day', 'month', 'year'] as const).map((p) => (
                <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)} className={`px-4 py-1.5 capitalize ${period === p ? 'bg-banana-300' : 'bg-white hover:bg-banana-100'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {isFuture ? (
            <div className="grid min-h-[22rem] place-items-center rounded-xl border-2 border-dashed border-banana-300 bg-banana-50 p-8 text-center">
              <div>
                <p className="text-xl font-extrabold">No data yet</p>
                <p className="mt-1 text-sm text-peel-700">Nothing has been recorded after today. Pick today or an earlier date to see your figures.</p>
              </div>
            </div>
          ) : (
            <>
          <div className="mb-6">
            <StatGrid
              items={[
                { label: 'Incomes', value: `+${rm(income)}`, tone: 'text-leaf-700' },
                { label: 'Expenses', value: `-${rm(out)}`, tone: 'text-berry-500' },
                ...(goalVisible ? [{ label: 'Goal funds', value: `-${rm(goal)}`, tone: 'text-peel-500' }] : []),
                { label: 'Balance', value: `${balance < 0 ? '-' : ''}${rm(Math.abs(balance))}`, cell: 'bg-peel-900 text-white' },
              ]}
            />
          </div>

          <p
            role="status"
            className={`mb-3 flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 font-extrabold text-white ${balance >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
          >
            <span className="flex flex-wrap items-center gap-x-3">
              {balance >= 0 ? 'Budget surplus' : 'Budget deficit'}
              {culprit && (
                <span className="flex items-center gap-1 text-sm font-bold">
                  <Icon name="warning" className="size-4" /> Mostly from {culpritName}
                </span>
              )}
            </span>
            <span>{balance >= 0 ? '+' : '-'}{rm(Math.abs(balance))}</span>
          </p>

          <div role="tablist" aria-label="Pie chart" className="mb-3 flex flex-wrap gap-2">
            {(
              [
                { id: 'out' as const, label: 'Expenses', on: 'border-berry-500 bg-berry-500 text-white', off: 'border-berry-500/40 bg-white text-berry-500 hover:bg-berry-100' },
                { id: 'income' as const, label: 'Incomes', on: 'border-leaf-700 bg-leaf-700 text-white', off: 'border-leaf-500/40 bg-white text-leaf-700 hover:bg-leaf-100' },
                ...(goalVisible ? [{ id: 'goal' as const, label: 'Goals', on: 'border-banana-500 bg-banana-400 text-peel-900', off: 'border-banana-400 bg-white text-peel-500 hover:bg-banana-100' }] : []),
              ]
            ).map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={pie === t.id}
                onClick={() => setPie(t.id)}
                className={`rounded-full border-2 px-5 py-1.5 text-sm font-bold transition ${pie === t.id ? t.on : t.off}`}
              >
                {culprit === t.id && <Icon name="warning" className="mr-1.5 inline size-4 align-text-bottom" />}
                {t.label}
              </button>
            ))}
          </div>

          <figure className="flex min-h-[18rem] flex-col items-center justify-center gap-2">
            <figcaption className={`text-lg font-extrabold ${pie === 'income' ? 'text-leaf-700' : pie === 'goal' ? 'text-peel-500' : 'text-berry-500'}`}>
              {pie === 'income' ? 'Incomes' : pie === 'goal' ? 'Goal funds' : 'Expenses'}
            </figcaption>
            {slicesOf(pie).length === 0 ? (
              <p className="py-16 text-center text-sm text-peel-700">No {pie === 'income' ? 'incomes' : pie === 'goal' ? 'goal funding' : 'expenses'} in this period.</p>
            ) : (
              <>
                <PieChart slices={slicesOf(pie)} size={260} active={activeFor(pie)} onActive={(label) => setHover(label ? { pie, label } : null)} />
                <p className="text-sm font-bold text-peel-700">{rm(pie === 'income' ? income : pie === 'goal' ? goal : out)}</p>
              </>
            )}
          </figure>

          <div aria-label="Legend" className="mt-6 overflow-hidden rounded-xl border-2 border-banana-200">
            <div className="max-h-80 overflow-y-auto">
              <LegendSection
                title="Incomes"
                onEnter={() => setPie('income')}
                tone="text-leaf-700"
                sign="+"
                items={incomeItems.map((i) => ({ ...i, slice: sliceOf('income', i.label, 'Other incomes') }))}
                colors={colorFor('income')}
                active={activeFor('income')}
                onActive={(label) => setHover(label ? { pie: 'income', label } : null)}
                empty="No incomes in this period."
              />
              <LegendSection
                title="Expenses"
                warn={culprit === 'out'}
                onEnter={() => setPie('out')}
                tone="text-berry-500"
                sign="-"
                items={[
                  ...expenseItems.map((i) => ({ ...i, slice: sliceOf('out', i.label, 'Other expenses') })),
                  ...subItems.map((i) => ({ ...i, slice: sliceOf('out', 'Subscriptions due', 'Other expenses') })),
                ]}
                colors={colorFor('out')}
                active={activeFor('out')}
                onActive={(label) => setHover(label ? { pie: 'out', label } : null)}
                empty="No expenses in this period."
              />
              {goalVisible && (
              <LegendSection
                  title="Goal funds"
                  warn={culprit === 'goal'}
                  onEnter={() => setPie('goal')}
                  tone="text-peel-500"
                  sign="-"
                  items={goalItems.map((i) => ({ ...i, slice: sliceOf('goal', i.label, 'Other goals') }))}
                  colors={colorFor('goal')}
                  active={activeFor('goal')}
                  onActive={(label) => setHover(label ? { pie: 'goal', label } : null)}
                  empty="No goal funding in this period."
                />
              )}
            </div>
            <div className="flex items-center justify-between gap-4 border-t-2 border-banana-300 bg-banana-100 px-4 py-3 text-sm font-extrabold">
              <span>Total</span>
              <span className="flex gap-4">
                <span className="text-leaf-700">+{rm(income)}</span>
                <span className="text-berry-500">-{rm(out + goal)}</span>
                <span className="w-32 text-right">{balance < 0 ? '-' : ''}{rm(Math.abs(balance))}</span>
              </span>
            </div>
          </div>
            </>
          )}
        </section>

        <div ref={calRef} className="relative">
          <button type="button" aria-label="Show calendar" aria-expanded={calOpen} onClick={() => setCalOpen(true)} className={`${card} flex h-fit flex-col items-center gap-2 px-2 py-3 text-peel-700 hover:bg-banana-100 ${calOpen ? 'invisible' : ''}`}>
            <Icon name="left" />
            <Icon name="calendar" className="size-6" />
          </button>
          {calOpen && (
          <aside className={`${card} absolute right-0 top-0 z-30 h-fit w-[21rem] max-w-[calc(100vw-3rem)] p-4 shadow-xl`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-extrabold">Calendar</h2>
              <button type="button" aria-label="Tuck calendar away" aria-expanded onClick={() => setCalOpen(false)} className="grid size-8 place-items-center rounded-lg text-peel-700 hover:bg-banana-100">
                <Icon name="right" />
              </button>
            </div>
            <MonthCalendar size="sm" month={month} onMonth={setMonth} selected={day} onSelect={setDay} dayState={(d) => (overspent.has(d) ? 'deficit' : undefined)} />
            <button
              type="button"
              className={`${btnGhost} mt-4 w-full`}
              onClick={() => {
                setDay(today())
                setMonth(parseDay(today()))
              }}
            >
              Jump to today
            </button>
          </aside>
          )}
        </div>
      </div>

      <div className="no-print fixed bottom-6 right-6 z-40">
        <Link
          href={`/plans?ai=1&deficit=${balance < 0 ? 1 : 0}`}
          className="planner-float group relative inline-flex items-center gap-2 rounded-full border-2 border-peel-900 bg-banana-300 px-5 py-3 font-extrabold text-peel-900 shadow-[0_4px_0_0_var(--color-peel-900)] transition hover:bg-banana-400"
        >
          <span aria-hidden="true" className="planner-ring pointer-events-none absolute inset-0 -z-10 rounded-full bg-banana-300" />
          <Icon name="sparkle" />
          <span className="flex flex-col text-left leading-tight">
            AI planner
            <span className="text-xs font-bold text-peel-700">{balance < 0 ? 'Fix my deficit' : 'Tune my goals'}</span>
          </span>
        </Link>
      </div>
    </div>
  )
}

function LegendSection({
  title,
  tone,
  sign,
  items,
  empty,
  colors,
  dot,
  warn,
  onEnter,
  active,
  onActive,
}: {
  title: string
  tone: string
  sign: string
  items: Item[]
  empty: string
  /** Present only for sections backed by a pie; goal funds has none. */
  colors?: (label?: string) => string | undefined
  /** Fixed dot colour for sections without a pie (goal funds). */
  dot?: string
  /** Marks the section that causes most of a budget deficit. */
  warn?: boolean
  /** Called when the pointer enters the section (used to switch the pie). */
  onEnter?: () => void
  active?: string | null
  onActive?: (label: string | null) => void
}) {
  const subtotal = items.reduce((a, i) => a + i.value, 0)
  // Switch the pie only when the pointer rests on the section, so passing over it does nothing.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  useEffect(() => cancel, [])
  return (
    <section
      onMouseEnter={() => {
        cancel()
        timer.current = setTimeout(() => onEnter?.(), 450)
      }}
      onMouseLeave={cancel}
    >
      <h3 className="sticky top-0 z-10 flex items-baseline justify-between border-b border-banana-200 bg-banana-50 px-4 py-2 font-extrabold">
        <span className="flex items-center gap-1.5">
          {title}
          {warn && <Icon name="warning" className="size-4 text-red-500" />}
        </span>
        <span className={`text-sm ${tone}`}>{items.length ? sign : ''}{rm(subtotal)}</span>
      </h3>
      <ul className="divide-y divide-banana-100">
        {items.length === 0 && <li className="px-4 py-2 text-sm text-peel-500">{empty}</li>}
        {items.map((i, n) => (
          <li
            key={`${i.label}-${n}`}
            onMouseEnter={() => colors && i.slice && onActive?.(i.slice)}
            onMouseLeave={() => colors && onActive?.(null)}
            className={`flex items-center gap-3 px-4 py-1.5 text-sm ${colors && i.slice && active === i.slice ? 'bg-banana-100' : ''}`}
          >
            {(colors || dot) && <span className="size-3 shrink-0 rounded-full" style={{ background: colors ? colors(i.slice) : dot }} />}
            <span className="flex-1 truncate font-semibold">{i.label}</span>
            <span className={`font-bold ${tone}`}>{sign}{rm(i.value)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
