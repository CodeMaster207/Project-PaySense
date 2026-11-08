'use client'

import { useEffect, useMemo, useState } from 'react'
import { addDays, daysBetween, parseDay, prettyDay, rm } from '@/lib/dates'
import { dailyFor, FIXED_HOLIDAYS, isSkipped, WEEKDAYS } from '@/lib/plan'
import type { ActionResult, GoalEditInput, PlanItem } from '@/lib/types'
import { asTagColor, type TagColor } from '@/lib/tagColors'
import { DatePicker } from './DatePicker'
import { Icon } from './Icon'
import { TagColorPicker } from './TagColor'
import { currencySymbol, toBase, toDisplay } from '@/lib/money'
import { MoneyInput } from './MoneyInput'
import { MonthCalendar } from './MonthCalendar'
import { btnGhost, btnPrimary, Feedback, useAction } from './ui'

const FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const wdOf = (d: string) => parseDay(d).getDay()

/** Every date from start to target (inclusive). */
const listDays = (start: string, target: string) =>
  target < start ? [] : Array.from({ length: daysBetween(start, target) + 1 }, (_, i) => addDays(start, i))

/**
 * Edits the goal itself. The calendar is the single source of truth: `skipped` holds every
 * unfunded date, and each weekday button is derived from it (on only when all its dates are skipped).
 */
export type EditableGoal = {
  title: string
  tag: string
  tagColor: string
  startDate: string
  targetDate: string
  targetAmount: number
  dailyAmount: number
  items: PlanItem[]
  skipWeekdays: number[]
  excludedDays: string[]
  restoredDays: string[]
}

