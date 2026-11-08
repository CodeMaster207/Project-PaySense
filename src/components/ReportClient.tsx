'use client'

import Link from 'next/link'
import { useState } from 'react'
import { monthSummaryAction } from '@/app/(frontend)/actions'
import { rm } from '@/lib/dates'
import { type MonthReport, type Share, toCsv } from '@/lib/report'
import { Icon } from './Icon'
import { AiNote, btnGhost, btnPrimary, card, Feedback, PageTitle, useAction } from './ui'

function Line({ label, value, tone, strong, indent }: { label: string; value: string; tone?: string; strong?: boolean; indent?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 px-4 py-2 ${strong ? 'bg-banana-100 font-extrabold' : ''} ${indent ? 'pl-8 text-sm text-peel-700' : ''}`}>
      <span>{label}</span>
      <span className={`${tone ?? ''} ${strong ? 'text-lg' : 'font-bold'}`}>{value}</span>
    </div>
  )
}

function Bars({ items, empty, tone }: { items: Share[]; empty: string; tone: string }) {
  if (!items.length) return <p className="text-sm text-peel-500">{empty}</p>
  return (
    <ul className="space-y-2">
      {items.map((c) => (
        <li key={c.name}>
          <div className="flex justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold">{c.name}</span>
            <span className="shrink-0 text-peel-700">{rm(c.amount)} · {Math.round(c.share * 100)}%</span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-banana-100">
            <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(2, Math.round(c.share * 100))}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function ReportClient({ report: r, prevHref, nextHref }: { report: MonthReport; prevHref: string; nextHref: string | null }) {
  const act = useAction()
  const [summary, setSummary] = useState<{ text: string; ai: boolean } | null>(null)
  const label = new Date(`${r.month}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const money = (n: number) => `${n < 0 ? '-' : ''}${rm(Math.abs(n))}`
  const change = r.prev ? r.netProfit - r.prev.netProfit : null
  const empty = r.rows.length === 0

  function download() {
    const url = URL.createObjectURL(new Blob([toCsv(r)], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `paysense-profit-and-loss-${r.month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-3xl">
      <PageTitle icon="print" title="Reports" sub="Monthly profit and loss, ready to print or send to your accountant." />

      <AiNote className="no-print -mt-3 mb-4">
        <p>Every figure in this report is calculated by the app from your PayPal and recorded transactions. The AI never does the sums.</p>
        <p><b>Explain this month</b> sends the finished figures to the AI, which writes two or three plain sentences about them: what changed since last month, what PayPal fees cost, and one thing to watch. It is told to use only the numbers given. Without an AI account, a fixed sentence built from the same figures is shown instead.</p>
        <p>Goal funding is savings, not an expense, so it is left out. Active subscriptions are counted once, in the current month only, as an estimate.</p>
      </AiNote>

      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border-2 border-banana-300 bg-white">
          <Link href={prevHref} aria-label="Previous month" className="grid size-9 place-items-center rounded-lg hover:bg-banana-100"><Icon name="left" /></Link>
          <span className="min-w-36 px-2 text-center font-extrabold">{label}</span>
          {nextHref ? (
            <Link href={nextHref} aria-label="Next month" className="grid size-9 place-items-center rounded-lg hover:bg-banana-100"><Icon name="right" /></Link>
          ) : (
            <span aria-hidden className="grid size-9 place-items-center rounded-lg opacity-30"><Icon name="right" /></span>
          )}
        </div>
        <button type="button" className={btnGhost} onClick={() => window.print()}><Icon name="print" /> Print</button>
        <button type="button" className={btnGhost} disabled={empty} onClick={download}><Icon name="print" /> Export CSV</button>
        <button type="button" className={btnPrimary} disabled={act.pending || empty} onClick={() => act.run(() => monthSummaryAction(r.month), (res) => setSummary(res.data ?? null))}>
          <Icon name="sparkle" /> {act.pending ? 'Writing...' : 'Explain this month'}
        </button>
      </div>
      <Feedback error={act.error} />

      <h2 className="mb-2 hidden text-xl font-extrabold print:block">PaySense profit and loss: {label}</h2>

      {summary && (
        <p className="mb-4 rounded-xl border-2 border-banana-300 bg-banana-50 px-4 py-3 text-sm text-peel-900">
          <span className="mr-2 rounded-full bg-banana-200 px-2 py-0.5 text-xs font-bold">{summary.ai ? 'AI summary' : 'Summary'}</span>
          {summary.text}
        </p>
      )}

      {empty ? (
        <p className={`${card} p-8 text-center text-peel-700`}>No transactions in {label}. Pick another month, or sync PayPal first.</p>
      ) : (
        <>
          <section className={`${card} overflow-hidden`} aria-label={`Profit and loss for ${label}`}>
            <h2 className="border-b-2 border-banana-200 bg-banana-100 px-4 py-2 font-extrabold">Profit and loss, {label}</h2>
            <Line label="Revenue (money received)" value={money(r.revenue)} tone="text-leaf-700" />
            <Line label="PayPal fees" value={`-${rm(r.fees)}`} tone="text-berry-500" indent />
            <Line label="Net revenue" value={money(r.netRevenue)} />
            <Line label="Expenses" value={`-${rm(r.expenses)}`} tone="text-berry-500" />
            {r.subscriptions > 0 && <Line label="Subscriptions (estimate, active)" value={`-${rm(r.subscriptions)}`} tone="text-berry-500" indent />}
            <Line label={r.netProfit < 0 ? 'Net loss' : 'Net profit'} value={money(r.netProfit)} tone={r.netProfit < 0 ? 'text-berry-500' : 'text-leaf-700'} strong />
          </section>

          {change !== null && r.prev && (
            <p className="mt-2 text-sm text-peel-700">
              Compared with last month&apos;s {money(r.prev.netProfit)}: <b className={change >= 0 ? 'text-leaf-700' : 'text-berry-500'}>{change >= 0 ? '+' : '-'}{rm(Math.abs(change))}</b>.
            </p>
          )}

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <section className={`${card} p-4`}>
              <h2 className="mb-3 font-extrabold">Where the money came from</h2>
              <Bars items={r.clients} empty="No income this month." tone="bg-leaf-500" />
            </section>
            <section className={`${card} p-4`}>
              <h2 className="mb-3 font-extrabold">Biggest expenses</h2>
              <Bars items={r.expenseItems} empty="No expenses this month." tone="bg-berry-500" />
            </section>
          </div>
        </>
      )}
    </div>
  )
}
