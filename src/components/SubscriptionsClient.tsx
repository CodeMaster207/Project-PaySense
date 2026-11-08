'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createSubscriptionAction, linkSubscriptionAction, suggestPayPalMatchAction, updateSubscriptionAction } from '@/app/(frontend)/actions'
import { prettyDay, rm, today } from '@/lib/dates'
import type { PayPalMatch, SubscriptionView } from '@/lib/types'
import { Icon } from './Icon'
import { AiNote, PageTitle, btnDanger, btnGhost, btnPrimary, card, Feedback, useAction } from './ui'

const palette: Record<string, string> = {
  Streaming: 'bg-banana-200 border-banana-500',
  Software: 'bg-leaf-100 border-leaf-500',
  Shopping: 'bg-berry-100 border-berry-500',
  Utilities: 'bg-sky-100 border-sky-500',
  Other: 'bg-violet-100 border-violet-500',
}

const CATEGORIES = ['Streaming', 'Software', 'Shopping', 'Utilities', 'Other'] as const

type Suggestion = { status: 'loading' } | { status: 'done'; match: PayPalMatch | null; note: string } | { status: 'error'; error: string }

/** Always-visible card: click a subscription and the AI suggests which PayPal transaction it belongs to. */
function LinkSuggestion({ sub }: { sub: SubscriptionView | null }) {
  const [s, setS] = useState<Suggestion>({ status: 'loading' })
  const [dismissed, setDismissed] = useState<string | null>(null)
  const link = useAction()
  const subId = sub?.id ?? null
  const needsSearch = Boolean(sub && !sub.linked)
  useEffect(() => {
    if (!subId || !needsSearch) return
    let live = true
    setS({ status: 'loading' })
    suggestPayPalMatchAction(subId)
      .then((r) => live && setS(r.ok ? { status: 'done', match: r.data?.match ?? null, note: r.data?.note ?? '' } : { status: 'error', error: r.error }))
      .catch(() => live && setS({ status: 'error', error: 'Could not search the PayPal sandbox.' }))
    return () => {
      live = false
    }
  }, [subId, needsSearch])

  const match = s.status === 'done' && dismissed !== subId ? s.match : null
  return (
    <section className={`${card} mb-6 p-5`}>
      <h2 className="mb-2 flex items-center gap-2 text-lg font-extrabold">
        <Icon name="wallet" className="size-5" /> PayPal link{sub ? `: ${sub.name}` : ''}
      </h2>
      {!sub && <p className="text-sm text-peel-700">Click a subscription below and the AI will suggest which PayPal transaction it belongs to.</p>}
      {sub?.linked && (
        <div className="space-y-2 text-sm text-peel-700">
          <p>
            <span className="mr-2 rounded-full bg-leaf-100 px-2 py-0.5 text-xs font-bold text-leaf-700">Linked</span>
            This subscription is linked to a PayPal transaction.{sub.paypalCancellable ? ' Cancelling it here will also cancel it in PayPal.' : ''}
          </p>
          <p className="rounded-xl border-2 border-banana-300 bg-banana-50 px-4 py-2">
            <span className="font-bold text-peel-900">PayPal transaction ID:</span>{' '}
            <span className="break-all font-mono">{sub.paypalTransactionId}</span>
          </p>
        </div>
      )}
      {sub && !sub.linked && s.status === 'loading' && <p className="text-sm text-peel-700">Searching the PayPal sandbox…</p>}
      {sub && !sub.linked && s.status === 'error' && <p className="text-sm font-semibold text-berry-500">{s.error}</p>}
      {sub && !sub.linked && s.status === 'done' && !match && <p className="text-sm text-peel-700">{dismissed === subId ? 'Suggestion dismissed. Click another subscription, or reselect this one to search again.' : s.note}</p>}
      {sub && !sub.linked && match && (
        <div className="space-y-3">
          <p className="rounded-xl border-2 border-banana-300 bg-banana-50 px-4 py-3">
            <span className="font-extrabold">{match.business}</span>{' '}
            <span className="text-peel-700">· {rm(match.amount)} · {prettyDay(match.date)} · PayPal sandbox</span>
          </p>
          <p className="text-sm text-peel-700">
            <span className="mr-2 rounded-full bg-banana-200 px-2 py-0.5 text-xs font-bold">{match.ai ? 'AI suggestion' : 'Rule-based suggestion'}</span>
            {match.reason}
            {match.hasSubscriptionId ? ' Linking lets you cancel it in PayPal from here.' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            <button className={btnPrimary} disabled={link.pending} onClick={() => link.run(() => linkSubscriptionAction(sub.id, match.externalId))}>
              <Icon name="check" /> Link to this transaction
            </button>
            <button className={btnGhost} disabled={link.pending} onClick={() => setDismissed(sub.id)}>Not this one</button>
          </div>
        </div>
      )}
      <Feedback error={link.error} notice={link.notice} />
    </section>
  )
}

function AddForm({ onDone }: { onDone: (id?: string) => void }) {
  const act = useAction()
  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('Other')
  const [amount, setAmount] = useState('')
  const [renewDate, setRenewDate] = useState(today())
  const [status, setStatus] = useState<'active' | 'cancelled'>('active')

  function submit() {
    act.run(
      () => createSubscriptionAction({ name, category, amount: Number(amount), renewDate: renewDate || undefined, status }),
      (r) => onDone(r.data?.id),
    )
  }

  return (
    <div className={`${card} mb-6 p-5`}>
      <h2 className="mb-4 text-lg font-extrabold">Add Subscription</h2>
      <div className="grid grid-cols-2 gap-4">
        <label className="col-span-2 flex flex-col gap-1 text-sm font-bold">
          App / Service name
          <input className="font-normal" placeholder="e.g. Netflix" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          Category
          <select className="font-normal" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          Amount (RM)
          <input className="font-normal" type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          Status
          <select className="font-normal" value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'cancelled')}>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        {status === 'active' && (
          <label className="flex flex-col gap-1 text-sm font-bold">
            Next renew date
            <input className="font-normal" type="date" value={renewDate} onChange={(e) => setRenewDate(e.target.value)} />
          </label>
        )}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className={btnPrimary} disabled={act.pending} onClick={submit}>
          <Icon name="check" /> {act.pending ? 'Saving…' : 'Save'}
        </button>
        <button className={btnGhost} disabled={act.pending} onClick={() => onDone()}>Cancel</button>
        <Feedback error={act.error} notice={act.notice} />
      </div>
    </div>
  )
}

