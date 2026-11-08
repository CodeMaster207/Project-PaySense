'use client'

import { useState } from 'react'
import { CURRENCIES, currencySymbol, rate, rateOrigin, toBase } from '@/lib/money'
import { setCurrencyAction, addEntryAction, deleteEntryAction, syncPayPalAction } from '@/app/(frontend)/actions'
import { addDays, daysBetween, parseDay, prettyDay, rm, today } from '@/lib/dates'
import { isSkipped } from '@/lib/plan'
import { jobIncomeEntries } from '@/lib/jobs'
import { deficitDays, plannedEntries } from '@/lib/ledger'
import type { EntryView, GoalView, JobView } from '@/lib/types'
import Link from 'next/link'
import { Icon } from './Icon'
import { MoneyInput } from './MoneyInput'
import { MonthCalendar } from './MonthCalendar'
import { StatGrid } from './StatGrid'
import { PersonalAI } from './PersonalAI'
import { btnGhost, btnPrimary, card, Feedback, PageTitle, useAction } from './ui'

export function Ledger({ entries: manual, goals, jobs, engine, email, paypalMode, currency }: {
  currency: string; entries: EntryView[]; goals: GoalView[]; jobs: JobView[]; engine: string; email: string; paypalMode: string }) {
  const [day, setDay] = useState(today())
  const [month, setMonth] = useState(() => parseDay(today()))
  const [settings, setSettings] = useState(false)
  const act = useAction()
  const jobIncomes = jobIncomeEntries(jobs)
  const entries = [...manual, ...plannedEntries(goals, [...manual, ...jobIncomes]), ...jobIncomes]

  const dayEntries = entries.filter((e) => e.date === day && e.source !== 'goal')
  const overspent = deficitDays(entries, today())
  // Total goal funding that income has not covered so far, across all days.
  const outstanding = entries.reduce((a, e) => a + (e.source === 'goal' ? e.defaulted ?? 0 : 0), 0)
  const goalFunds = entries.filter((e) => e.date === day && e.source === 'goal')

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_22rem] gap-6">
      <div>
        <PageTitle icon="home" title="Expenditures" sub="Pick a date in the calendar to see and log its incomes and expenditures." />
        <div className={`${card} relative min-h-[34rem] p-6`}>
          <DayPanel day={day} entries={dayEntries.filter((e) => e.type === 'expense')} act={act} />

          <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
            <IncomesCard day={day} rows={dayEntries.filter((e) => e.type === 'income')} />
            <GoalFunds day={day} rows={goalFunds} outstanding={outstanding} />
          </div>

          <DayTotals entries={dayEntries} goalFunds={goalFunds} />

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t-2 border-banana-100 pt-4">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className={btnPrimary}
                disabled={act.pending}
                onClick={() => act.run(() => syncPayPalAction())}
              >
                <Icon name="sync" /> {act.pending ? 'Importing...' : 'Import from PayPal'}
              </button>
              <Feedback error={act.error} notice={act.notice} />
              <div className="relative">
                <button type="button" className={btnGhost} onClick={() => setSettings((s) => !s)}>
                  <Icon name="settings" /> Settings
                </button>
                {settings && (
                  <div className={`${card} absolute bottom-12 left-0 z-10 w-72 p-4 text-sm`}>
                    <dl className="space-y-2">
                      <div><dt className="font-bold">Account</dt><dd className="truncate">{email}</dd></div>
                      <div>
                        <dt className="font-bold">Display currency</dt>
                        <dd>
                          <select
                            aria-label="Display currency"
                            className="mt-1 w-full"
                            value={currency}
                            disabled={act.pending}
                            onChange={(e) => act.run(() => setCurrencyAction(e.target.value))}
                          >
                            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} ({c.symbol}) {c.label}</option>)}
                          </select>
                          <span className="mt-1 block text-xs text-peel-500">
                            Amounts are converted from your base amounts (RM). 1 RM = {rate().toLocaleString('en-US', { maximumFractionDigits: 4 })} {currency}
                            {rateOrigin() === 'estimate' ? ' (indicative rate; live rates are unavailable).' : ' (live rate, refreshed daily).'}
                          </span>
                        </dd>
                      </div>
                      <div><dt className="font-bold">PayPal mode</dt><dd>{paypalMode}</dd></div>
                      <div><dt className="font-bold">AI engine</dt><dd>{engine}</dd></div>
                    </dl>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-4rem)] flex-col gap-4">
        <section className={`${card} p-4`}>
          <h2 className="mb-3 font-extrabold">Calendar</h2>
          <MonthCalendar
            size="sm"
            dayState={(d) => (overspent.has(d) ? 'deficit' : undefined)}
            month={month}
            onMonth={setMonth}
            selected={day}
            onSelect={setDay}
          />
        </section>
        <PersonalAI engine={engine} className="flex-1" />
      </div>
    </div>
  )
}

