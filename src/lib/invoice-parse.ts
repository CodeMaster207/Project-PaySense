export type InvoiceDraft = {
  email: string
  client: string
  amount: number
  /** ISO code when the text names one ("RM", "$", "USD"), otherwise null. */
  currency: string | null
  description: string
  dueDays: number
}

const SYMBOLS: Record<string, string> = {
  rm: 'MYR', myr: 'MYR', ringgit: 'MYR', '$': 'USD', 'us$': 'USD', usd: 'USD', dollar: 'USD', dollars: 'USD',
  '€': 'EUR', eur: 'EUR', euro: 'EUR', euros: 'EUR', '£': 'GBP', gbp: 'GBP', sgd: 'SGD', aud: 'AUD', cny: 'CNY',
  inr: 'INR', thb: 'THB', jpy: 'JPY', idr: 'IDR',
}
const CUR = 'RM|MYR|US\\$|USD|SGD|AUD|EUR|GBP|CNY|INR|THB|JPY|IDR|\\$|€|£|ringgit|dollars?|euros?'

const clean = (s: string) => s.replace(/\s+/g, ' ').replace(/^[\s,.\-–:]+|[\s,.\-–:]+$/g, '')
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

/** Reads a request like "invoice Acme RM500 for logo design, due in 14 days" without any AI. */
export function parseInvoiceText(input: string): InvoiceDraft | null {
  let text = input.trim().slice(0, 500)
  if (!text) return null

  const email = text.match(/[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+/)?.[0] ?? ''
  if (email) text = text.replace(email, ' ')

  let dueDays = 7
  const due = text.match(/\b(?:due|within)\s*(?:in\s+|on\s+)?(?:(\d+)\s*(days|day|weeks|week)|(today|tomorrow))|\bnet\s*(\d+)\b/i)
  if (due) {
    if (due[4]) dueDays = Number(due[4])
    else if (due[3]) dueDays = due[3].toLowerCase() === 'today' ? 0 : 1
    else dueDays = Number(due[1]) * (due[2].toLowerCase().startsWith('week') ? 7 : 1)
    text = text.replace(due[0], ' ')
  }
  dueDays = Math.min(90, Math.max(0, Math.round(dueDays)))

  // Amount: prefer a number with a currency next to it, otherwise the first plain number.
  const before = new RegExp(`(${CUR})\\s*(\\d[\\d,]*(?:\\.\\d+)?)`, 'i')
  const after = new RegExp(`(\\d[\\d,]*(?:\\.\\d+)?)\\s*(${CUR})\\b`, 'i')
  let amount = NaN
  let currency: string | null = null
  let matched = ''
  const a = text.match(before)
  const b = text.match(after)
  if (a) {
    amount = Number(a[2].replace(/,/g, ''))
    currency = SYMBOLS[a[1].toLowerCase()] ?? null
    matched = a[0]
  } else if (b) {
    amount = Number(b[1].replace(/,/g, ''))
    currency = SYMBOLS[b[2].toLowerCase()] ?? null
    matched = b[0]
  } else {
    const plain = text.match(/\d[\d,]*(?:\.\d+)?/)
    if (plain) {
      amount = Number(plain[0].replace(/,/g, ''))
      matched = plain[0]
    }
  }
  if (!Number.isFinite(amount) || amount <= 0) return null

  const idx = text.indexOf(matched)
  const head = text.slice(0, idx)
  const tail = text.slice(idx + matched.length)

  // Client: the words between the verb ("invoice", "bill") and the amount.
  const client = clean(head.replace(/^\s*(?:please\s+)?(?:send\s+)?(?:an?\s+)?(?:invoice|bill|charge|request(?:\s+payment)?(?:\s+from)?)\s+/i, '').replace(/\b(?:to|for)\s*$/i, '').replace(/^\s*(?:to|from)\s+/i, ''))
  const forMatch = tail.match(/\bfor\s+(.+)$/i) ?? head.match(/\bfor\s+(.+)$/i)
  const what = clean(forMatch?.[1] ?? clean(tail))
  const description = what ? (client ? `${cap(what)} for ${client}` : cap(what)) : client ? `Payment from ${client}` : 'Payment request'

  return { email, client, amount: Math.round(amount * 100) / 100, currency, description: description.slice(0, 120), dueDays }
}
