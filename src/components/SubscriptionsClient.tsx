'use client'

import { useState } from 'react'
import Link from 'next/link'
import { updateSubscriptionAction } from '@/app/(frontend)/actions'
import { prettyDay, rm } from '@/lib/dates'
import type { SubscriptionView } from '@/lib/types'
import { PageTitle, btnDanger, btnGhost, btnPrimary, card, Feedback, useAction } from './ui'

const palette: Record<string, string> = {
  Streaming: 'bg-banana-200 border-banana-500',
  Software: 'bg-leaf-100 border-leaf-500',
  Shopping: 'bg-berry-100 border-berry-500',
  Utilities: 'bg-sky-100 border-sky-500',
  Other: 'bg-violet-100 border-violet-500',
}

export function SubscriptionsClient({ subs }: { subs: SubscriptionView[] }) {
  const [id, setId] = useState<string | null>(null)
  const sel = subs.find((s) => s.id === id) ?? subs[0] ?? null
  const act = useAction()
  const active = subs.filter((s) => s.status === 'active')
  const cancelled = subs.filter((s) => s.status === 'cancelled')
  const total = active.reduce((a, s) => a + s.amount, 0)
  const cats = Object.keys(palette)
    .map((c) => ({ c, v: active.filter((s) => s.category === c).reduce((a, s) => a + s.amount, 0) }))
    .filter((x) => x.v > 0)

  const Row = ({ s, third }: { s: SubscriptionView; third: string }) => (
    <tr onClick={() => setId(s.id)} className={`cursor-pointer border-t border-banana-100 ${sel?.id === s.id ? 'bg-banana-200' : 'hover:bg-banana-50'}`}>
      <td className="px-3 py-2 font-bold">{s.name}</td>
      <td className="px-3 py-2">{s.category}</td>
      <td className="px-3 py-2">{third ? prettyDay(third) : '-'}</td>
      <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.status === 'active' ? 'bg-leaf-100 text-leaf-700' : 'bg-berry-100 text-berry-500'}`}>{s.status}</span></td>
    </tr>
  )
  const head = (third: string) => (
    <thead className="bg-banana-100 text-left text-sm"><tr><th className="px-3 py-2">App/Service</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">{third}</th><th className="px-3 py-2">Status</th></tr></thead>
  )

  return (
    <div>
      <PageTitle icon="renew" title="Subscriptions" sub="Everything that renews, in one place." />
      {subs.length === 0 && (
        <p className={`${card} mb-6 p-4`}>No subscriptions yet. <Link href="/paypal" className="font-bold underline">Sync PayPal</Link> to detect recurring payments.</p>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_24rem] gap-6">
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-xl font-extrabold">Active Subscriptions</h2>
            <div className={`${card} overflow-hidden`}><table className="w-full">{head('Renew Date')}<tbody>
              {active.map((s) => <Row key={s.id} s={s} third={s.renewDate} />)}
              {!active.length && <tr><td colSpan={4} className="px-3 py-4 text-sm text-peel-500">None active.</td></tr>}
            </tbody></table></div>
          </section>
          <section>
            <h2 className="mb-2 text-xl font-extrabold">Cancelled Subscriptions</h2>
            <div className={`${card} overflow-hidden`}><table className="w-full">{head('Termination Date')}<tbody>
              {cancelled.map((s) => <Row key={s.id} s={s} third={s.terminationDate} />)}
              {!cancelled.length && <tr><td colSpan={4} className="px-3 py-4 text-sm text-peel-500">None cancelled.</td></tr>}
            </tbody></table></div>
          </section>
        </div>

        <section className={`${card} h-fit overflow-hidden`}>
          <h2 className="border-b-2 border-banana-200 bg-banana-100 px-4 py-2 text-center font-extrabold">App / Service Info</h2>
          {sel ? <Info key={sel.id} sub={sel} act={act} /> : <p className="p-6 text-center text-sm text-peel-500">Select a subscription.</p>}
        </section>
      </div>

      <section className={`${card} mt-6 p-6`}>
        <h2 className="mb-3 text-2xl font-extrabold">Summary</h2>
        <div className="grid grid-cols-[18rem_minmax(0,1fr)] items-center gap-6">
          <div className="space-y-2">
            <p className="text-sm font-bold italic">You spend</p>
            {cats.map((x) => (
              <div key={x.c} className="flex gap-2">
                <span className={`flex-1 rounded-lg border-2 px-3 py-1 text-sm font-bold ${palette[x.c]}`}>{x.c}</span>
                <span className="w-16 rounded-lg border-2 border-peel-900 bg-white px-2 py-1 text-center text-sm font-bold">{Math.round((x.v / total) * 100)}%</span>
              </div>
            ))}
            {!cats.length && <p className="text-sm text-peel-500">No active spend.</p>}
          </div>
          <div>
            <div className="flex h-12 overflow-hidden rounded-xl border-2 border-peel-900">
              {cats.map((x) => <div key={x.c} className={`${palette[x.c]} border-r-2`} style={{ width: `${(x.v / total) * 100}%` }} title={`${x.c}: ${rm(x.v)}`} />)}
            </div>
            <p className="mt-3 text-xl font-extrabold">Total: {rm(total)} <span className="text-sm font-semibold text-peel-700">per cycle</span></p>
          </div>
        </div>
      </section>
    </div>
  )
}

function Info({ sub, act }: { sub: SubscriptionView; act: ReturnType<typeof useAction> }) {
  const [tag, setTag] = useState(sub.tag)
  const [note, setNote] = useState(sub.note)
  return (
    <div className="space-y-4 p-5">
      <div className="mx-auto grid size-24 place-items-center rounded-2xl border-2 border-peel-900 bg-banana-300 text-4xl font-extrabold shadow-[4px_4px_0_0_var(--color-peel-900)]">
        {sub.name.slice(0, 1).toUpperCase()}
      </div>
      <p className="text-center text-lg font-extrabold">{sub.name} <span className="font-semibold text-peel-700">{rm(sub.amount)}</span></p>
      <label className="flex items-center gap-2 font-extrabold">Tag: <input className="min-w-0 flex-1 font-normal" maxLength={40} value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. family plan" /></label>
      <textarea className="h-20 w-full resize-none" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notes" />
      <Feedback error={act.error} />
      <div className="flex gap-2">
        <button className={btnPrimary} disabled={act.pending} onClick={() => act.run(() => updateSubscriptionAction(sub.id, { tag, note }))}>Save</button>
        {sub.status === 'active' ? (
          <button className={btnDanger} disabled={act.pending} onClick={() => act.run(() => updateSubscriptionAction(sub.id, { status: 'cancelled' }))}>Mark cancelled</button>
        ) : (
          <button className={btnGhost} disabled={act.pending} onClick={() => act.run(() => updateSubscriptionAction(sub.id, { status: 'active' }))}>Reactivate</button>
        )}
      </div>
    </div>
  )
}
