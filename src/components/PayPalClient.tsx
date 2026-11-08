'use client'

import { useRef, useState } from 'react'
import type { GridApi } from 'ag-grid-community'
import { connectPayPalAction, deleteForeignPayPalRecordsAction, syncPayPalAction } from '@/app/(frontend)/actions'
import { prettyDay, rm } from '@/lib/dates'
import { currentCode } from '@/lib/money'
import type { EntryView, SubscriptionView } from '@/lib/types'
import { DatePicker } from './DatePicker'
import { GridCaption } from './grid/GridCaption'
import { PayPalGrid } from './grid/PayPalGrid'
import { Icon } from './Icon'
import { btnDanger, btnGhost, btnPrimary, card, Feedback, PageTitle, useAction } from './ui'

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
  accountId,
  foreign,
  unchecked,
  entries,
  subs,
  goalFunds,
}: {
  connected: boolean
  lastSync: string | null
  mode: 'sandbox' | 'unconfigured'
  accountCurrency: string | null
  accountId: string | null
  foreign: { name: string; amount: number; date: string }[]
  unchecked: number
  entries: EntryView[]
  subs: SubscriptionView[]
  goalFunds: EntryView[]
}) {
  const [type, setType] = useState<Type>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [printing, setPrinting] = useState(false)
  const [keepForeign, setKeepForeign] = useState(false)
  const del = useAction()
  const gridApi = useRef<GridApi | null>(null)
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
        {accountId && (
          <span className="text-sm text-peel-700" title="PayPal does not share the account email with this kind of connection, so the account ID identifies it.">
            Connected PayPal account ID: <b className="font-mono">{accountId}</b>
          </span>
        )}
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

      {foreign.length > 0 && !keepForeign && (
        <section role="alert" className="mb-6 rounded-2xl border-2 border-berry-500 bg-berry-100 p-5">
          <h2 className="text-lg font-extrabold text-berry-500">
            {foreign.length} record{foreign.length === 1 ? '' : 's'} came from a different PayPal account
          </h2>
          <p className="mt-1 text-sm text-peel-700">
            The connected account is <b className="font-mono">{accountId}</b>. These records were imported from another account, so they are mixed into your totals.
            Do you want to delete them?
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {foreign.slice(0, 5).map((f, i) => (
              <li key={i} className="flex justify-between gap-3 rounded-lg bg-white px-3 py-1.5">
                <span className="min-w-0 truncate font-semibold">{f.name}</span>
                <span className="shrink-0 text-peel-700">{f.date ? prettyDay(f.date) : ''} · {rm(f.amount)}</span>
              </li>
            ))}
            {foreign.length > 5 && <li className="px-1 text-peel-700">and {foreign.length - 5} more</li>}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button className={btnDanger} disabled={del.pending} onClick={() => del.run(() => deleteForeignPayPalRecordsAction())}>
              {del.pending ? 'Deleting...' : `Yes, delete ${foreign.length} record${foreign.length === 1 ? '' : 's'}`}
            </button>
            <button className={btnGhost} disabled={del.pending} onClick={() => setKeepForeign(true)}>No, keep them</button>
            <Feedback error={del.error} notice={del.notice} />
          </div>
        </section>
      )}
      {unchecked > 0 && foreign.length === 0 && (
        <p className="mb-6 rounded-xl border-2 border-banana-300 bg-banana-50 px-4 py-2 text-sm text-peel-700">
          {unchecked} older record{unchecked === 1 ? ' has' : 's have'} not been checked against this PayPal account yet. Press <b>Resync</b> to check them.
        </p>
      )}

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

      <div className="no-print mt-6 flex flex-wrap items-center gap-3">
        <input
          type="search"
          aria-label="Search transactions"
          placeholder="Search business, ID or amount..."
          className="min-w-0 flex-1 sm:max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className={btnGhost} onClick={() => gridApi.current?.exportDataAsCsv({ fileName: 'paysense-paypal-transactions.csv' })}>
          <Icon name="print" /> Export CSV
        </button>
        <span className="text-sm text-peel-500">{rows.length} record{rows.length === 1 ? '' : 's'}. Click a column header to sort, or use its menu to filter.</span>
      </div>

      <section className={`${card} mt-3 overflow-hidden`}>
        <PayPalGrid key={currentCode()} rows={rows} search={search} printing={printing} onReady={(api) => (gridApi.current = api)} />
      </section>
      <GridCaption>Click a column header to sort, open its menu to filter, or use the search box above. Export CSV saves the rows currently shown.</GridCaption>

      <div className="no-print mt-4 flex items-center justify-end gap-3">
        <Feedback error={act.error} notice={act.notice} />
        <button
          className={btnGhost}
          onClick={() => {
            setPrinting(true)
            setTimeout(() => {
              window.print()
              setPrinting(false)
            }, 400)
          }}
        >
          <Icon name="print" /> Print Record
        </button>
        <button className={btnPrimary} disabled={act.pending} onClick={() => act.run(() => syncPayPalAction())}>
          <Icon name="sync" /> {act.pending ? 'Syncing...' : 'Resync'}
        </button>
      </div>
    </div>
  )
}
