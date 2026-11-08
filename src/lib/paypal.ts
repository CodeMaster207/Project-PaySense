import 'server-only'
import { addDays, today } from './dates'
import { getRates } from './rates'

const BASE = 'https://api-m.sandbox.paypal.com'

export type PayPalTxn = {
  externalId: string
  date: string
  business: string
  amount: number // positive = money in, negative = money out
  kind: 'income' | 'expense' | 'subscription'
  status: 'active' | 'cancelled'
  /** PayPal Billing Subscriptions ID (starts with I-), when the payment belongs to one. */
  subscriptionId?: string
  /** `amount` is converted to the app's base currency (RM); these keep what PayPal reported. */
  currency: string
  originalAmount: number
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
    transaction_amount?: { value?: string; currency_code?: string }
    transaction_subject?: string
    transaction_status?: string
    billing_agreement_id?: string
    paypal_reference_id?: string
    paypal_reference_id_type?: string
  }
  payer_info?: { payer_name?: { alternate_full_name?: string } }
  shipping_info?: { name?: string }
}

/** Reads sandbox transactions (the Reporting API caps one request at 31 days, so we page by window). */
export async function fetchSandboxTransactions(days = 90): Promise<PayPalTxn[]> {
  const t = await token()
  const { rates } = await getRates()
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
      const currency = (info.transaction_amount.currency_code ?? 'MYR').toUpperCase()
      const isSub = Boolean(info.billing_agreement_id) || info.transaction_event_code?.startsWith('T0002')
      const subscriptionId = [info.paypal_reference_id, info.billing_agreement_id].find((v) => v?.startsWith('I-'))
      out.push({
        ...(subscriptionId ? { subscriptionId } : {}),
        externalId: info.transaction_id,
        date: info.transaction_initiation_date.slice(0, 10),
        business:
          info.transaction_subject ||
          row.payer_info?.payer_name?.alternate_full_name ||
          row.shipping_info?.name ||
          'PayPal transaction',
        // Convert to RM (rates are 1 MYR = x currency). A currency we have no rate for is kept as reported.
        amount: Math.round((amount / (rates[currency] ?? 1)) * 100) / 100,
        currency,
        originalAmount: amount,
        kind: isSub && amount < 0 ? 'subscription' : amount < 0 ? 'expense' : 'income',
        status: info.transaction_status === 'V' || info.transaction_status === 'D' ? 'cancelled' : 'active',
      })
    }
  }
  return out
}

/**
 * The connected PayPal account's ID and the currency it holds (its primary balance). PayPal does not share the
 * account email with this kind of app connection, so the ID is what identifies the account.
 */
export async function accountInfo(): Promise<{ id: string | null; currency: string | null }> {
  try {
    const res = await fetch(`${BASE}/v1/reporting/balances?currency_code=ALL`, { headers: { Authorization: `Bearer ${await token()}` }, cache: 'no-store' })
    if (!res.ok) return { id: null, currency: null }
    const json = (await res.json()) as { account_id?: string; balances?: { currency?: string; primary?: boolean }[] }
    const balances = json.balances ?? []
    return { id: json.account_id ?? null, currency: (balances.find((b) => b.primary) ?? balances[0])?.currency?.toUpperCase() ?? null }
  } catch {
    return { id: null, currency: null }
  }
}

export const accountCurrency = async () => (await accountInfo()).currency

async function invoiceError(res: Response) {
  if (res.status === 401 || res.status === 403) return 'PayPal refused the request. Turn on "Invoicing" for your sandbox app (Apps & Credentials, your app, Features) and try again.'
  let detail = ''
  try {
    const j = (await res.json()) as { message?: string; details?: { description?: string; issue?: string }[] }
    detail = j.details?.[0]?.description ?? j.details?.[0]?.issue ?? j.message ?? ''
  } catch {}
  return `PayPal could not create the request (${res.status})${detail ? `: ${detail}` : ''}`
}

