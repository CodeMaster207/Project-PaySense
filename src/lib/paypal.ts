import 'server-only'
import { addDays, today } from './dates'

const BASE = 'https://api-m.sandbox.paypal.com'

export type PayPalTxn = {
  externalId: string
  date: string
  business: string
  amount: number // positive = money in, negative = money out
  kind: 'income' | 'expense' | 'subscription'
  status: 'active' | 'cancelled'
}

export const paypalConfigured = () => Boolean(process.env.PAYPAL_ACCESS_TOKEN || (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET))

export class PayPalUnreachable extends Error {}

async function token() {
  // A pre-issued sandbox access token (valid about 9 hours) skips the OAuth POST, which some hosts block.
  if (process.env.PAYPAL_ACCESS_TOKEN) return process.env.PAYPAL_ACCESS_TOKEN.trim()
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  if (res.status === 401 || res.status === 400) throw new Error('PayPal sandbox rejected the Client ID or Secret. Check they come from the Sandbox tab of the same app.')
  // Anything else (e.g. 520 "Origin is disallowed" from an edge proxy) means PayPal was not reached, not that the keys are wrong.
  if (!res.ok) throw new PayPalUnreachable(`PayPal sandbox could not be reached from this server (HTTP ${res.status}). Your keys were not checked. Some hosts block outbound POST requests; set PAYPAL_ACCESS_TOKEN to use a pre-issued sandbox token instead.`)
  return (await res.json()).access_token as string
}

/** Confirms the sandbox app credentials work. */
export async function checkPayPalConnection() {
  if (!paypalConfigured()) return { ok: false as const, error: 'PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set.' }
  try {
    const t = await token()
    if (process.env.PAYPAL_ACCESS_TOKEN) {
      // Verify the pre-issued token with a small read-only call.
      const day = today()
      const res = await fetch(`${BASE}/v1/reporting/transactions?start_date=${day}T00:00:00-0000&end_date=${day}T23:59:59-0000&page_size=1`, { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' })
      if (res.status === 401) return { ok: false as const, error: 'The PayPal access token was rejected or has expired (they last about 9 hours). Generate a new PAYPAL_ACCESS_TOKEN.' }
    }
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, unreachable: e instanceof PayPalUnreachable, error: e instanceof Error ? e.message : 'PayPal connection failed.' }
  }
}

type RawTxn = {
  transaction_info?: {
    transaction_id?: string
    transaction_event_code?: string
    transaction_initiation_date?: string
    transaction_amount?: { value?: string }
    transaction_subject?: string
    transaction_status?: string
    billing_agreement_id?: string
  }
  payer_info?: { payer_name?: { alternate_full_name?: string } }
  shipping_info?: { name?: string }
}

/** Reads sandbox transactions (the Reporting API caps one request at 31 days, so we page by window). */
export async function fetchSandboxTransactions(days = 90): Promise<PayPalTxn[]> {
  const t = await token()
  const out: PayPalTxn[] = []
  const end = today()
  for (let offset = 0; offset < days; offset += 31) {
    const to = addDays(end, -offset)
    const from = addDays(to, -30)
    const url = `${BASE}/v1/reporting/transactions?start_date=${from}T00:00:00-0000&end_date=${to}T23:59:59-0000&fields=all&page_size=100`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' })
    if (res.status === 401) throw new Error('The PayPal access token was rejected or has expired. Generate a new one.')
    if (!res.ok) throw new Error(`PayPal transaction search failed (${res.status}). Enable "Transaction Search" on the sandbox app.`)
    const json = (await res.json()) as { transaction_details?: RawTxn[] }
    for (const row of json.transaction_details ?? []) {
      const info = row.transaction_info
      if (!info?.transaction_id || !info.transaction_amount?.value || !info.transaction_initiation_date) continue
      const amount = Number(info.transaction_amount.value)
      if (!Number.isFinite(amount) || amount === 0) continue
      const isSub = Boolean(info.billing_agreement_id) || info.transaction_event_code?.startsWith('T0002')
      out.push({
        externalId: info.transaction_id,
        date: info.transaction_initiation_date.slice(0, 10),
        business:
          info.transaction_subject ||
          row.payer_info?.payer_name?.alternate_full_name ||
          row.shipping_info?.name ||
          'PayPal transaction',
        amount,
        kind: isSub && amount < 0 ? 'subscription' : amount < 0 ? 'expense' : 'income',
        status: info.transaction_status === 'V' || info.transaction_status === 'D' ? 'cancelled' : 'active',
      })
    }
  }
  return out
}

/** Offline sample used when sandbox credentials are not configured, so the demo still runs. */
export function demoTransactions(): PayPalTxn[] {
  const d = (n: number) => addDays(today(), -n)
  return [
    { externalId: 'demo-1', date: d(2), business: 'Spotify Premium', amount: -16.9, kind: 'subscription', status: 'active' },
    { externalId: 'demo-2', date: d(4), business: 'Netflix', amount: -55, kind: 'subscription', status: 'active' },
    { externalId: 'demo-3', date: d(6), business: 'Freelance design payout', amount: 850, kind: 'income', status: 'active' },
    { externalId: 'demo-4', date: d(9), business: 'GrabFood', amount: -32.5, kind: 'expense', status: 'active' },
    { externalId: 'demo-5', date: d(12), business: 'Adobe Creative Cloud', amount: -92, kind: 'subscription', status: 'active' },
    { externalId: 'demo-6', date: d(15), business: 'Shopee order', amount: -128.4, kind: 'expense', status: 'active' },
    { externalId: 'demo-7', date: d(20), business: 'Gym membership', amount: -120, kind: 'subscription', status: 'cancelled' },
    { externalId: 'demo-8', date: d(24), business: 'Refund - Lazada', amount: 45, kind: 'income', status: 'active' },
  ]
}

export const categoryFor = (name: string) => {
  const n = name.toLowerCase()
  if (/netflix|spotify|disney|youtube|hbo|viu|music/.test(n)) return 'Streaming'
  if (/adobe|microsoft|github|notion|google|icloud|dropbox|chatgpt|openai/.test(n)) return 'Software'
  if (/shopee|lazada|amazon|grab|foodpanda/.test(n)) return 'Shopping'
  if (/tnb|unifi|maxis|celcom|digi|water|gym/.test(n)) return 'Utilities'
  return 'Other'
}
