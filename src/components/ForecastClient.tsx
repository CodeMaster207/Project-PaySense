'use client'

import { useId, useState } from 'react'
import { forecastAdviceAction } from '@/app/(frontend)/actions'
import { prettyDay, rm } from '@/lib/dates'
import type { Forecast, ForecastEvent } from '@/lib/forecast'
import { Icon } from './Icon'
import { AiNote, btnPrimary, card, Feedback, PageTitle, useAction } from './ui'

const KIND: Record<ForecastEvent['kind'], { label: string; badge: string }> = {
  job: { label: 'Pay', badge: 'bg-leaf-100 text-leaf-700' },
  invoice: { label: 'Invoice', badge: 'bg-sky-100 text-sky-700' },
  subscription: { label: 'Subscription', badge: 'bg-banana-200 text-peel-900' },
  goal: { label: 'Goal', badge: 'bg-banana-100 text-peel-700' },
  scheduled: { label: 'Scheduled', badge: 'bg-violet-100 text-violet-700' },
}

const money = (n: number) => `${n < 0 ? '-' : ''}${rm(Math.abs(n))}`

function Chart({ series, lowest }: { series: { date: string; balance: number }[]; lowest: { date: string; balance: number } }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const W = 600
  const H = 190
  const pad = { l: 8, r: 8, t: 14, b: 22 }
  const max = Math.max(0, ...series.map((p) => p.balance))
  const min = Math.min(0, ...series.map((p) => p.balance))
  const span = max - min || 1
  const x = (i: number) => pad.l + (i / (series.length - 1)) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + ((max - v) / span) * (H - pad.t - pad.b)
  const line = series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`).join(' ')
  const area = `${line} L${x(series.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`
  const li = series.findIndex((p) => p.date === lowest.date)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Projected balance over ${series.length - 1} days. Lowest point ${money(lowest.balance)} on ${prettyDay(lowest.date)}.`}>
      <defs>
        <clipPath id={`${id}-up`}><rect x="0" y="0" width={W} height={Math.max(0, y(0))} /></clipPath>
        <clipPath id={`${id}-down`}><rect x="0" y={y(0)} width={W} height={Math.max(0, H - y(0))} /></clipPath>
      </defs>
      <path d={area} fill="#7f9a22" opacity="0.22" clipPath={`url(#${id}-up)`} />
      <path d={area} fill="#d9544a" opacity="0.28" clipPath={`url(#${id}-down)`} />
      <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="#a47c00" strokeWidth="1" strokeDasharray="4 4" />
      <path d={line} fill="none" stroke="#33270a" strokeWidth="2" strokeLinejoin="round" />
      {li >= 0 && <circle cx={x(li)} cy={y(lowest.balance)} r="4.5" fill={lowest.balance < 0 ? '#d9544a' : '#33270a'} stroke="#fff" strokeWidth="1.5" />}
      <text x={pad.l} y={H - 5} fontSize="11" fill="#6e5200">{prettyDay(series[0].date)}</text>
      <text x={W / 2} y={H - 5} fontSize="11" fill="#6e5200" textAnchor="middle">{prettyDay(series[Math.floor(series.length / 2)].date)}</text>
      <text x={W - pad.r} y={H - 5} fontSize="11" fill="#6e5200" textAnchor="end">{prettyDay(series[series.length - 1].date)}</text>
    </svg>
  )
}