export function SubscriptionsClient({ subs }: { subs: SubscriptionView[] }) {
  const [id, setId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
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
      <div className="-mb-2 flex items-start justify-between gap-4">
        <PageTitle icon="renew" title="Subscriptions" sub="Everything that renews, in one place." />
        {!adding && (
          <button className={`${btnPrimary} shrink-0`} onClick={() => setAdding(true)}>
            <Icon name="add" /> Add Subscription
          </button>
        )}
      </div>
      <AiNote className="mb-4 mt-4">
        <p>Two jobs here are done by AI, and both are classification rather than writing:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Sorting imported payments.</b> When PayPal transactions are synced, the AI decides whether money out is a recurring subscription or a one-off expense and picks one of five categories (Streaming, Software, Shopping, Utilities, Other).</li>
          <li><b>Linking to PayPal.</b> Click a subscription and the PayPal link card compares its name and amount with your unlinked PayPal transactions and suggests the most likely match, or none. You confirm before anything is linked.</li>
        </ul>
        <p>The AI never cancels or changes a subscription. Cancelling is always your click. Without a connected AI account, simple name-and-amount rules do the same sorting and matching with less accuracy.</p>
      </AiNote>
      {adding && (
        <AddForm
          onDone={(newId) => {
            setAdding(false)
            if (newId) setId(newId)
          }}
        />
      )}
      <LinkSuggestion key={id ?? 'none'} sub={subs.find((s) => s.id === id) ?? null} />
      {!adding && subs.length === 0 && (
        <p className={`${card} mb-6 p-4`}>No subscriptions yet. <Link href="/paypal" className="font-bold underline">Sync PayPal</Link> to detect recurring payments, or add one manually above.</p>
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
      <Feedback error={act.error} notice={act.notice} />
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
