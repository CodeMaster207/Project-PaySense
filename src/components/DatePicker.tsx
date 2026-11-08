'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { parseDay, prettyDay } from '@/lib/dates'
import { Icon } from './Icon'
import { MonthCalendar } from './MonthCalendar'

/** Date field that opens the shared mini calendar instead of the browser's native picker. */
export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'Pick a date',
  ariaLabel,
  clearable,
}: {
  value: string
  onChange: (day: string) => void
  min?: string
  max?: string
  placeholder?: string
  ariaLabel?: string
  /** Shows a clear button when a date is set (onChange receives ''). */
  clearable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => (value ? parseDay(value) : new Date()))
  const box = useRef<HTMLDivElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  // The calendar is portaled to <body> and positioned against the field, so no card's overflow can clip it.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = box.current?.getBoundingClientRect()
      if (!r) return
      const w = 288
      const h = pop.current?.offsetHeight ?? 340
      const below = r.bottom + 4
      const top = below + h > window.innerHeight && r.top - h - 4 > 0 ? r.top - h - 4 : below
      setPos({ top: Math.max(8, top), left: Math.min(Math.max(8, r.left), window.innerWidth - w - 8) })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, month])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const t = e.target as Node
      if (!box.current?.contains(t) && !pop.current?.contains(t)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open && value) setMonth(parseDay(value))
          setOpen((o) => !o)
        }}
        className="flex w-full items-center justify-between gap-2 rounded-xl border-2 border-banana-200 bg-white px-3 py-2 text-left font-normal outline-none focus:border-banana-400 focus:shadow-[0_0_0_3px_#ffe13555]"
      >
        <span className={value ? '' : 'text-peel-500'}>{value ? prettyDay(value) : placeholder}</span>
        <Icon name="calendar" className="size-5 shrink-0 text-peel-500" />
      </button>
      {clearable && value && (
        <button type="button" aria-label="Clear date" onClick={() => onChange('')} className="absolute right-9 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-peel-500 hover:text-berry-500">
          <Icon name="close" className="size-4" />
        </button>
      )}
      {open &&
        createPortal(
          <div
            ref={pop}
            role="dialog"
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? 'visible' : 'hidden' }}
            className="fixed z-[100] w-72 rounded-2xl border-2 border-banana-200 bg-white p-3 font-normal text-peel-900 shadow-[0_4px_0_0_var(--color-banana-200)]"
          >
            <MonthCalendar
              size="sm"
              month={month}
              onMonth={setMonth}
              selected={value}
              inRange={(d) => (!min || d >= min) && (!max || d <= max)}
              onSelect={(d) => {
                onChange(d)
                setOpen(false)
              }}
            />
          </div>,
          document.body,
        )}
    </div>
  )
}
