'use client'

import { Fragment, useState } from 'react'
import { addEntryAction, addJobAction, deleteEntryAction, endJobAction } from '@/app/(frontend)/actions'
import { prettyDay, rm, today } from '@/lib/dates'
import { FREQUENCIES, frequencyLabel, nextPayday } from '@/lib/jobs'
import type { EntryView, Frequency, JobView } from '@/lib/types'
import { DatePicker } from './DatePicker'
import { Icon } from './Icon'
import { currencySymbol, toBase } from '@/lib/money'
import { MoneyInput } from './MoneyInput'
import { btnDanger, btnGhost, btnPrimary, card, Feedback, PageTitle, useAction } from './ui'

export function IncomesClient({ incomes, jobs }: { incomes: EntryView[]; jobs: JobView[] }) {
  const [date, setDate] = useState(today())
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const add = useAction()
  const [jobOpen, setJobOpen] = useState(false)
  const [jobName, setJobName] = useState('')
  const [jobAmount, setJobAmount] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [jobStart, setJobStart] = useState(today())
  const [indefinite, setIndefinite] = useState(true)
  const [jobEnd, setJobEnd] = useState('')
  const job = useAction()
  const jobDel = useAction()
  const [endingId, setEndingId] = useState<string | null>(null)
  const [lastPayment, setLastPayment] = useState('')
  const del = useAction()

  const shown = incomes
    .filter((e) => (!from || e.date >= from) && (!to || e.date <= to))
    .sort((a, b) => b.date.localeCompare(a.date))
  const months = [...new Set(shown.map((e) => e.date.slice(0, 7)))]
  const total = shown.reduce((a, e) => a + e.amount, 0)

  return (
    <div className="max-w-4xl">
      <PageTitle icon="income" title="Incomes" sub="Record money coming in, such as allowance, salary or freelance pay." />

      <div className="mb-4 flex flex-wrap gap-3">
        <button type="button" className={btnPrimary} aria-expanded={formOpen} onClick={() => setFormOpen((o) => !o)}>
          <Icon name={formOpen ? 'close' : 'add'} /> {formOpen ? 'Close' : 'Add income'}
        </button>
        <button type="button" className={btnGhost} aria-expanded={jobOpen} onClick={() => setJobOpen((o) => !o)}>
          <Icon name={jobOpen ? 'close' : 'add'} /> {jobOpen ? 'Close' : 'Add new job'}
        </button>
      </div>

      {jobOpen && (
        <form
          className={`${card} mb-6 grid grid-cols-2 items-end gap-4 p-5`}
          onSubmit={(e) => {
            e.preventDefault()
            if (!indefinite && !jobEnd) return job.setError('Pick an end date, or choose Indefinitely.')
            job.run(
              () => addJobAction({ name: jobName, amount: toBase(Number(jobAmount)), frequency, startDate: jobStart, endDate: indefinite ? '' : jobEnd }),
              () => {
                setJobName('')
                setJobAmount('')
                setIndefinite(true)
                setJobEnd('')
                setJobOpen(false)
              },
            )
          }}
        >
          <label className="flex flex-col gap-1 text-sm font-bold">
            Job name
            <input required maxLength={80} placeholder="e.g. Part-time barista" value={jobName} onChange={(e) => setJobName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Job income ({currencySymbol()} per payment)
            <MoneyInput required min="0.01" step="0.01" placeholder="1500.00" value={jobAmount} onChange={(e) => setJobAmount(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Income received
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
              End date
              {indefinite ? (
                <span className="rounded-xl border-2 border-banana-100 bg-banana-50 px-3 py-2 font-normal text-peel-700">Indefinitely</span>
              ) : (
                <DatePicker ariaLabel="End date" min={jobStart} value={jobEnd} onChange={setJobEnd} placeholder="Pick an end date" />
              )}
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm font-bold">
              <input type="checkbox" className="size-4 accent-[var(--color-banana-500)]" checked={indefinite} onChange={(e) => setIndefinite(e.target.checked)} />
              Indefinitely
            </label>
            <button className={`${btnPrimary} ml-auto`} disabled={job.pending}>
              <Icon name="add" /> {job.pending ? 'Saving...' : 'Add job'}
            </button>
          </div>
          <div className="col-span-2"><Feedback error={job.error} /></div>
        </form>
      )}

      <Feedback notice={job.notice ?? jobDel.notice} />
      {jobs.length > 0 && (
        <section className={`${card} mb-6 overflow-hidden`}>
          <h2 className="border-b-2 border-banana-200 bg-banana-100 px-4 py-2 font-extrabold">Jobs</h2>
          <Feedback error={jobDel.error} />
          <ul className="divide-y divide-banana-100">
            {jobs.map((j) => {
              const next = nextPayday(j)
              return (
                <Fragment key={j.id}>
                <li className="flex items-center gap-4 px-4 py-3">
                  <span className="h-3 w-6 rounded-full bg-leaf-500" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{j.name}</p>
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
                    <p className="basis-full text-xs text-peel-500">Payments up to this date stay in your income history. Nothing is paid after it.</p>
                  </li>
                )}
                </Fragment>
              )
            })}
          </ul>
        </section>
      )}

      {formOpen && <form
        className={`${card} mb-6 grid grid-cols-[14rem_minmax(0,1fr)_10rem_auto] items-end gap-3 p-5`}
        onSubmit={(e) => {
          e.preventDefault()
          add.run(
            () => addEntryAction({ date, type: 'income', description, amount: toBase(Number(amount)) }),
            () => {
              setDescription('')
              setAmount('')
              setFormOpen(false)
            },
          )
        }}
      >
        <div className="flex flex-col gap-1 text-sm font-bold">
          Date
          <DatePicker ariaLabel="Income date" value={date} onChange={setDate} />
        </div>
        <label className="flex flex-col gap-1 text-sm font-bold">
          Description
          <input required maxLength={120} placeholder="e.g. Daily allowance" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          Amount ({currencySymbol()})
          <MoneyInput required min="0.01" step="0.01" placeholder="50.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <button className={btnPrimary} disabled={add.pending || !date}>
          <Icon name="add" /> {add.pending ? 'Saving...' : 'Record'}
        </button>
        <div className="col-span-4"><Feedback error={add.error} /></div>
      </form>}

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="font-bold">Date Range:</span>
        <div className="w-48"><DatePicker clearable ariaLabel="From" placeholder="Any date" max={to || undefined} value={from} onChange={setFrom} /></div>
        <span>to</span>
        <div className="w-48"><DatePicker clearable ariaLabel="To" placeholder="Any date" min={from || undefined} value={to} onChange={setTo} /></div>
        <span className="ml-auto text-lg font-extrabold text-leaf-700">Total {rm(total)}</span>
      </div>

      <Feedback error={del.error} />
      <div className="space-y-4">
        {shown.length === 0 && <p className={`${card} p-8 text-center text-peel-700`}>No incomes recorded for this range yet.</p>}
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
                    {e.source === 'paypal' && <span className="rounded-full bg-banana-200 px-2 text-xs font-bold">PayPal</span>}
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