/** Creates a PayPal invoice for a recipient's PayPal email and sends it. Returns the invoice ID. */
export async function sendPaymentRequest(input: { email: string; amount: number; currency: string; description: string; dueDate: string }) {
  const headers = { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' }
  const create = await fetch(`${BASE}/v2/invoicing/invoices`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      detail: {
        currency_code: input.currency,
        note: input.description,
        invoice_date: today(),
        payment_term: { term_type: 'DUE_ON_DATE_SPECIFIED', due_date: input.dueDate },
      },
      primary_recipients: [{ billing_info: { email_address: input.email } }],
      items: [{ name: input.description.slice(0, 200), quantity: '1', unit_amount: { currency_code: input.currency, value: input.amount.toFixed(2) } }],
    }),
    cache: 'no-store',
  })
  if (!create.ok) throw new Error(await invoiceError(create))
  const id = (((await create.json()) as { href?: string }).href ?? '').split('/').pop() ?? ''
  if (!id) throw new Error('PayPal did not return an invoice ID.')
  const send = await fetch(`${BASE}/v2/invoicing/invoices/${encodeURIComponent(id)}/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ send_to_recipient: true }),
    cache: 'no-store',
  })
  if (!send.ok) throw new Error(await invoiceError(send))
  return { id }
}

/** Sends money to a PayPal ID or email with the Payouts API. Returns the batch and, when PayPal already has it, the transaction ID. */
export async function sendPayout(input: { recipient: string; amount: number; currency: string; note: string; reference: string }) {
  const headers = { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' }
  const res = await fetch(`${BASE}/v1/payments/payouts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sender_batch_header: { sender_batch_id: input.reference, email_subject: 'You have received a payment', recipient_type: input.recipient.includes('@') ? 'EMAIL' : 'PAYPAL_ID' },
      items: [
        {
          recipient_type: input.recipient.includes('@') ? 'EMAIL' : 'PAYPAL_ID',
          receiver: input.recipient,
          amount: { value: input.amount.toFixed(2), currency: input.currency },
          note: input.note.slice(0, 200),
          sender_item_id: input.reference,
        },
      ],
    }),
    cache: 'no-store',
  })
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('PayPal refused the payment. Turn on "Payouts" for your sandbox app (Apps & Credentials, your app, Features) and try again.')
    let detail = ''
    try {
      const j = (await res.json()) as { message?: string; details?: { issue?: string; description?: string }[] }
      detail = j.details?.[0]?.description ?? j.details?.[0]?.issue ?? j.message ?? ''
    } catch {}
    throw new Error(`PayPal could not send the payment (${res.status})${detail ? `: ${detail}` : ''}`)
  }
  const batchId = ((await res.json()) as { batch_header?: { payout_batch_id?: string } }).batch_header?.payout_batch_id ?? ''
  if (!batchId) throw new Error('PayPal did not return a payout reference.')
  // Sandbox payouts usually settle within seconds. Look for the transaction ID so a later sync does not import the same payment again.
  for (let i = 0; i < 4; i++) {
    await new Promise((r) => setTimeout(r, 1200))
    const d = await fetch(`${BASE}/v1/payments/payouts/${encodeURIComponent(batchId)}`, { headers, cache: 'no-store' })
    if (!d.ok) continue
    const item = ((await d.json()) as { items?: { transaction_id?: string; transaction_status?: string; errors?: { message?: string } }[] }).items?.[0]
    if (item?.errors?.message) throw new Error(`PayPal could not complete the payment: ${item.errors.message}`)
    if (item?.transaction_id) return { batchId, transactionId: item.transaction_id, status: item.transaction_status ?? 'SUCCESS' }
  }
  return { batchId, transactionId: null, status: 'PENDING' }
}

/** Maps PayPal's invoice status to the three states the app shows. */
export async function paymentRequestStatus(id: string): Promise<'sent' | 'paid' | 'cancelled'> {
  const res = await fetch(`${BASE}/v2/invoicing/invoices/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${await token()}` }, cache: 'no-store' })
  if (!res.ok) throw new Error(`PayPal could not return the invoice (${res.status}).`)
  const status = ((await res.json()) as { status?: string }).status ?? ''
  if (status === 'PAID' || status === 'MARKED_AS_PAID') return 'paid'
  if (status === 'CANCELLED' || status === 'REFUNDED' || status === 'MARKED_AS_REFUNDED') return 'cancelled'
  return 'sent'
}

/** Cancels a PayPal sandbox subscription (Billing Subscriptions API). Throws with PayPal's reason on failure. */
export async function cancelPayPalSubscription(id: string, reason: string) {
  const t = await token()
  const res = await fetch(`${BASE}/v1/billing/subscriptions/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: reason.slice(0, 128) }),
    cache: 'no-store',
  })
  if (res.ok) return
  let detail = ''
  try {
    detail = ((await res.json()) as { message?: string }).message ?? ''
  } catch {}
  throw new Error(`PayPal returned ${res.status}${detail ? `: ${detail}` : ''}`)
}

export const categoryFor = (name: string) => {
  const n = name.toLowerCase()
  if (/netflix|spotify|disney|youtube|hbo|viu|music/.test(n)) return 'Streaming'
  if (/adobe|microsoft|github|notion|google|icloud|dropbox|chatgpt|openai/.test(n)) return 'Software'
  if (/shopee|lazada|amazon|grab|foodpanda/.test(n)) return 'Shopping'
  if (/tnb|unifi|maxis|celcom|digi|water|gym/.test(n)) return 'Utilities'
  return 'Other'
}
