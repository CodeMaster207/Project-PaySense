import 'server-only'
import { CURRENCIES, FALLBACK_RATES } from './money'

/** Live MYR rates (cached for 12h). Falls back to indicative rates when offline. */
export async function getRates(): Promise<{ rates: Record<string, number>; source: 'live' | 'estimate' }> {
  try {
    const symbols = CURRENCIES.map((c) => c.code).filter((c) => c !== 'MYR').join(',')
    const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=MYR&symbols=${symbols}`, {
      next: { revalidate: 43200 },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) throw new Error('rate request failed')
    const json = (await res.json()) as { rates?: Record<string, number> }
    const live = Object.fromEntries(Object.entries(json.rates ?? {}).filter(([, v]) => Number.isFinite(v) && v > 0))
    if (!Object.keys(live).length) throw new Error('no rates')
    return { rates: { ...FALLBACK_RATES, ...live, MYR: 1 }, source: 'live' }
  } catch {
    return { rates: FALLBACK_RATES, source: 'estimate' }
  }
}
