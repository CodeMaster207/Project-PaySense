'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { CURRENCIES, currencySymbol, rate, rateOrigin, toBase } from '@/lib/money'
import { setCurrencyAction, addEntryAction, deleteEntryAction, sendPayPalExpenseAction, syncPayPalAction } from '@/app/(frontend)/actions'
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
import { AiNote, btnGhost, btnPrimary, card, Feedback, PageTitle, useAction } from './ui'

export function Ledger({ entries: manual, goals, jobs, engine, email, paypalMode, currency }: {
  currency: string; entries: EntryView[]; goals: GoalView[]; jobs: JobView[]; engine: string; email: string; paypalMode: string }) {
  const [day, setDay] = useState(today())
  const [month, setMonth] = useState(() => parseDay(today()))
  const [settings, setSettings] = useState(false)
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
  const act = useAction()
  const jobIncomes = jobIncomeEntries(jobs)
  const entries = [...manual, ...plannedEntries(goals, [...manual, ...jobIncomes]), ...jobIncomes]

  const dayEntries = entries.filter((e) => e.date === day && e.source !== 'goal')
  const overspent = deficitDays(entries, today())
  // Total goal funding that income has not covered so far, across all days.
  const outstanding = entries.reduce((a, e) => a + (e.source === 'goal' ? e.defaulted ?? 0 : 0), 0)
  const goalFunds = entries.filter((e) => e.date === day && e.source === 'goal')

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <PageTitle icon="home" title="Expenditures" sub="Pick a date in the calendar to see and log its incomes and expenditures." />
        <AiNote>
          <p>This page mixes plain calculations with two AI features.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><b>Personal AI chat (generative).</b> It answers your questions using a snapshot of your own data: balance, biggest expenses, subscriptions and goals.</li>
            <li><b>Import from PayPal (classification).</b> New PayPal transactions are sent to the AI, which decides whether money out is a subscription or a one-off expense and files subscriptions under a category.</li>
            <li><b>Not AI.</b> Daily totals, balances, the red deficit days on the calendar and goal funding are ordinary calculations on your records.</li>
          </ul>
          <p>AI needs an account you connect on the AI Insights page (OpenAI, Claude or Gemini). Without one, the chat gives a basic summary and the import falls back to simple keyword rules.</p>
        </AiNote>
        <div ref={calRef} className="relative mb-3 flex justify-end">
          <button
            type="button"
            aria-label="Show calendar"
            aria-expanded={calOpen}
            onClick={() => setCalOpen(true)}
            className={`${card} flex items-center gap-2 px-3 py-2 font-bold text-peel-700 hover:bg-banana-100 ${calOpen ? 'invisible' : ''}`}
          >
            <Icon name="calendar" className="size-6" /> Calendar
          </button>
          {calOpen && (
            <section className={`${card} absolute right-0 top-0 z-30 w-[22rem] max-w-full p-4 shadow-xl`}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-extrabold">Calendar</h2>
                <button type="button" aria-label="Tuck calendar away" aria-expanded onClick={() => setCalOpen(false)} className="grid size-8 place-items-center rounded-lg text-peel-700 hover:bg-banana-100">
                  <Icon name="right" />
                </button>
              </div>
              <MonthCalendar
                size="sm"
                dayState={(d) => (overspent.has(d) ? 'deficit' : undefined)}
                month={month}
                onMonth={setMonth}
                selected={day}
                onSelect={setDay}
              />
            </section>
          )}
        </div>
        <div className={`${card} relative min-h-[34rem] p-6`}>
          <DayPanel day={day} entries={dayEntries.filter((e) => e.type === 'expense')} act={act} />

          <div className="@container mt-8">
          <div className="grid grid-cols-1 items-start gap-6 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <div className="flex min-w-0 flex-col gap-4">
              <h3 className="text-xl font-bold">Income</h3>
              <InflowCard day={day} rows={dayEntries.filter((e) => e.type === 'income' && e.source !== 'job')} act={act} />
              <IncomesCard day={day} rows={dayEntries.filter((e) => e.type === 'income' && e.source === 'job')} />
            </div>
            <div className="flex w-full min-w-0 flex-col gap-4">
              <h3 className="text-right text-xl font-bold">Goals</h3>
              <GoalFunds day={day} rows={goalFunds} outstanding={outstanding} />
            </div>
          </div>
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

      <div className="flex min-h-[40rem] flex-col gap-4 xl:h-[calc(100vh-4rem)]">
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
    <section aria-label="Funds" className="w-full self-start rounded-xl border-2 border-banana-300 bg-banana-50">
      <h3 className="flex items-baseline justify-between border-b-2 border-banana-200 bg-banana-100 px-4 py-2 font-extrabold">
        <span className="flex items-center gap-2"><Icon name="flag" className="size-4" /> Funds</span>
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

/** Inflow card: refunds, manual transfers, PayPal income — editable inline. */
function InflowCard({ day, rows, act }: { day: string; rows: EntryView[]; act: ReturnType<typeof useAction> }) {
  const total = rows.reduce((a, e) => a + e.amount, 0)
  return (
    <section aria-label="Inflow" className="w-full min-w-0 overflow-hidden rounded-xl border-2 border-banana-300 bg-banana-50">
      <h3 className="flex items-baseline justify-between border-b-2 border-banana-200 bg-banana-100 px-4 py-2 font-extrabold">
        <span className="flex items-center gap-2"><Icon name="income" className="size-4" /> Inflow</span>
        <span className="text-sm text-leaf-700">{total > 0 ? '+' : ''}{rm(total)}</span>
      </h3>
      <ul className="divide-y divide-banana-100">
        {rows.length === 0 && <li className="px-4 py-3 text-sm text-peel-500">No inflow on {prettyDay(day)}.</li>}
        {rows.map((e) => (
          <li key={e.id} className="flex items-start gap-3 px-4 py-2.5">
            <span className="mt-1.5 h-3 w-6 shrink-0 rounded-full bg-leaf-500" />
            <span className="min-w-0 flex-1 break-words font-semibold">{e.description}</span>
            <div className="flex shrink-0 items-center gap-2">
              {e.source === 'paypal' && <span className="rounded-full bg-banana-200 px-2 text-xs font-bold">PayPal</span>}
              <span className="font-bold text-leaf-700">+{rm(e.amount)}</span>
              <button type="button" aria-label={`Delete ${e.description}`} className="text-peel-500 hover:text-berry-500" onClick={() => act.run(() => deleteEntryAction(e.id))}>
                <Icon name="delete" className="size-5" />
              </button>
            </div>
          </li>
        ))}
        <AddRow type="income" day={day} act={act} />
      </ul>
    </section>
  )
}

/** View-only job income for the selected day; managed on the Jobs tab. */
function IncomesCard({ day, rows }: { day: string; rows: EntryView[] }) {
  const total = rows.reduce((a, e) => a + e.amount, 0)
  return (
    <section aria-label="Incomes" className="w-full rounded-xl border-2 border-banana-300 bg-banana-50">
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
            <span className="rounded-full bg-leaf-100 px-2 text-xs font-bold text-leaf-700">Job</span>
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
          { label: 'Income', value: `+${rm(income)}`, tone: 'text-leaf-700' },
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
  const [mode, setMode] = useState<'standalone' | 'paypal'>('standalone')
  const [recipient, setRecipient] = useState('')
  const group = useId()
  const viaPayPal = type === 'expense' && mode === 'paypal'
  return (
    <li>
      <form
        className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5"
        onSubmit={(e) => {
          e.preventDefault()
          if (viaPayPal) act.run(() => sendPayPalExpenseAction({ date: day, description, amount: toBase(Number(amount)), recipient }))
          else act.run(() => addEntryAction({ date: day, type, description, amount: toBase(Number(amount)) }))
        }}
      >
        <button aria-label={viaPayPal ? 'Send via PayPal and add expense' : `Add ${type}`} disabled={act.pending} className="grid size-8 place-items-center rounded-lg bg-banana-300 hover:bg-banana-400 disabled:opacity-60">
          <Icon name="add" />
        </button>
        <input className="min-w-0 flex-1 !py-1.5" placeholder="Description..." value={description} onChange={(e) => setDescription(e.target.value)} required />
        <MoneyInput className="w-28 shrink-0" inputClassName="!py-1.5" placeholder="Amount...." step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        {type === 'expense' && (
          <div className="basis-full space-y-2 sm:pl-11">
            <div role="radiogroup" aria-label="How is this paid?" className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
              <label className="flex items-center gap-2">
                <input type="radio" name={group} className="accent-[var(--color-banana-500)]" checked={mode === 'standalone'} onChange={() => setMode('standalone')} />
                Standalone expense
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name={group} className="accent-[var(--color-banana-500)]" checked={mode === 'paypal'} onChange={() => setMode('paypal')} />
                Send via PayPal ID
              </label>
            </div>
            {viaPayPal && (
              <>
                <input className="w-full !py-1.5" placeholder="Recipient PayPal ID or email" maxLength={120} value={recipient} onChange={(e) => setRecipient(e.target.value)} required />
                <p className="text-xs text-peel-500">Sends sandbox money from your PayPal account right now (only for today), then records it here as an expense.</p>
                <Feedback error={act.error} notice={act.notice} />
              </>
            )}
          </div>
        )}
      </form>
    </li>
  )
}
