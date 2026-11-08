'use client'

import { Fragment, useEffect, useState } from 'react'
import { addEntryAction, addJobAction, deleteEntryAction, endJobAction, refreshPaymentRequestsAction, requestPaymentAction } from '@/app/(frontend)/actions'
import { prettyDay, rm, today } from '@/lib/dates'
import { FREQUENCIES, frequencyLabel, nextPayday } from '@/lib/jobs'
import type { EntryView, Frequency, JobView, PaymentRequestView } from '@/lib/types'
import { DatePicker } from './DatePicker'
import { Icon } from './Icon'
import { currencySymbol, toBase } from '@/lib/money'
import { MoneyInput } from './MoneyInput'
import { AiNote, btnDanger, btnGhost, btnPrimary, card, Feedback, PageTitle, useAction } from './ui'

const TABS = [
  { id: 'job' as const, button: 'Add job' },
  { id: 'contract' as const, button: 'Add contract' },
  { id: 'entry' as const, button: 'New revenue' },
  { id: 'request' as const, button: 'Request payment' },
]

const STATUS_STYLE = { sent: 'bg-banana-200 text-peel-900', paid: 'bg-leaf-100 text-leaf-700', cancelled: 'bg-berry-100 text-berry-500' }

export function IncomesClient({ incomes, jobs, requests }: { incomes: EntryView[]; jobs: JobView[]; requests: PaymentRequestView[] }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [formTab, setFormTab] = useState<'job' | 'contract' | 'entry' | 'request'>('job')

  // Payment request form
  const [reqEmail, setReqEmail] = useState('')
  const [reqAmount, setReqAmount] = useState('')
  const [reqNote, setReqNote] = useState('')
  const [reqDays, setReqDays] = useState('7')
  const requestAct = useAction()
  const refreshAct = useAction()

  // One-time entry form
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const add = useAction()

  // Recurring job form
  const [jobName, setJobName] = useState('')
  const [jobAmount, setJobAmount] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [jobStart, setJobStart] = useState(today())
  const [indefinite, setIndefinite] = useState(true)
  const [jobEnd, setJobEnd] = useState('')
  const job = useAction()

  // Job list remove
  const jobDel = useAction()
  const [endingId, setEndingId] = useState<string | null>(null)
  const [lastPayment, setLastPayment] = useState('')
  const del = useAction()

  const shown = incomes
    .filter((e) => (!from || e.date >= from) && (!to || e.date <= to))
    .sort((a, b) => b.date.localeCompare(a.date))
  const months = [...new Set(shown.map((e) => e.date.slice(0, 7)))]
  const total = shown.reduce((a, e) => a + e.amount, 0)

  function closeForm() {
    setFormOpen(false)
  }

  const [hidden, setHidden] = useState<string[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('jobs-hidden-buttons') ?? '[]')
      if (Array.isArray(saved)) setHidden(saved.filter((v) => typeof v === 'string'))
    } catch {}
  }, [])
  function toggleButton(id: string) {
    const next = hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id]
    setHidden(next)
    if (next.includes(id) && formTab === id) setFormOpen(false)
    try {
      localStorage.setItem('jobs-hidden-buttons', JSON.stringify(next))
    } catch {}
  }

  const isContract = formTab === 'contract'
  const noEnd = !isContract && indefinite

  return (
    <div className="max-w-4xl">
      <PageTitle icon="income" title="Incomes" sub="Track salary, allowance, and freelance pay. PayPal refunds and transfers appear on the dashboard." />

      <AiNote>
        <p>Nothing on this page is written or decided by AI. Jobs, contracts and revenue are entered by you, and the payment dates and amounts are calculated by simple rules.</p>
        <p>The AI only <b>reads</b> this data. Your incomes are part of the snapshot that the Personal AI chat, the goal planner and AI Insights use, and goal funding follows what you earn, so entering income accurately makes their advice better.</p>
      </AiNote>
      <p className="mb-2 text-sm text-peel-700">
        <b>Job</b>: full-time or part-time employment. <b>Contract</b>: fixed-term self-employed work. <b>Revenue</b>: sales and income for business owners.
      </p>
      <div className="mb-4 flex flex-wrap gap-3">
        {TABS.filter((t) => !hidden.includes(t.id)).map((t) => {
          const open = formOpen && formTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              className={btnPrimary}
              aria-expanded={open}
              onClick={() => {
                if (open) return closeForm()
                setFormTab(t.id)
                setFormOpen(true)
              }}
            >
              <Icon name={open ? 'close' : 'add'} /> {open ? 'Close' : t.button}
            </button>
          )
        })}
        <div className="relative">
          <button type="button" className={btnGhost} aria-expanded={settingsOpen} aria-label="Button settings" onClick={() => setSettingsOpen((o) => !o)}>
            <Icon name="settings" /> Settings
          </button>
          {settingsOpen && (
            <div className={`${card} absolute left-0 top-12 z-20 w-64 p-4 text-sm`}>
              <p className="mb-2 font-extrabold">Show buttons</p>
              <ul className="space-y-2">
                {TABS.map((t) => (
                  <li key={t.id}>
                    <label className="flex items-center gap-2 font-semibold">
                      <input type="checkbox" className="size-4 accent-[var(--color-banana-500)]" checked={!hidden.includes(t.id)} onChange={() => toggleButton(t.id)} />
                      {t.button}
                    </label>
                  </li>
                ))}
              </ul>
              <button type="button" className={`${btnGhost} mt-3 w-full`} onClick={() => setSettingsOpen(false)}>Done</button>
            </div>
          )}
        </div>
      </div>

      {formOpen && (
        <div className={`${card} mb-6 overflow-hidden`}>
          {formTab === 'entry' && (
            <form
              className="grid grid-cols-[14rem_minmax(0,1fr)_10rem_auto] items-end gap-3 p-5"
              onSubmit={(e) => {
                e.preventDefault()
                add.run(
                  () => addEntryAction({ date, type: 'income', description, amount: toBase(Number(amount)) }),
                  () => { setDescription(''); setAmount(''); closeForm() },
                )
              }}
            >
              <div className="flex flex-col gap-1 text-sm font-bold">
                Date
                <DatePicker ariaLabel="Revenue date" value={date} onChange={setDate} />
              </div>
              <label className="flex flex-col gap-1 text-sm font-bold">
                Revenue source
                <input required maxLength={120} placeholder="e.g. Product sales, customer payment" value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-bold">
                Amount ({currencySymbol()})
                <MoneyInput required min="0.01" step="0.01" placeholder="50.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
              <button className={btnPrimary} disabled={add.pending || !date}>
                <Icon name="add" /> {add.pending ? 'Saving...' : 'Record'}
              </button>
              <div className="col-span-4"><Feedback error={add.error} /></div>
            </form>
          )}

          {formTab === 'request' && (
            <form
              className="grid grid-cols-2 items-end gap-4 p-5"
              onSubmit={(e) => {
                e.preventDefault()
                requestAct.run(
                  () => requestPaymentAction({ email: reqEmail, amount: toBase(Number(reqAmount)), description: reqNote, dueDays: Number(reqDays) }),
                  () => { setReqEmail(''); setReqAmount(''); setReqNote(''); closeForm() },
                )
              }}
            >
              <label className="flex flex-col gap-1 text-sm font-bold">
                Their PayPal email
                <input required type="email" maxLength={120} placeholder="customer@example.com" value={reqEmail} onChange={(e) => setReqEmail(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-bold">
                Amount ({currencySymbol()})
                <MoneyInput required min="0.01" step="0.01" placeholder="120.00" value={reqAmount} onChange={(e) => setReqAmount(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-bold">
                What is it for?
                <input required maxLength={120} placeholder="e.g. Logo design, invoice 12" value={reqNote} onChange={(e) => setReqNote(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-bold">
                Due in
                <select value={reqDays} onChange={(e) => setReqDays(e.target.value)}>
                  {[0, 7, 14, 30].map((d) => <option key={d} value={d}>{d === 0 ? 'Today' : `${d} days`}</option>)}
                </select>
              </label>
              <p className="col-span-2 text-xs text-peel-500">
                This sends a PayPal invoice from your PayPal sandbox account. The invoice is sent in your PayPal account&apos;s currency (US dollars by default), converted from the amount you enter at an indicative rate. In the sandbox, the person must have a sandbox PayPal account, and they see the request under Invoices after logging in at sandbox.paypal.com. Real emails are not delivered.
              </p>
              <div className="col-span-2 flex flex-wrap items-center gap-3">
                <button className={btnPrimary} disabled={requestAct.pending}>
                  <Icon name="add" /> {requestAct.pending ? 'Sending...' : 'Send request'}
                </button>
                <Feedback error={requestAct.error} />
              </div>
            </form>
          )}

          {(formTab === 'job' || formTab === 'contract') && (
            <form
              key={formTab}
              className="grid grid-cols-2 items-end gap-4 p-5"
              onSubmit={(e) => {
                e.preventDefault()
                if (!noEnd && !jobEnd) return job.setError(isContract ? 'A contract needs an end date.' : 'Pick an end date, or choose Indefinitely.')
                job.run(
                  () => addJobAction({ kind: formTab, name: jobName, amount: toBase(Number(jobAmount)), frequency, startDate: jobStart, endDate: noEnd ? '' : jobEnd }),
                  () => { setJobName(''); setJobAmount(''); setIndefinite(true); setJobEnd(''); closeForm() },
                )
              }}
            >
              <label className="flex flex-col gap-1 text-sm font-bold">
                {isContract ? 'Client / contract name' : 'Employer / job title'}
                <input required maxLength={80} placeholder={isContract ? 'e.g. Website design for Acme' : 'e.g. Part-time barista'} value={jobName} onChange={(e) => setJobName(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-bold">
                {isContract ? 'Payment per cycle' : 'Salary per payment'} ({currencySymbol()})
                <MoneyInput required min="0.01" step="0.01" placeholder="1500.00" value={jobAmount} onChange={(e) => setJobAmount(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-bold">
                Pay frequency
                <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
                  {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </label>
              <div className="flex flex-col gap-1 text-sm font-bold">
                First payment date
                <DatePicker ariaLabel="First payment date" value={jobStart} onChange={(d) => { setJobStart(d); if (jobEnd && jobEnd < d) setJobEnd('') }} />
              </div>
              <div className="col-span-2 flex flex-wrap items-end gap-4">
                <div className="flex w-64 flex-col gap-1 text-sm font-bold">
                  {isContract ? 'Contract end date' : 'End date'}
                  {noEnd ? (
                    <span className="rounded-xl border-2 border-banana-100 bg-banana-50 px-3 py-2 font-normal text-peel-700">Indefinitely</span>
                  ) : (
                    <DatePicker ariaLabel="End date" min={jobStart} value={jobEnd} onChange={setJobEnd} placeholder="Pick an end date" />
                  )}
                </div>
                {!isContract && (
                  <label className="flex items-center gap-2 pb-2 text-sm font-bold">
                    <input type="checkbox" className="size-4 accent-[var(--color-banana-500)]" checked={indefinite} onChange={(e) => setIndefinite(e.target.checked)} />
                    Indefinitely
                  </label>
                )}
                <button className={`${btnPrimary} ml-auto`} disabled={job.pending}>
                  <Icon name="add" /> {job.pending ? 'Saving...' : isContract ? 'Add contract' : 'Add job'}
                </button>
              </div>
              <div className="col-span-2"><Feedback error={job.error} /></div>
            </form>
          )}
        </div>
      )}

      <Feedback notice={job.notice ?? jobDel.notice ?? requestAct.notice} />
      {requests.length > 0 && (
        <section className={`${card} mb-6 overflow-hidden`}>
          <h2 className="flex items-center justify-between gap-3 border-b-2 border-banana-200 bg-banana-100 px-4 py-2 font-extrabold">
            Payment requests
            <button type="button" className={`${btnGhost} !px-3 !py-1 text-sm`} disabled={refreshAct.pending} onClick={() => refreshAct.run(() => refreshPaymentRequestsAction())}>
              <Icon name="sync" className="size-4" /> {refreshAct.pending ? 'Checking...' : 'Check status'}
            </button>
          </h2>
          <Feedback error={refreshAct.error} notice={refreshAct.notice} />
          {([
            { title: 'Pending', rows: requests.filter((r) => r.status === 'sent'), empty: 'No pending requests.' },
            { title: 'Paid and closed', rows: requests.filter((r) => r.status !== 'sent'), empty: '' },
          ] as const).map((group) =>
            group.rows.length === 0 && !group.empty ? null : (
              <div key={group.title}>
                <h3 className="border-b border-banana-200 bg-banana-50 px-4 py-1.5 text-sm font-extrabold text-peel-700">{group.title} ({group.rows.length})</h3>
                <ul className="divide-y divide-banana-100">
                  {group.rows.length === 0 && <li className="px-4 py-3 text-sm text-peel-500">{group.empty}</li>}
                  {group.rows.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">{r.description}</p>
                        <p className="break-all text-sm text-peel-700">{r.email}{r.dueDate ? `, due ${prettyDay(r.dueDate)}` : ''}</p>
                        <p className="break-all text-xs text-peel-500">PayPal invoice ID: <span className="font-mono">{r.invoiceId}</span></p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${STATUS_STYLE[r.status]}`}>{r.status === 'sent' ? 'pending' : r.status}</span>
                      <span className="font-bold text-leaf-700">{rm(r.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </section>
      )}
      {jobs.length > 0 && (
        <section className={`${card} mb-6 overflow-hidden`}>
          <h2 className="border-b-2 border-banana-200 bg-banana-100 px-4 py-2 font-extrabold">Active Jobs</h2>
          <Feedback error={jobDel.error} />
          <ul className="divide-y divide-banana-100">
            {jobs.map((j) => {
              const next = nextPayday(j)
              return (
                <Fragment key={j.id}>
                <li className="flex items-center gap-4 px-4 py-3">
                  <span className="h-3 w-6 rounded-full bg-leaf-500" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{j.name} <span className="ml-1 rounded-full bg-banana-200 px-2 text-xs font-bold">{j.kind === 'contract' ? 'Contract' : 'Job'}</span></p>
                    <p className="text-sm text-peel-700">
                      {frequencyLabel(j.frequency)}, from {prettyDay(j.startDate)}, {j.endDate ? `until ${prettyDay(j.endDate)}` : 'indefinitely'}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-bold text-leaf-700">+{rm(j.amount)}</p>
                    <p className="text-peel-500">{next ? `Next ${prettyDay(next)}` : 'Ended'}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${j.name}`}
                    aria-expanded={endingId === j.id}
                    className="text-peel-500 hover:text-berry-500"
                    onClick={() => {
                      setEndingId(endingId === j.id ? null : j.id)
                      setLastPayment('')
                      jobDel.setError(null)
                    }}
                  >
                    <Icon name="delete" className="size-5" />
                  </button>
                </li>
                {endingId === j.id && (
                  <li key={`${j.id}-end`} className="flex flex-wrap items-end gap-3 bg-banana-50 px-4 py-3">
                    <div className="flex w-64 flex-col gap-1 text-sm font-bold">
                      When will you receive the last payment?
                      <DatePicker ariaLabel="Last payment date" min={j.startDate} value={lastPayment} onChange={setLastPayment} placeholder="Pick the last payment date" />
                    </div>
                    <button
                      type="button"
                      className={btnDanger}
                      disabled={jobDel.pending}
                      onClick={() => {
                        if (!lastPayment) return jobDel.setError('Fill in the date of the last payment to remove this job.')
                        jobDel.run(() => endJobAction(j.id, lastPayment), () => setEndingId(null))
                      }}
                    >
                      Remove job
                    </button>
                    <button type="button" className={btnGhost} onClick={() => setEndingId(null)}>Keep job</button>
                    <p className="basis-full text-xs text-peel-500">Job payments up to this date stay in your history. Nothing is paid after it.</p>
                  </li>
                )}
                </Fragment>
              )
            })}
          </ul>
        </section>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="font-bold">Date Range:</span>
        <div className="w-48"><DatePicker clearable ariaLabel="From" placeholder="Any date" max={to || undefined} value={from} onChange={setFrom} /></div>
        <span>to</span>
        <div className="w-48"><DatePicker clearable ariaLabel="To" placeholder="Any date" min={from || undefined} value={to} onChange={setTo} /></div>
        <span className="ml-auto text-lg font-extrabold text-leaf-700">Total {rm(total)}</span>
      </div>

      <Feedback error={del.error} />
      <div className="space-y-4">
        {shown.length === 0 && <p className={`${card} p-8 text-center text-peel-700`}>No job income recorded for this range yet.</p>}
        {months.map((m) => {
          const rows = shown.filter((e) => e.date.startsWith(m))
          return (
            <section key={m} className={`${card} overflow-hidden`}>
              <h2 className="flex items-baseline justify-between border-b-2 border-banana-200 bg-banana-100 px-4 py-2 font-extrabold">
                {new Date(`${m}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                <span className="text-sm text-leaf-700">{rm(rows.reduce((a, e) => a + e.amount, 0))}</span>
              </h2>
              <ul className="divide-y divide-banana-100">
                {rows.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="h-3 w-6 rounded-full bg-leaf-500" />
                    <span className="w-44 text-sm text-peel-700">{prettyDay(e.date)}</span>
                    <span className="flex-1 font-semibold">{e.description}</span>
                    <span className="font-bold text-leaf-700">+{rm(e.amount)}</span>
                    <button type="button" aria-label={`Delete ${e.description}`} disabled={del.pending} className="text-peel-500 hover:text-berry-500" onClick={() => del.run(() => deleteEntryAction(e.id))}>
                      <Icon name="delete" className="size-5" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