/** Shared modify form: used for saved plans (Plan page) and AI drafts (Goal page). */
export function GoalEditor({
  goal,
  aiItems,
  submitLabel = 'Save changes',
  onSubmit,
  onDone,
  extraActions,
}: {
  goal: EditableGoal
  aiItems?: PlanItem[]
  submitLabel?: string
  onSubmit: (values: GoalEditInput) => Promise<ActionResult>
  onDone?: () => void
  extraActions?: React.ReactNode
}) {
  const [title, setTitle] = useState(goal.title)
  const [targetDate, setTargetDate] = useState(goal.targetDate)
  const [amount, setAmount] = useState(goal.targetAmount ? String(Math.round(toDisplay(goal.targetAmount) * 100) / 100) : '')
  const [tag, setTag] = useState(goal.tag)
  const [tagColor, setTagColor] = useState<TagColor>(asTagColor(goal.tagColor))
  const [skipped, setSkipped] = useState<string[]>(() => listDays(goal.startDate, goal.targetDate).filter((d) => isSkipped(d, goal)))
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')
  const [month, setMonth] = useState(() => parseDay(goal.startDate))
  const [localError, setLocalError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const act = useAction()

  // The confirmation stays until any part of the goal is edited again.
  useEffect(() => setSaved(null), [title, targetDate, amount, tag, tagColor, skipped])

  const validDate = targetDate > goal.startDate
  const rangeDays = useMemo(() => (validDate ? listDays(goal.startDate, targetDate) : []), [goal.startDate, targetDate, validDate])
  const skippedSet = useMemo(() => new Set(skipped), [skipped])
  const inRange = (d: string) => d >= goal.startDate && d <= targetDate

  const weekdayDates = (i: number) => rangeDays.filter((d) => wdOf(d) === i)
  const weekdayOn = (i: number) => {
    const ds = weekdayDates(i)
    return ds.length > 0 && ds.every((d) => skippedSet.has(d))
  }

  const holidayDates = rangeDays.filter((d) => FIXED_HOLIDAYS.some((h) => d.endsWith(h.md)))
  const holidaysOn = holidayDates.length > 0 && holidayDates.every((d) => skippedSet.has(d))
  const weekendDates = [...weekdayDates(0), ...weekdayDates(6)]
  const weekendOn = weekdayOn(0) && weekdayOn(6)

  const days = rangeDays.length - rangeDays.filter((d) => skippedSet.has(d)).length
  const baseAmount = toBase(Number(amount) || 0)
  const daily = dailyFor(baseAmount, days)

  const add = (ds: string[]) => setSkipped((cur) => [...new Set([...cur, ...ds.filter(inRange)])].sort())
  const remove = (ds: string[]) => setSkipped((cur) => cur.filter((d) => !ds.includes(d)))
  const toggleDay = (d: string) => (skippedSet.has(d) ? remove([d]) : add([d]))
  const toggleWeekday = (i: number) => (weekdayOn(i) ? remove(weekdayDates(i)) : add(weekdayDates(i)))

  // Extending the target date keeps any fully skipped weekday skipped on the new dates too.
  const changeTarget = (next: string) => {
    if (next > targetDate && next > goal.startDate) {
      const on = new Set([0, 1, 2, 3, 4, 5, 6].filter(weekdayOn))
      const extra = listDays(addDays(targetDate, 1), next).filter((d) => on.has(wdOf(d)))
      setSkipped((cur) => [...cur, ...extra])
    } else if (next < targetDate) {
      setSkipped((cur) => cur.filter((d) => d <= next))
    }
    setTargetDate(next)
  }

  const addRange = () => {
    if (!rangeFrom || !rangeTo || rangeTo < rangeFrom) return
    const ds = listDays(rangeFrom, addDays(rangeFrom, Math.min(366, daysBetween(rangeFrom, rangeTo)))).filter(inRange)
    add(ds)
    if (ds[0]) setMonth(parseDay(ds[0]))
    setRangeFrom('')
    setRangeTo('')
  }
  const holidayName = (d: string) => FIXED_HOLIDAYS.find((h) => d.endsWith(h.md))?.name

  const onWeekdays = [0, 1, 2, 3, 4, 5, 6].filter(weekdayOn)
  const singles = skipped.filter((d) => inRange(d) && !onWeekdays.includes(wdOf(d)))

  const save = () => {
    if (!validDate) return setLocalError('The target date must be after the plan start date.')
    if (days < 1) return setLocalError('Every day in this plan is skipped. Restore at least one day so there is something to fund.')
    setLocalError(null)
    setSaved(null)
    act.run(
      () =>
        onSubmit({
          title,
          tag,
          tagColor,
          targetDate,
          targetAmount: baseAmount,
          skipWeekdays: onWeekdays, // fully skipped weekdays are stored compactly
          excludedDays: singles,
          restoredDays: [],
          items: aiItems,
        }),
      (r) => {
        setSaved(r.message ?? 'Plan updated.')
        onDone?.()
      },
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-bold">
          Goal name
          <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          Tag
          <input value={tag} maxLength={40} placeholder="e.g. travel, emergency" onChange={(e) => setTag(e.target.value)} />
          <TagColorPicker value={tagColor} onChange={setTagColor} />
        </label>
        <div className="flex flex-col gap-1 text-sm font-bold">
          Target date
          <DatePicker ariaLabel="Target date" min={addDays(goal.startDate, 1)} value={targetDate} onChange={changeTarget} />
        </div>
        <label className="flex flex-col gap-1 text-sm font-bold">
          Amount required ({currencySymbol()})
          <MoneyInput min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
      </div>

      <section>
        <h3 className="mb-2 font-extrabold">Days with no funding</h3>
        <p className="mb-2 text-sm text-peel-700">
          A weekday button is on when every date of that weekday is skipped. Toggle it to skip or fund the whole column, or click single dates in the calendar.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {WEEKDAYS.map((w, i) => (
            <button
              key={w}
              type="button"
              aria-pressed={weekdayOn(i)}
              onClick={() => toggleWeekday(i)}
              className={`rounded-xl border-2 px-3 py-1.5 text-sm font-bold transition ${weekdayOn(i) ? 'border-berry-500 bg-berry-100 text-berry-500' : 'border-banana-300 bg-white hover:bg-banana-100'}`}
            >
              {w}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={weekendOn}
            onClick={() => (weekendOn ? remove(weekendDates) : add(weekendDates))}
            className={`rounded-xl border-2 px-3 py-1.5 text-sm font-bold transition ${weekendOn ? 'border-berry-500 bg-berry-100 text-berry-500' : 'border-banana-300 bg-white hover:bg-banana-100'}`}
          >
            Weekends
          </button>
          <button
            type="button"
            aria-pressed={holidaysOn}
            disabled={holidayDates.length === 0}
            title={holidayDates.length === 0 ? 'No fixed public holidays fall within this plan.' : undefined}
            onClick={() => {
              if (holidaysOn) remove(holidayDates)
              else {
                add(holidayDates)
                if (holidayDates[0]) setMonth(parseDay(holidayDates[0]))
              }
            }}
            className={`rounded-xl border-2 px-3 py-1.5 text-sm font-bold transition ${holidaysOn ? 'border-berry-500 bg-berry-100 text-berry-500' : 'border-banana-300 bg-white hover:bg-banana-100'}`}
          >
            Fixed public holidays
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex w-44 flex-col gap-1 text-xs font-bold">Skip from<DatePicker ariaLabel="Skip from" min={goal.startDate} max={targetDate} value={rangeFrom} onChange={(d) => { setRangeFrom(d); if (rangeTo && rangeTo < d) setRangeTo('') }} /></div>
          <div className="flex w-44 flex-col gap-1 text-xs font-bold">to<DatePicker ariaLabel="Skip to" min={rangeFrom || goal.startDate} max={targetDate} value={rangeTo} onChange={setRangeTo} /></div>
          <button type="button" className={btnGhost} disabled={!rangeFrom || !rangeTo || rangeTo < rangeFrom} onClick={addRange}>
            <Icon name="add" className="size-4" /> Skip these days
          </button>
        </div>
        <p className="mt-1 text-xs text-peel-500">Public holidays covers fixed dates only (1 Jan, 1 May, 31 Aug, 16 Sep, 25 Dec). Add movable holidays such as Hari Raya by date or range.</p>
      </section>

      <div className="@container grid grid-cols-1 gap-5 @2xl:grid-cols-[minmax(0,1fr)_16rem]">
        <div>
          <MonthCalendar
            size="sm"
            month={month}
            onMonth={setMonth}
            selected=""
            onSelect={toggleDay}
            inRange={inRange}
            dayState={(d) => (!inRange(d) ? undefined : skippedSet.has(d) ? 'skip' : 'fund')}
          />
          <p className="mt-2 text-xs text-peel-500">Green days are funded, red struck-through days are skipped. Click a day to skip or restore it.</p>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border-2 border-banana-200 bg-banana-50 p-3 text-sm">
            <p className="flex justify-between"><span>Funding days</span><b>{days}</b></p>
            <p className="flex justify-between"><span>Skipped days</span><b>{rangeDays.length - days}</b></p>
            <p className="mt-2 flex justify-between border-t-2 border-banana-200 pt-2 text-base"><span>Per funding day</span><b>{rm(daily)}</b></p>
            {daily !== goal.dailyAmount && <p className="text-xs text-peel-500">Was {rm(goal.dailyAmount)}</p>}
          </div>
          <div className="rounded-xl border-2 border-banana-200">
            <h4 className="border-b-2 border-banana-200 bg-banana-100 px-3 py-1.5 text-sm font-bold">Skipped days</h4>
            <ul className="max-h-40 divide-y divide-banana-100 overflow-y-auto text-sm">
              {onWeekdays.length + singles.length === 0 && <li className="px-3 py-2 text-peel-500">None selected.</li>}
              {onWeekdays.map((i) => (
                <li key={`w${i}`} className="flex items-center justify-between gap-2 px-3 py-1.5">
                  <span>Every {FULL[i]}</span>
                  <button type="button" aria-label={`Fund every ${FULL[i]}`} className="text-peel-500 hover:text-berry-500" onClick={() => toggleWeekday(i)}><Icon name="close" className="size-4" /></button>
                </li>
              ))}
              {singles.map((d) => (
                <li key={d} className="flex items-center justify-between gap-2 px-3 py-1.5">
                  <span>{prettyDay(d)}{holidayName(d) && <span className="ml-1 text-xs text-peel-500">{holidayName(d)}</span>}</span>
                  <button type="button" aria-label={`Restore ${d}`} className="text-peel-500 hover:text-berry-500" onClick={() => remove([d])}><Icon name="close" className="size-4" /></button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {(aiItems ?? goal.items).length > 0 && (
        <section>
          <h3 className="mb-1 font-extrabold">Checkpoints {aiItems && <span className="text-sm font-semibold text-leaf-700">(AI refinement ready to save)</span>}</h3>
          <ul className="grid grid-cols-1 gap-x-6 text-sm @xl:grid-cols-2">
            {(aiItems ?? goal.items).slice(0, 12).map((it, i) => (
              <li key={i} className="flex justify-between border-b border-banana-100 py-1"><span>{prettyDay(it.date)}: {it.label}</span>{it.amount > 0 && <b>{rm(it.amount)}</b>}</li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-peel-500">Checkpoints move automatically when you change the target date or amount.</p>
        </section>
      )}

      <Feedback error={(days < 1 || !validDate ? localError : null) ?? act.error} notice={saved} />
      <div className="flex flex-wrap justify-end gap-3">
        {extraActions}
        <button className={btnPrimary} disabled={act.pending} onClick={save}>
          <Icon name="check" /> {act.pending ? 'Saving...' : submitLabel}
        </button>
      </div>
    </div>
  )
}