/** Fixed section (always present, not removable): the day's funding from goal plans. */
function GoalFunds({ day, rows, outstanding }: { day: string; rows: EntryView[]; outstanding: number }) {
  const total = rows.reduce((a, e) => a + e.amount, 0)
  const short = rows.reduce((a, e) => a + (e.defaulted ?? 0), 0)
  // Shortfall warnings only matter for today; other days just show the amounts.
  const isToday = day === today()
  return (
    <section aria-label="Goal funds" className="ml-auto w-full max-w-sm self-start rounded-xl border-2 border-banana-300 bg-banana-50">
      <h3 className="flex items-baseline justify-between border-b-2 border-banana-200 bg-banana-100 px-4 py-2 font-extrabold">
        <span className="flex items-center gap-2"><Icon name="flag" className="size-4" /> Goal funds</span>
        <span className="text-sm text-peel-500">{total > 0 ? '-' : ''}{rm(total)}</span>
      </h3>
      <ul className="divide-y divide-banana-100">
        {rows.length === 0 && <li className="px-4 py-3 text-sm text-peel-500">No goal funding on {prettyDay(day)}.</li>}
        {rows.map((e) => <GoalRow key={e.id} e={e} showWarning={isToday} />)}
      </ul>
      {isToday && (short > 0 || outstanding > 0) && (
        <div role="alert" className="flex items-start gap-2 border-t-2 border-red-500 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600">
          <Icon name="warning" className="mt-0.5 size-4 shrink-0" />
          <div>
            {short > 0 && <p>Short {rm(short)} on this day: income does not cover all goal funds.</p>}
            {outstanding > 0 && <p className="font-semibold">{rm(outstanding)} short in total so far, repaid through higher daily funding.</p>}
          </div>
        </div>
      )}
    </section>
  )
}

