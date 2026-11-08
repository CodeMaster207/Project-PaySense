'use client'

import { useState } from 'react'
import { draftReminderAction, sendReminderAction, setAutoFollowUpAction } from '@/app/(frontend)/actions'
import { prettyDay, rm, today } from '@/lib/dates'
import { canRemind, COOLDOWN_DAYS, MAX_REMINDERS, overdueDays, type Tone } from '@/lib/followup'
import type { PaymentRequestView } from '@/lib/types'
import { Icon } from './Icon'
import { btnGhost, btnPrimary, Feedback, useAction } from './ui'

const STATUS_STYLE = { sent: 'bg-banana-200 text-peel-900', paid: 'bg-leaf-100 text-leaf-700', cancelled: 'bg-berry-100 text-berry-500' }
const TONE: Record<Tone, string> = { gentle: 'Gentle', firm: 'Firm', final: 'Final notice' }

/** The switch that lets the follow-up agent send reminders itself when payment requests are checked. */
export function FollowUpSetting({ on }: { on: boolean }) {
  const act = useAction()
  return (
    <div className="border-b border-banana-200 bg-banana-50 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-peel-700">
          <b className="text-peel-900">Follow-up agent: {on ? 'sends reminders itself' : 'drafts, you send'}.</b>{' '}
          {on
            ? 'When you press Check status, it sends a reminder for each overdue invoice by itself.'
            : 'It drafts a reminder for an overdue invoice and waits for you to read and send it.'}
        </p>
        <button className={on ? btnGhost : btnPrimary} disabled={act.pending} onClick={() => act.run(() => setAutoFollowUpAction(!on))}>
          {on ? 'Switch to draft only' : 'Let it send reminders'}
        </button>
      </div>
      <p className="mt-1 text-xs text-peel-500">
        Either way: only overdue, unpaid invoices, at most {MAX_REMINDERS} reminders each and {COOLDOWN_DAYS} days apart. Automatic wording is checked so it cannot contain links, email addresses or amounts.
      </p>
      <Feedback error={act.error} notice={act.notice} />
    </div>
  )
}

type Draft = { blocked: string | null; subject: string; note: string; days: number; tone: Tone; ai: boolean }

/** One payment request. A pending one shows how overdue it is and lets the agent draft a reminder for it. */
export function PaymentRequestRow({ r }: { r: PaymentRequestView }) {
  const draftAct = useAction()
  const sendAct = useAction()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [subject, setSubject] = useState('')
  const [note, setNote] = useState('')
  const now = today()
  const days = overdueDays(r.dueDate, now)
  const check = canRemind({ status: r.status, dueDate: r.dueDate, remindersSent: r.remindersSent, lastReminderDate: r.lastReminderDate, today: now })
  const pending = r.status === 'sent'

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold">{r.description}</p>
          <p className="break-all text-sm text-peel-700">{r.email}{r.dueDate ? `, due ${prettyDay(r.dueDate)}` : ''}</p>
          <p className="break-all text-xs text-peel-500">PayPal invoice ID: <span className="font-mono">{r.invoiceId}</span></p>
        </div>
        {pending && days > 0 && <span className="rounded-full bg-berry-100 px-2 py-0.5 text-xs font-bold text-berry-500">Overdue {days} day{days === 1 ? '' : 's'}</span>}
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${STATUS_STYLE[r.status]}`}>{pending ? 'pending' : r.status}</span>
        <span className="font-bold text-leaf-700">{rm(r.amount)}</span>
      </div>

      {pending && days > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {r.remindersSent > 0 && <span className="text-xs text-peel-500">Reminders sent: {r.remindersSent} of {MAX_REMINDERS}{r.lastReminderDate ? `, last on ${prettyDay(r.lastReminderDate)}` : ''}</span>}
          {check.ok && !draft && (
            <button
              className={btnGhost}
              disabled={draftAct.pending}
              onClick={() =>
                draftAct.run(() => draftReminderAction(r.id), (res) => {
                  if (!res.data) return
                  setDraft(res.data)
                  setSubject(res.data.subject)
                  setNote(res.data.note)
                })
              }
            >
              <Icon name="sparkle" /> {draftAct.pending ? 'Agent is drafting...' : 'Agent: draft a reminder'}
            </button>
          )}
          {!check.ok && <span className="text-xs text-peel-500">{check.reason}</span>}
        </div>
      )}

      {draft && !draft.blocked && (
        <form
          className="space-y-2 rounded-xl border-2 border-banana-300 bg-banana-50 p-3"
          onSubmit={(e) => {
            e.preventDefault()
            sendAct.run(() => sendReminderAction(r.id, subject, note), () => setDraft(null))
          }}
        >
          <p className="text-sm text-peel-700">
            <span className="mr-2 rounded-full bg-banana-200 px-2 py-0.5 text-xs font-bold">{draft.ai ? 'AI draft' : 'Draft'}</span>
            {TONE[draft.tone]} tone, {draft.days} day{draft.days === 1 ? '' : 's'} overdue. Read it, change anything you like, then send. Nothing goes out until you press Send.
          </p>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Subject
            <input required maxLength={100} className="font-normal" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Message
            <textarea required maxLength={500} className="h-24 w-full resize-none font-normal" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className={btnPrimary} disabled={sendAct.pending}><Icon name="check" /> {sendAct.pending ? 'Sending...' : 'Send reminder'}</button>
            <button type="button" className={btnGhost} disabled={sendAct.pending} onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </form>
      )}
      {draft?.blocked && <p className="text-sm text-peel-700">{draft.blocked}</p>}
      <Feedback error={draftAct.error ?? sendAct.error} notice={sendAct.notice} />
    </li>
  )
}
