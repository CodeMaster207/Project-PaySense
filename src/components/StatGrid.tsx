'use client'

import { useLayoutEffect, useRef, useState } from 'react'

export type Stat = { label: string; value: string; tone?: string; cell?: string }

/**
 * Statistic boxes that adapt to their figures: four columns, then 2x2 if any figure would be
 * cut off, then a single column (where a very long figure may finally wrap).
 */
export function StatGrid({ items, valueClass = 'text-lg' }: { items: Stat[]; valueClass?: string }) {
  const ref = useRef<HTMLDListElement>(null)
  const [cols, setCols] = useState<4 | 2 | 1>(4)
  const signature = items.map((i) => i.value).join('|')

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      const values = [...el.querySelectorAll('dd')] as HTMLElement[]
      let chosen: 4 | 2 | 1 = 1
      for (const c of [4, 2, 1] as const) {
        el.style.gridTemplateColumns = `repeat(${c}, minmax(0, 1fr))`
        values.forEach((v) => (v.style.whiteSpace = 'nowrap'))
        const over = values.some((v) => v.scrollWidth > v.clientWidth)
        if (!over || c === 1) {
          chosen = c
          break
        }
      }
      values.forEach((v) => (v.style.whiteSpace = ''))
      el.style.gridTemplateColumns = ''
      setCols(chosen)
    }
    fit()
    let width = el.clientWidth
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== width) {
        width = el.clientWidth
        fit()
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [signature])

  return (
    <dl
      ref={ref}
      className="grid gap-3 text-sm"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {items.map((i) => (
        <div key={i.label} className={`min-w-0 rounded-xl px-4 py-2 ${i.cell ?? 'bg-banana-50'}`}>
          <dt className="font-bold opacity-80">{i.label}</dt>
          <dd className={`font-extrabold ${valueClass} ${i.tone ?? ''} ${cols === 1 ? '[overflow-wrap:anywhere]' : 'whitespace-nowrap'}`}>{i.value}</dd>
        </div>
      ))}
    </dl>
  )
}
