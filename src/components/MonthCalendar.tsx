'use client'

import { iso, today } from '@/lib/dates'
import { Icon } from './Icon'

/** Month grid. `inRange` dims outside days; `dayState` colors funded or skipped days. */
export function MonthCalendar({
  month,
  onMonth,
  selected,
  onSelect,
  inRange,
  dayState,
  size = 'md',
}: {
  month: Date
  onMonth?: (d: Date) => void
  selected: string
  onSelect: (day: string) => void
  inRange?: (day: string) => boolean
  dayState?: (day: string) => 'skip' | 'fund' | 'deficit' | undefined
  /** 'sm' mini-scales the grid for side panels and editors. */
  size?: 'sm' | 'md'
}) {
  const sm = size === 'sm'
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const lead = (first.getDay() + 6) % 7 // week starts Monday
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)]
  const t = today()
  return (
    <div className={sm ? 'w-full max-w-[20rem]' : undefined}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className={sm ? 'text-sm font-extrabold' : 'font-extrabold'}>{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h3>
        {onMonth && (
          <div className="flex gap-1">
            <button type="button" aria-label="Previous month" className="rounded-lg p-1 hover:bg-banana-100" onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
              <Icon name="left" />
            </button>
            <button type="button" aria-label="Next month" className="rounded-lg p-1 hover:bg-banana-100" onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
              <Icon name="right" />
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-peel-500">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <span key={i} />
          const day = iso(new Date(month.getFullYear(), month.getMonth(), c))
          const ok = inRange ? inRange(day) : true
          const sel = day === selected
          const st = dayState?.(day)
          return (
            <button
              key={i}
              type="button"
              disabled={!ok}
              onClick={() => onSelect(day)}
              className={`relative ${sm ? 'h-8 rounded-md text-xs' : 'aspect-square rounded-lg text-sm'} border-2 font-bold transition ${sel ? (st === 'deficit' ? 'border-peel-900 bg-red-500 text-white' : 'border-peel-900 bg-banana-300') : st === 'deficit' ? 'border-red-700 bg-red-500 text-white' : st === 'skip' ? 'border-berry-500/40 bg-berry-100 text-berry-500 line-through' : st === 'fund' ? 'border-transparent bg-leaf-100 hover:bg-leaf-100/70' : 'border-transparent bg-banana-50 hover:bg-banana-100'} ${day === t && !sel ? 'ring-2 ring-banana-500 ring-offset-1' : ''} ${!ok ? 'opacity-30' : ''}`}
            >
              {c}
            </button>
          )
        })}
      </div>
    </div>
  )
}
