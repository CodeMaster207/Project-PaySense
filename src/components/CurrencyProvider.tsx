'use client'

import { setCurrency } from '@/lib/money'

/** Applies the user's display currency and rates before any child renders (browser-side module state). */
export function CurrencyProvider({
  code,
  rates,
  source,
  children,
}: {
  code: string
  rates: Record<string, number>
  source: 'live' | 'estimate'
  children: React.ReactNode
}) {
  setCurrency(code, rates, source)
  return <>{children}</>
}