/** View-only incomes for the selected day; recording happens on the Incomes tab. */
function IncomesCard({ day, rows }: { day: string; rows: EntryView[] }) {
  const total = rows.reduce((a, e) => a + e.amount, 0)
  return (
    <section aria-label="Incomes" className="w-full max-w-sm self-start rounded-xl border-2 border-banana-300 bg-banana-50">
      <h3 className="flex items-baseline justify-between border-b-2 border-banana-200 bg-banana-100 px-4 py-2 font-extrabold">
        <span className="flex items-center gap-2"><Icon name="income" className="size-4" /> Incomes</span>
        <span className="text-sm text-leaf-700">{total > 0 ? '+' : ''}{rm(total)}</span>
      </h3>
      <ul className="divide-y divide-banana-100">
        {rows.length === 0 && <li className="px-4 py-3 text-sm text-peel-500">No incomes on {prettyDay(day)}.</li>}
        {rows.map((e) => (
          <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="h-3 w-6 rounded-full bg-leaf-500" />
            <span className="flex-1 font-semibold">{e.description}</span>
            {e.source === 'paypal' && <span className="rounded-full bg-banana-200 px-2 text-xs font-bold">PayPal</span>}
            {e.source === 'job' && <span className="rounded-full bg-leaf-100 px-2 text-xs font-bold text-leaf-700">Job</span>}
            <span className="font-bold text-leaf-700">+{rm(e.amount)}</span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-3 px-4 py-2 text-sm text-peel-700">
          <span>View-only here.</span>
          <Link href="/incomes" className="font-bold underline hover:text-peel-900">Manage incomes</Link>
        </li>
      </ul>
    </section>
  )
}

function DayTotals({ entries, goalFunds }: { entries: EntryView[]; goalFunds: EntryView[] }) {
  const sum = (rows: EntryView[]) => rows.reduce((a, e) => a + e.amount, 0)
  const income = sum(entries.filter((e) => e.type === 'income'))
  const expense = sum(entries.filter((e) => e.type === 'expense'))
  const goal = sum(goalFunds)
  const net = income - expense - goal
  return (
    <section aria-label="Totals" className="mt-4 rounded-xl border-2 border-banana-300 p-3">
      <h3 className="mb-2 px-1 font-extrabold">Total</h3>
      <StatGrid
        valueClass="text-base"
        items={[
          { label: 'Incomes', value: `+${rm(income)}`, tone: 'text-leaf-700' },
          { label: 'Expenditures', value: `-${rm(expense)}`, tone: 'text-berry-500' },
          { label: 'Goal funds', value: `${goal > 0 ? '-' : ''}${rm(goal)}`, tone: 'text-peel-500' },
          { label: 'Balance', value: `${net < 0 ? '-' : ''}${rm(Math.abs(net))}`, cell: 'bg-peel-900 text-white' },
        ]}
      />
    </section>
  )
}

function GoalRow({ e, showWarning }: { e: EntryView; showWarning: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-banana-50"
      >
        <span className="h-3 w-6 rounded-full bg-banana-400" />
        <span className="flex-1 font-semibold">{e.description.replace(/^Goal: /, '')}</span>
        {showWarning && e.defaulted ? <span className="rounded-full bg-red-500 px-2 text-xs font-bold text-white">Short {rm(e.defaulted)}</span> : null}
        {e.extra ? <span className="rounded-full bg-banana-400 px-2 text-xs font-bold text-peel-900">+{rm(e.extra)} catch-up</span> : null}
        <span className="font-bold text-peel-500">-{rm(e.amount)}</span>
        <Icon name={open ? 'left' : 'right'} className={`size-5 text-peel-500 transition ${open ? '-rotate-90' : 'rotate-0'}`} />
      </button>
      {open && (
        <div className="flex items-center justify-between gap-3 bg-banana-50 px-4 py-2.5 text-sm">
          <span className="text-peel-700">This amount comes from your goal plan.</span>
          <Link href={`/plans?goal=${e.goalId}`} className={btnPrimary}>
            <Icon name="flag" className="size-4" /> Modify this goal
          </Link>
        </div>
      )}
    </li>
  )
}

function DayPanel({ day, entries, act }: { day: string; entries: EntryView[]; act: ReturnType<typeof useAction> }) {
  const total = entries.reduce((a, e) => a + e.amount, 0)
  return (
    <div>
      <h2 className="mb-4 text-2xl font-extrabold underline decoration-banana-400 decoration-4 underline-offset-4">{prettyDay(day)}</h2>
      <section className="mb-2">
        <h3 className="mb-2 flex items-baseline justify-between text-xl font-bold">
          Expenditures
          <span className="text-base text-berry-500">{rm(total)}</span>
        </h3>
        <ul className="divide-y-2 divide-banana-100 rounded-xl border-2 border-banana-100">
          {entries.length === 0 && <li className="px-4 py-3 text-sm text-peel-500">Nothing logged for this day.</li>}
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="h-3 w-6 rounded-full bg-berry-500" />
              <span className="flex-1 font-semibold">{e.description}</span>
              {e.source === 'paypal' && <span className="rounded-full bg-banana-200 px-2 text-xs font-bold">PayPal</span>}
              <span className="font-bold">{rm(e.amount)}</span>
              <button type="button" aria-label={`Delete ${e.description}`} className="text-peel-500 hover:text-berry-500" onClick={() => act.run(() => deleteEntryAction(e.id))}>
                <Icon name="delete" className="size-5" />
              </button>
            </li>
          ))}
          <AddRow key={`${day}-${entries.length}`} type="expense" day={day} act={act} />
        </ul>
      </section>
    </div>
  )
}

function AddRow({ type, day, act }: { type: 'income' | 'expense'; day: string; act: ReturnType<typeof useAction> }) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  return (
    <li>
      <form
        className="flex items-center gap-3 px-4 py-2.5"
        onSubmit={(e) => {
          e.preventDefault()
          act.run(() => addEntryAction({ date: day, type, description, amount: toBase(Number(amount)) }))
        }}
      >
        <button aria-label={`Add ${type}`} className="grid size-8 place-items-center rounded-lg bg-banana-300 hover:bg-banana-400">
          <Icon name="add" />
        </button>
        <input className="min-w-0 flex-1 !py-1.5" placeholder="Description..." value={description} onChange={(e) => setDescription(e.target.value)} required />
        <MoneyInput className="w-36" inputClassName="!py-1.5" placeholder="Amount...." step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </form>
    </li>
  )
}
