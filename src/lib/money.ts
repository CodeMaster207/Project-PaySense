export const CURRENCIES = [
  { code: 'MYR', symbol: 'RM', label: 'Malaysian Ringgit', decimals: 2 },
  { code: 'USD', symbol: '$', label: 'US Dollar', decimals: 2 },
  { code: 'EUR', symbol: '€', label: 'Euro', decimals: 2 },
  { code: 'GBP', symbol: '£', label: 'British Pound', decimals: 2 },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar', decimals: 2 },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar', decimals: 2 },
  { code: 'CNY', symbol: 'CN¥', label: 'Chinese Yuan', decimals: 2 },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee', decimals: 2 },
  { code: 'THB', symbol: '฿', label: 'Thai Baht', decimals: 2 },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen', decimals: 0 },
  { code: 'IDR', symbol: 'Rp', label: 'Indonesian Rupiah', decimals: 0 },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]['code']
export const isCurrency = (c: unknown): c is CurrencyCode => CURRENCIES.some((x) => x.code === c)

// Amounts are stored in Malaysian Ringgit (the base) and converted for display.
// Indicative rates, used until live ones load. 1 MYR = x currency.
export const FALLBACK_RATES: Record<string, number> = {
  MYR: 1, USD: 0.21, EUR: 0.195, GBP: 0.165, SGD: 0.285, AUD: 0.325, CNY: 1.52, INR: 18, THB: 7.4, JPY: 32, IDR: 3500,
}

let current: (typeof CURRENCIES)[number] = CURRENCIES[0]
let rates: Record<string, number> = FALLBACK_RATES
let rateSource: 'live' | 'estimate' = 'estimate'

export function setCurrency(code: string, nextRates?: Record<string, number>, source?: 'live' | 'estimate') {
  current = CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0]
  if (nextRates) rates = { ...FALLBACK_RATES, ...nextRates }
  if (source) rateSource = source
}
export const currencySymbol = () => current.symbol
export const currentCode = () => current.code
export const rate = () => rates[current.code] ?? 1
export const rateOrigin = () => rateSource
/** Base (MYR) amount -> display amount. */
export const toDisplay = (n: number) => n * rate()
/** Display amount typed by the user -> base (MYR) amount for storage. */
export const toBase = (n: number) => Number((n / rate()).toFixed(4))

const fmt = (display: number) =>
  `${current.symbol}${display.toLocaleString('en-US', { minimumFractionDigits: current.decimals, maximumFractionDigits: current.decimals })}`
/** Formats a base (MYR) amount in the display currency. */
export const money = (n: number) => fmt(n * rate())

/** Converts "RM12.50" amounts inside generated text (summaries, messages, AI replies) to the display currency. */
export const localize = (text: string) =>
  current.code === 'MYR' ? text : text.replace(/\bRM\s?(-?[\d,]+(?:\.\d+)?)/g, (_, n: string) => fmt(Number(n.replace(/,/g, '')) * rate()))
