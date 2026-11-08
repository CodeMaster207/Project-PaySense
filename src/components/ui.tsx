'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ActionResult } from '@/lib/types'
import { localize } from '@/lib/money'
import { Icon, type IconName } from './Icon'

export const card = 'rounded-2xl border-2 border-banana-200 bg-white shadow-[0_4px_0_0_var(--color-banana-200)]'
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl border-2 border-peel-900 bg-banana-300 px-4 py-2 font-bold text-peel-900 shadow-[0_3px_0_0_var(--color-peel-900)] transition active:translate-y-0.5 active:shadow-none hover:bg-banana-400'
export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-xl border-2 border-banana-300 bg-white px-4 py-2 font-bold text-peel-700 transition hover:bg-banana-100'
export const btnDanger =
  'inline-flex items-center justify-center gap-2 rounded-xl border-2 border-berry-500 bg-berry-100 px-4 py-2 font-bold text-berry-500 transition hover:bg-berry-500 hover:text-white'

/** Runs a server action, surfaces its error, and refreshes server data on success. */
export function useAction() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  function run<T>(fn: () => Promise<ActionResult<T>>, onDone?: (r: Extract<ActionResult<T>, { ok: true }>) => void) {
    setError(null)
    setNotice(null)
    start(async () => {
      try {
        const r = await fn()
        if (!r.ok) return setError(r.error)
        if (r.message) setNotice(r.message)
        onDone?.(r)
        router.refresh()
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }
  return { run, pending, error, notice, setError }
}

export function Feedback({ error, notice }: { error?: string | null; notice?: string | null }) {
  if (!error && !notice) return null
  return (
    <p role="status" className={`rounded-xl px-3 py-2 text-sm font-semibold ${error ? 'bg-berry-100 text-berry-500' : 'bg-leaf-100 text-leaf-700'}`}>
      {localize((error ?? notice) as string)}
    </p>
  )
}

export function PageTitle({ icon, title, sub }: { icon: IconName; title: string; sub?: string }) {
  return (
    <header className="mb-6 flex items-center gap-3">
      <span className="grid size-11 place-items-center rounded-2xl bg-banana-300 text-peel-900">
        <Icon name={icon} className="size-6" />
      </span>
      <div>
        <h1 className="text-2xl font-extrabold leading-tight">{title}</h1>
        {sub && <p className="text-sm text-peel-700">{sub}</p>}
      </div>
    </header>
  )
}
