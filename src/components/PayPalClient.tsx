'use client'

import { useState } from 'react'
import { connectPayPalAction, syncPayPalAction } from '@/app/(frontend)/actions'
import { prettyDay, rm } from '@/lib/dates'
import type { EntryView, SubscriptionView } from '@/lib/types'
import { DatePicker } from './DatePicker'
import { Icon } from './Icon'
import { btnGhost, btnPrimary, card, Feedback, PageTitle, useAction } from './ui'

type Type = 'all' | 'incomes' | 'expenses' | 'goals'
type Row = { key: string; date: string; business: string; amount: number; group: 'incomes' | 'expenses' | 'goals'; tag: string; txnId: string; original: string }

const fmtOriginal = (cur?: string, amt?: number) =>
  cur && amt != null && cur !== 'MYR' ? `${cur} ${amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''

const TYPES: { id: Type; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'incomes', label: 'Incomes' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'goals', label: 'Goal funds' },
]

export function PayPalClient({
  connected,
  lastSync,
  mode,
  accountCurrency,
  entries,
  subs,
  goalFunds,
}: {
  connected: boolean
  lastSync: string | null
  mode: 'sandbox' | 'unconfigured'
  accountCurrency: string | null
  entries: EntryView[]
  subs: SubscriptionView[]
  goalFunds: EntryView[]
}) {
  const [type, setType] = useState<Type>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const act = useAction()

  const rows: Row[] = [
    ...entries.filter((e) => e.source === 'paypal').map((e): Row => ({ key: `entry-${e.id}`, date: e.date, business: e.description, amount: e.type === 'income' ? e.amount : -e.amount, group: e.type === 'income' ? 'incomes' : 'expenses', tag: e.type === 'income' ? 'income' : 'expense', txnId: e.externalId ?? '', original: fmtOriginal(e.originalCurrency, e.originalAmount) })),
    ...subs.map((s): Row => ({ key: `sub-${s.id}`, date: s.status === 'active' ? s.renewDate : s.terminationDate, business: s.name, amount: -s.amount, group: 'expenses', tag: 'expense', txnId: s.paypalTransactionId, original: fmtOriginal(s.originalCurrency, s.originalAmount) })),
    ...goalFunds.map((e): Row => ({ key: `goal-${e.id}`, date: e.date, business: e.description.replace(/^Goal: /, ''), amount: -e.amount, group: 'goals', tag: 'goal fund', txnId: '', original: '' })),
  ]
    .filter((r) => (type === 'all' || type === r.group) && (!from || r.date >= from) && (!to || r.date <= to))
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="max-w-5xl">
      <PageTitle icon="wallet" title="PayPal Integration" sub={mode === 'sandbox' ? 'Reads transactions from the PayPal sandbox.' : 'Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env.local to read PayPal sandbox transactions.'} />
      <section className={`${card} mb-6 flex flex-wrap items-center gap-4 p-5`}>
        <span className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 font-bold ${connected ? 'border-leaf-500 bg-leaf-100 text-leaf-700' : 'border-berry-500 bg-berry-100 text-berry-500'}`}>
          {connected && <Icon name="check" className="size-4" />}
          Status: {connected ? 'Successfully Connected' : 'Not connected'}
        </span>
        {lastSync && <span className="text-sm text-peel-700">Last sync {new Date(lastSync).toLocaleString('en-GB')}</span>}
        {accountCurrency && (
          <span className="text-sm text-peel-700">
            PayPal account currency: <b>{accountCurrency}</b>{accountCurrency === 'MYR' ? '' : ', converted to RM on import'}
          </span>
        )}
        {!connected && (
          <button className={btnPrimary} disabled={act.pending} onClick={() => act.run(() => connectPayPalAction())}>
            <Icon name="wallet" /> Connect PayPal sandbox
          </button>
        )}
        <p className="basis-full text-sm text-peel-700">
          Authentication uses your PayPal developer app credentials on the server. Your PayPal email and password are never entered or stored here.
        </p>
        <details className="basis-full rounded-xl border-2 border-banana-200 bg-banana-50 px-4 py-2 text-sm text-peel-700">
          <summary className="cursor-pointer font-bold text-peel-900">How is AI used on this page?</summary>
          <p className="mt-2">Most of the AI here does not write text. It reads your PayPal data and makes decisions about it:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><b>Classifying payments.</b> On each sync, new transactions are sent to the AI, which decides whether money going out is a recurring subscription or a one-off expense, and files each subscription under a category (Streaming, Software, Shopping, Utilities or Other). It can only answer with those fixed options, and money coming in is always kept as income.</li>
            <li><b>Matching records.</b> When you add a subscription by hand and click it, the AI compares its name and amount with your unlinked PayPal transactions and picks the most likely one, or none if nothing fits. You confirm before anything is linked.</li>
            <li><b>Answering questions.</b> The Personal AI chat and goal planner use the same imported PayPal transactions as context, so their advice reflects what you actually spent.</li>
          </ul>
          <p className="mt-2">AI needs an account you connect on the AI Insights page (OpenAI, Claude or Gemini). Without one, the same classification and matching run on simple built-in rules (merchant keywords and amounts), so the page still works, just with less accuracy.</p>
        </details>
        <details className="basis-full rounded-xl border-2 border-banana-200 bg-banana-50 px-4 py-2 text-sm text-peel-700">
          <summary className="cursor-pointer font-bold text-peel-900">Why can a sync take longer, or miss a new transaction?</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>PayPal&apos;s Transaction Search can take up to a few hours before a new sandbox payment becomes visible, so a payment you just made may not appear yet. Resync later and it will be imported.</li>
            <li>Each sync reads the last 90 days in several requests, because PayPal limits one request to 31 days.</li>
            <li>When an AI account is connected, new transactions are also sent to the AI to be categorised, which adds a few seconds.</li>
            <li>The first sync imports everything at once. Later syncs only add transactions that are new.</li>
          </ul>
        </details>
      </section>

      <div className="grid grid-cols-[auto_1fr] gap-x-10 gap-y-4">
        <div>
          <p className="mb-1 font-extrabold">Type:</p>
          <div role="group" aria-label="Filter by type" className="flex flex-wrap overflow-hidden rounded-xl border-2 border-banana-300 text-sm font-bold">
            {TYPES.map((t) => (
              <button key={t.id} type="button" aria-pressed={type === t.id} onClick={() => setType(t.id)} className={`px-3 py-1.5 ${type === t.id ? 'bg-banana-300' : 'bg-white hover:bg-banana-100'}`}>{t.label}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 font-extrabold">Date Range:</p>
          <div className="flex items-center gap-2">
            <div className="w-48"><DatePicker clearable ariaLabel="From" placeholder="Any date" max={to || undefined} value={from} onChange={setFrom} /></div>
            <span>to</span>
            <div className="w-48"><DatePicker clearable ariaLabel="To" placeholder="Any date" min={from || undefined} value={to} onChange={setTo} /></div>
          </div>
        </div>
      </div>

      <section className={`${card} mt-6 overflow-hidden`}>
        <table className="w-full">
          <thead className="bg-banana-100 text-left"><tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Business</th><th className="px-4 py-2">Transaction ID</th><th className="px-4 py-2 text-right">Amount</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}className="border-t border-banana-100">
                <td className="px-4 py-2">{r.date ? prettyDay(r.date) : '-'}</td>
                <td className="px-4 py-2 font-semibold">{r.business} <span className="ml-1 rounded-full bg-banana-100 px-2 text-xs">{r.tag}</span></td>
                <td className="px-4 py-2 font-mono text-xs text-peel-700">{r.txnId || '-'}</td>
                <td className={`px-4 py-2 text-right font-bold ${r.amount < 0 ? 'text-berry-500' : 'text-leaf-700'}`}>{r.amount < 0 ? '-' : '+'}{rm(Math.abs(r.amount))}{r.original && <span className="block text-xs font-semibold text-peel-500">{r.original}</span>}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-peel-500">No PayPal records yet. Press Resync to import.</td></tr>}
          </tbody>
        </table>
      </section>

      <div className="no-print mt-4 flex items-center justify-end gap-3">
        <Feedback error={act.error} notice={act.notice} />
        <button className={btnGhost} onClick={() => window.print()}><Icon name="print" /> Print Record</button>
        <button className={btnPrimary} disabled={act.pending} onClick={() => act.run(() => syncPayPalAction())}>
          <Icon name="sync" /> {act.pending ? 'Syncing...' : 'Resync'}
        </button>
      </div>
    </div>
  )
}
