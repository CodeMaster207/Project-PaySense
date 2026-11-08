'use client'

import { useState } from 'react'
import { addTaskAction, approveTaskAction, completeTaskAction, deleteTaskAction, holdTaskAction, setAutopayLimitAction } from '@/app/(frontend)/actions'
import { prettyDay, rm } from '@/lib/dates'
import { currencySymbol, toBase, toDisplay } from '@/lib/money'
import type { TaskView } from '@/lib/types'
import { Icon } from './Icon'
import { MoneyInput } from './MoneyInput'
import { AiNote, btnDanger, btnGhost, btnPrimary, card, Feedback, PageTitle, useAction } from './ui'

const PAID_VIA = { autopay: 'Paid automatically by the agent', approved: 'Paid after you approved', override: 'Paid after you overrode a hold' }

function Autopay({ limit, hardCap }: { limit: number; hardCap: number }) {
  const act = useAction()
  const [value, setValue] = useState(limit > 0 ? toDisplay(limit).toFixed(2) : '')
  return (
    <section className={`${card} mb-6 p-5`}>
      <h2 className="text-lg font-extrabold">Autopay</h2>
      <p className="mt-1 text-sm text-peel-700">
        {limit > 0
          ? `On: the agent pays by itself when it clears a task of ${rm(limit)} or less. Anything bigger waits for you.`
          : 'Off: the agent always asks you before it sends money. This is the safest setting.'}
      </p>
      <form
        className="mt-3 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          act.run(() => setAutopayLimitAction(value ? toBase(Number(value)) : 0))
        }}
      >
        <label className="flex flex-col gap-1 text-sm font-bold">
          Pay without asking up to ({currencySymbol()})
          <MoneyInput min="0" step="0.01" placeholder="0 = always ask" value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <button className={btnPrimary} disabled={act.pending}>Save</button>
        {limit > 0 && <button type="button" className={btnGhost} disabled={act.pending} onClick={() => { setValue(''); act.run(() => setAutopayLimitAction(0)) }}>Switch off</button>}
        <Feedback error={act.error} notice={act.notice} />
      </form>
      <p className="mt-2 text-xs text-peel-500">Whatever you set, tasks above {rm(hardCap)} always need your approval, and the agent never pays a task its review does not clear.</p>
    </section>
  )
}