export function ForecastClient({ forecast: f }: { forecast: Forecast }) {
  const [withInvoices, setWithInvoices] = useState(true)
  const act = useAction()
  const [advice, setAdvice] = useState<{ text: string; ai: boolean } | null>(null)
  const s = withInvoices ? f.withInvoices : f.withoutInvoices
  const invoices = f.events.filter((e) => e.kind === 'invoice')
  const events = f.events.filter((e) => withInvoices || e.kind !== 'invoice')
  const low = s.lowest.balance < 0

  return (
    <div className="max-w-3xl">
      <PageTitle icon="chart" title="Cash-flow forecast" sub={`Where your balance is heading over the next ${f.days} days.`} />

      <AiNote>
        <p>The projection is calculated by the app, not by AI. It starts from your recorded balance, applies the things it knows about on their dates (job pay, subscription renewals, goal funding, pending invoices and any entries you dated in the future), and takes your typical day-to-day spending off every day.</p>
        <p><b>Explain this forecast</b> sends the finished figures to the AI, which writes two or three plain sentences and one concrete action, such as chasing a named invoice or pausing a named subscription. It is told to use only the numbers given. Without an AI account, a fixed sentence from the same figures is shown.</p>
      </AiNote>

      <p
        role="status"
        className={`mb-4 rounded-xl px-4 py-3 font-extrabold text-white ${s.firstNegative ? 'bg-red-500' : 'bg-green-500'}`}
      >
        {s.firstNegative
          ? `Your balance may drop below zero on ${prettyDay(s.firstNegative)}, reaching ${money(s.lowest.balance)} on ${prettyDay(s.lowest.date)}.`
          : `You stay above zero for the next ${f.days} days. Your lowest point is ${money(s.lowest.balance)} on ${prettyDay(s.lowest.date)}.`}
      </p>

      <section className={`${card} p-5`}>
        <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <div className="rounded-xl bg-banana-50 p-3"><p className="text-xs font-bold text-peel-700">Today</p><p className="text-lg font-extrabold">{money(f.start)}</p></div>
          <div className="rounded-xl bg-banana-50 p-3"><p className="text-xs font-bold text-peel-700">In 30 days</p><p className={`text-lg font-extrabold ${s.at30 < 0 ? 'text-berry-500' : ''}`}>{money(s.at30)}</p></div>
          <div className="rounded-xl bg-banana-50 p-3"><p className="text-xs font-bold text-peel-700">In {f.days} days</p><p className={`text-lg font-extrabold ${s.end < 0 ? 'text-berry-500' : ''}`}>{money(s.end)}</p></div>
          <div className={`rounded-xl p-3 ${low ? 'bg-berry-100' : 'bg-banana-50'}`}><p className="text-xs font-bold text-peel-700">Lowest point</p><p className={`text-lg font-extrabold ${low ? 'text-berry-500' : ''}`}>{money(s.lowest.balance)}</p></div>
        </div>
        <div className="mt-4"><Chart series={s.series} lowest={s.lowest} /></div>
        <label className={`mt-3 flex items-center gap-2 text-sm font-semibold ${invoices.length ? '' : 'opacity-60'}`}>
          <input type="checkbox" className="size-4 accent-[var(--color-banana-500)]" checked={withInvoices} disabled={!invoices.length} onChange={(e) => setWithInvoices(e.target.checked)} />
          Count pending invoices as paid on their due date ({invoices.length} pending{invoices.length ? `, ${rm(invoices.reduce((a, e) => a + e.amount, 0))}` : ''})
        </label>
      </section>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className={btnPrimary} disabled={act.pending} onClick={() => act.run(() => forecastAdviceAction(), (r) => setAdvice(r.data ?? null))}>
          <Icon name="sparkle" /> {act.pending ? 'Writing...' : 'Explain this forecast'}
        </button>
        <Feedback error={act.error} />
      </div>
      {advice && (
        <p className="mt-3 rounded-xl border-2 border-banana-300 bg-banana-50 px-4 py-3 text-sm text-peel-900">
          <span className="mr-2 rounded-full bg-banana-200 px-2 py-0.5 text-xs font-bold">{advice.ai ? 'AI advice' : 'Summary'}</span>
          {advice.text}
        </p>
      )}

      <section className={`${card} mt-6 overflow-hidden`}>
        <h2 className="border-b-2 border-banana-200 bg-banana-100 px-4 py-2 font-extrabold">Coming up</h2>
        {events.length === 0 && <p className="px-4 py-4 text-sm text-peel-500">Nothing is scheduled in the next {f.days} days.</p>}
        <ul className="divide-y divide-banana-100">
          {events.slice(0, 12).map((e, i) => (
            <li key={`${e.date}-${i}`} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <span className="w-28 text-sm text-peel-700">{prettyDay(e.date)}</span>
              <span className="min-w-0 flex-1 font-semibold">{e.label}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${KIND[e.kind].badge}`}>{KIND[e.kind].label}</span>
              <span className={`font-bold ${e.amount < 0 ? 'text-berry-500' : 'text-leaf-700'}`}>{e.amount < 0 ? '-' : '+'}{rm(Math.abs(e.amount))}</span>
            </li>
          ))}
        </ul>
        {events.length > 12 && <p className="px-4 py-2 text-xs text-peel-500">and {events.length - 12} more after these.</p>}
      </section>

      <p className="mt-4 text-xs text-peel-500">
        Typical day-to-day spending is {rm(f.dailySpend)} a day, the average of your ordinary expenses over the last 60 days. No new income is assumed beyond job pay and pending invoices, so this leans cautious. Subscriptions are assumed to renew every 30 days.
      </p>
    </div>
  )
}
