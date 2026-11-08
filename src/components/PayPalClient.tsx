'use client'

import { useState } from 'react'
import { connectPayPalAction, syncPayPalAction } from '@/app/(frontend)/actions'
import { prettyDay, rm } from '@/lib/dates'
import type { EntryView, SubscriptionView } from '@/lib/types'
import { DatePicker } from './DatePicker'
import { Icon } from './Icon'
import { btnGhost, btnPrimary, card, Feedback, PageTitle, useAction } from './ui'

type F = 'active' | 'cancelled' | 'all'
type Row = { key: string; date: string; business: string; amount: number; group: 'incomes' | 'expenses' | 'subscriptions'; status: F }

export function PayPalClient({
  connected,
  lastSync,
  mode,
  entries,
  subs,
}: {
  connected: boolean
  lastSync: string | null
  mode: 'sandbox' | 'demo'
  entries: EntryView[]
  subs: SubscriptionView[]
}) {
  const [filters, setFilters] = useState<Record<Row['group'], F>>({ incomes: 'all', expenses: 'all', subscriptions: 'all' })
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const act = useAction()

  const rows: Row[] = [
    ...entries.filter((e) => e.source === 'paypal').map((e): Row => ({ key: e.id, date: e.date, business: e.description, amount: e.type === 'income' ? e.amount : -e.amount, group: e.type === 'income' ? 'incomes' : 'expenses', status: 'active' })),
    ...subs.map((s): Row => ({ key: s.id, date: s.status === 'active' ? s.renewDate : s.terminationDate, business: s.name, amount: -s.amount, group: 'subscriptions', status: s.status })),
  ]
    .filter((r) => (filters[r.group] === 'all' || filters[r.group] === r.status) && (!from || r.date >= from) && (!to || r.date <= to))
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="max-w-5xl">
      <PageTitle icon="wallet" title="PayPal Integration" sub={`Reads transactions from the PayPal ${mode === 'sandbox' ? 'sandbox' : 'sandbox (demo data, add API keys for live sandbox)'}.`} />
      <section className={`${card} mb-6 flex flex-wrap items-center gap-4 p-5`}>
        <span className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2 font-bold ${connected ? 'border-leaf-500 bg-leaf-100 text-leaf-700' : 'border-berry-500 bg-berry-100 text-berry-500'}`}>
          {connected && <Icon name="check" className="size-4" />}
          Status: {connected ? 'Successfully Connected' : 'Not connected'}
        </span>
        {lastSync && <span className="text-sm text-peel-700">Last sync {new Date(lastSync).toLocaleString('en-GB')}</span>}
        {!connected && (
          <button className={btnPrimary} disabled={act.pending} onClick={() => act.run(() => connectPayPalAction())}>
            <Icon name="wallet" /> Connect PayPal sandbox
          </button>
        )}
        <p className="basis-full text-sm text-peel-700">
          Authentication uses your PayPal developer app credentials on the server. Your PayPal email and password are never entered or stored here.
        </p>
      </section>

      <div className="grid grid-cols-[auto_1fr] gap-x-10 gap-y-4">
        <div className="space-y-2">
          {(['incomes', 'expenses', 'subscriptions'] as const).map((g) => (
            <div key={g} className="flex items-center gap-3">
              <span className="w-28 font-extrabold capitalize">{g}</span>
              <div className="flex overflow-hidden rounded-xl border-2 border-banana-300 text-sm font-bold">
                {(['active', 'cancelled', 'all'] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setFilters({ ...filters, [g]: f })} className={`px-3 py-1.5 capitalize ${filters[g] === f ? 'bg-banana-300' : 'bg-white hover:bg-banana-100'}`}>{f}</button>
                ))}
              </div>
            </div>
          ))}
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
          <thead className="bg-banana-100 text-left"><tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Business</th><th className="px-4 py-2 text-right">Amount</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.group + r.key} className="border-t border-banana-100">
                <td className="px-4 py-2">{r.date ? prettyDay(r.date) : '-'}</td>
                <td className="px-4 py-2 font-semibold">{r.business} <span className="ml-1 rounded-full bg-banana-100 px-2 text-xs">{r.group === 'subscriptions' ? `subscription, ${r.status}` : r.group.slice(0, -1)}</span></td>
                <td className={`px-4 py-2 text-right font-bold ${r.amount < 0 ? 'text-berry-500' : 'text-leaf-700'}`}>{r.amount < 0 ? '-' : '+'}{rm(Math.abs(r.amount))}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={3} className="px-4 py-8 text-center text-peel-500">No PayPal records yet. Press Resync to import.</td></tr>}
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