function TaskCard({ t }: { t: TaskView }) {
  const act = useAction()
  const [doing, setDoing] = useState(false)
  const [note, setNote] = useState('')
  const busy = act.pending
  const badge: Record<TaskView['status'], string> = {
    open: 'bg-banana-200 text-peel-900',
    review: 'bg-sky-100 text-sky-700',
    held: 'bg-berry-100 text-berry-500',
    paying: 'bg-banana-200 text-peel-900',
    paid: 'bg-leaf-100 text-leaf-700',
  }
  const label: Record<TaskView['status'], string> = { open: 'Waiting for work', review: 'Awaiting your approval', held: 'Held', paying: 'Sending', paid: 'Paid' }

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold">{t.title}</p>
          <p className="break-all text-sm text-peel-700">{t.payeeName} · {t.payeeContact}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${badge[t.status]}`}>{label[t.status]}</span>
        <span className="font-bold text-berry-500">{rm(t.amount)}</span>
      </div>

      {t.deliveryNote && <p className="rounded-lg bg-banana-50 px-3 py-2 text-sm text-peel-700"><b>Delivery note:</b> {t.deliveryNote}</p>}
      {t.reason && t.status !== 'open' && (
        <p className="text-sm text-peel-700">
          <span className="mr-2 rounded-full bg-banana-200 px-2 py-0.5 text-xs font-bold">{t.reviewedByAi ? 'AI agent' : 'Rules check'}</span>
          {t.reason}
        </p>
      )}
      {t.status === 'paid' && <p className="text-sm font-semibold text-leaf-700">{t.paidVia ? PAID_VIA[t.paidVia] : 'Paid'}{t.paidDate ? ` on ${prettyDay(t.paidDate)}` : ''}.</p>}

      <div className="flex flex-wrap gap-2">
        {t.status === 'review' && (
          <>
            <button className={btnPrimary} disabled={busy} onClick={() => act.run(() => approveTaskAction(t.id))}><Icon name="check" /> {busy ? 'Sending...' : `Approve and pay ${rm(t.amount)}`}</button>
            <button className={btnGhost} disabled={busy} onClick={() => act.run(() => holdTaskAction(t.id))}>Hold</button>
          </>
        )}
        {(t.status === 'open' || t.status === 'held') && !doing && (
          <button className={t.status === 'open' ? btnPrimary : btnGhost} disabled={busy} onClick={() => setDoing(true)}>
            <Icon name="check" /> {t.status === 'open' ? 'Mark as done' : 'Add a better note'}
          </button>
        )}
        {t.status === 'held' && (
          <button className={btnDanger} disabled={busy} onClick={() => act.run(() => approveTaskAction(t.id))}>Pay anyway</button>
        )}
        {t.status !== 'paying' && <button className={btnGhost} disabled={busy} onClick={() => act.run(() => deleteTaskAction(t.id))}><Icon name="delete" className="size-4" /> Remove</button>}
        {t.status === 'paying' && <button className={btnGhost} disabled={busy} onClick={() => act.run(() => approveTaskAction(t.id))}>Retry if stuck</button>}
      </div>

      {doing && (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            act.run(() => completeTaskAction(t.id, note), () => { setDoing(false); setNote('') })
          }}
        >
          <label className="flex flex-col gap-1 text-sm font-bold">
            What was delivered?
            <textarea required className="h-20 w-full resize-none font-normal" maxLength={1000} placeholder="e.g. Final logo files sent as SVG and PNG, shared on the drive" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className={btnPrimary} disabled={busy}><Icon name="sparkle" /> {busy ? 'Agent is checking...' : 'Ask the agent to check'}</button>
            <button type="button" className={btnGhost} disabled={busy} onClick={() => setDoing(false)}>Cancel</button>
          </div>
        </form>
      )}
      <Feedback error={act.error} notice={act.notice} />
    </li>
  )
}

export function TasksClient({ tasks, autopayLimit, hardCap, engine }: { tasks: TaskView[]; autopayLimit: number; hardCap: number; engine: string }) {
  const act = useAction()
  const [title, setTitle] = useState('')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [amount, setAmount] = useState('')
  const known = [...new Map(tasks.map((t) => [t.payeeName.toLowerCase(), t])).values()]

  const groups: { title: string; rows: TaskView[] }[] = [
    { title: 'Awaiting your approval', rows: tasks.filter((t) => t.status === 'review') },
    { title: 'Waiting for the work', rows: tasks.filter((t) => t.status === 'open' || t.status === 'paying') },
    { title: 'Held', rows: tasks.filter((t) => t.status === 'held') },
    { title: 'Paid', rows: tasks.filter((t) => t.status === 'paid') },
  ]

  return (
    <div className="max-w-3xl">
      <PageTitle icon="check" title="Pay when done" sub="Add the work. An AI agent checks it is finished before the payment is released." />

      <AiNote>
        <p><b>How it works.</b> You add a task (who, what, how much). When the work is delivered you mark it done and describe what was delivered. The agent reads that note and decides whether the work looks finished: it either <b>clears</b> the payment or <b>holds</b> it, and tells you why.</p>
        <p><b>It acts, within limits you set.</b> If you turn on autopay, the agent sends the money itself for cleared tasks up to your limit. Otherwise it waits for you to press Approve.</p>
        <p><b>Safety rules the AI cannot change.</b> The payee and amount are fixed when you add the task. Nothing above {rm(hardCap)} is ever paid automatically. The AI can make a decision stricter than the plain rules but never looser, so text inside a note cannot talk it into paying. A task can only be paid once, and every payment is recorded as an expense.</p>
        <p>{engine === 'built-in planner' ? 'No AI account is connected, so a plain rules check reads the note instead (it looks for a note that is too short or says the work is not finished).' : `The ${engine} account you connected does the review.`} This sends sandbox money only.</p>
      </AiNote>

      <Autopay limit={autopayLimit} hardCap={hardCap} />

      <form
        className={`${card} mb-6 grid grid-cols-2 items-end gap-3 p-5`}
        onSubmit={(e) => {
          e.preventDefault()
          act.run(() => addTaskAction({ title, payeeName: name, payeeContact: contact, amount: toBase(Number(amount)) }), () => { setTitle(''); setAmount('') })
        }}
      >
        <h2 className="col-span-2 text-lg font-extrabold">Add a task</h2>
        <label className="col-span-2 flex flex-col gap-1 text-sm font-bold">
          What is the work?
          <input required maxLength={100} placeholder="e.g. Illustrate the logo" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          Who will you pay?
          <input
            required
            list="payee-names"
            maxLength={60}
            placeholder="e.g. Sam"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              const match = known.find((t) => t.payeeName.toLowerCase() === e.target.value.toLowerCase())
              if (match && !contact) setContact(match.payeeContact)
            }}
          />
          <datalist id="payee-names">{known.map((t) => <option key={t.id} value={t.payeeName} />)}</datalist>
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          Their PayPal email or ID
          <input required maxLength={120} placeholder="sam@example.com" value={contact} onChange={(e) => setContact(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          Amount ({currencySymbol()})
          <MoneyInput required min="0.01" step="0.01" placeholder="120.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <div className="flex items-center gap-3">
          <button className={btnPrimary} disabled={act.pending}><Icon name="add" /> {act.pending ? 'Adding...' : 'Add task'}</button>
        </div>
        <div className="col-span-2"><Feedback error={act.error} notice={act.notice} /></div>
      </form>

      {tasks.length === 0 && <p className={`${card} p-8 text-center text-peel-700`}>No tasks yet. Add one above, then mark it done to see the agent review it.</p>}
      <div className="space-y-4">
        {groups.filter((g) => g.rows.length).map((g) => (
          <section key={g.title} className={`${card} overflow-hidden`}>
            <h2 className="border-b-2 border-banana-200 bg-banana-100 px-4 py-2 font-extrabold">{g.title} ({g.rows.length})</h2>
            <ul className="divide-y divide-banana-100">
              {g.rows.map((t) => <TaskCard key={t.id} t={t} />)}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
