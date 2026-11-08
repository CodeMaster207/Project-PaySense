// Seeds your PayPal SANDBOX with realistic payments so PaySense has data to show.
//
//   pnpm seed:sandbox -- --dry-run         show the plan, send nothing
//   pnpm seed:sandbox                      send everything
//   pnpm seed:sandbox -- --only=incoming   card payments from customers only
//   pnpm seed:sandbox -- --only=outgoing   payouts only (needs SEED_PAYOUT_EMAIL)
//
// Incoming payments are test-card orders charged to your sandbox Business account.
// Outgoing payments are payouts to the sandbox Personal account in SEED_PAYOUT_EMAIL.
// Sandbox only, no real money. PayPal dates everything today, so it cannot be back-dated.
import { existsSync, writeFileSync } from 'node:fs'

const BASE = 'https://api-m.sandbox.paypal.com'
const MARKER = '.seed-sandbox-done'
const args = process.argv.slice(2)
const dry = args.includes('--dry-run')
const force = args.includes('--force')
const only = args.find((a) => a.startsWith('--only='))?.slice(7)

// Customers who pay you. Acme Studio is deliberately over half of the total, to show the client warning.
const INCOMING = [
  { client: 'Acme Studio', note: 'Logo design', usd: 450 },
  { client: 'Acme Studio', note: 'Brand guidelines', usd: 380 },
  { client: 'Acme Studio', note: 'Packaging mockups', usd: 320 },
  { client: 'Sunrise Cafe', note: 'Monthly social media', usd: 180 },
  { client: 'Sunrise Cafe', note: 'Menu redesign', usd: 160 },
  { client: 'Kim Photography', note: 'Website banner set', usd: 280 },
  { client: 'Lee Tutoring', note: 'Landing page copy', usd: 85 },
  { client: 'Northwind Retail', note: 'Product label design', usd: 170 },
]

// Money you pay out: suppliers, tools and contractors.
const OUTGOING = [
  { note: 'Contractor - illustrator', usd: 120 },
  { note: 'Packaging supplies', usd: 64.5 },
  { note: 'Design software subscription', usd: 29 },
  { note: 'Shipping labels', usd: 18.75 },
]

const need = (name) => {
  const v = process.env[name]
  if (!v) {
    console.error(`Missing ${name}. Run this with: pnpm seed:sandbox (it reads .env.local).`)
    process.exit(1)
  }
  return v
}

async function token() {
  const auth = Buffer.from(`${need('PAYPAL_CLIENT_ID')}:${need('PAYPAL_CLIENT_SECRET')}`).toString('base64')
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`Could not get a PayPal token (${res.status}). Check your sandbox credentials.`)
  return (await res.json()).access_token
}

async function card(access, p, n) {
  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': `paysense-seed-v1-in-${n}` },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ description: `${p.note} - ${p.client}`, amount: { currency_code: 'USD', value: p.usd.toFixed(2) } }],
      payment_source: { card: { number: '4111111111111111', expiry: '2030-12', security_code: '123', name: p.client } },
    }),
  })
  const j = await res.json().catch(() => ({}))
  const cap = j.purchase_units?.[0]?.payments?.captures?.[0]
  if (!res.ok || cap?.status !== 'COMPLETED') throw new Error(`${res.status} ${j.details?.[0]?.description ?? j.message ?? j.status ?? 'not completed'}`)
  return `fee ${cap.seller_receivable_breakdown?.paypal_fee?.value ?? '0.00'}, net ${cap.seller_receivable_breakdown?.net_amount?.value ?? p.usd.toFixed(2)}`
}

async function payout(access, p, n, email) {
  const res = await fetch(`${BASE}/v1/payments/payouts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender_batch_header: { sender_batch_id: `paysense-seed-v1-out-${n}-${Date.now()}`, email_subject: 'Payment from PaySense seed', recipient_type: 'EMAIL' },
      items: [{ recipient_type: 'EMAIL', receiver: email, amount: { value: p.usd.toFixed(2), currency: 'USD' }, note: p.note, sender_item_id: `seed-${n}` }],
    }),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${res.status} ${j.details?.[0]?.description ?? j.message ?? 'payout failed'}`)
  return `batch ${j.batch_header?.payout_batch_id ?? ''}`
}

async function main() {
  const doIn = only !== 'outgoing'
  const doOut = only !== 'incoming'
  const email = process.env.SEED_PAYOUT_EMAIL ?? ''
  const inTotal = INCOMING.reduce((a, p) => a + p.usd, 0)
  const outTotal = OUTGOING.reduce((a, p) => a + p.usd, 0)

  console.log(dry ? 'DRY RUN: nothing will be sent.\n' : 'Seeding the PayPal SANDBOX.\n')
  if (doIn) {
    console.log(`Incoming card payments (${INCOMING.length}, USD ${inTotal.toFixed(2)}):`)
    for (const p of INCOMING) console.log(`  + ${p.usd.toFixed(2).padStart(8)}  ${p.client} - ${p.note}`)
    const top = INCOMING.filter((p) => p.client === 'Acme Studio').reduce((a, p) => a + p.usd, 0)
    console.log(`  Acme Studio would be ${Math.round((top / inTotal) * 100)}% of this income.\n`)
  }
  if (doOut) {
    console.log(`Outgoing payouts (${OUTGOING.length}, USD ${outTotal.toFixed(2)}) to ${email || '(SEED_PAYOUT_EMAIL not set: skipped)'}:`)
    for (const p of OUTGOING) console.log(`  - ${p.usd.toFixed(2).padStart(8)}  ${p.note}`)
    console.log()
  }
  if (dry) return

  if (existsSync(MARKER) && !force) {
    console.error(`Already seeded (found ${MARKER}). Run with --force to send them again.`)
    process.exit(1)
  }
  const access = await token()
  let ok = 0
  let failed = 0
  if (doIn) {
    for (const [i, p] of INCOMING.entries()) {
      try {
        console.log(`  received ${p.usd.toFixed(2)} from ${p.client}: ${await card(access, p, i)}`)
        ok++
      } catch (e) {
        console.log(`  FAILED   ${p.client} ${p.usd}: ${e.message}`)
        failed++
      }
    }
  }
  if (doOut && email) {
    for (const [i, p] of OUTGOING.entries()) {
      try {
        console.log(`  paid out ${p.usd.toFixed(2)} (${p.note}): ${await payout(access, p, i, email)}`)
        ok++
      } catch (e) {
        console.log(`  FAILED   ${p.note}: ${e.message}`)
        failed++
      }
    }
  }
  if (ok) writeFileSync(MARKER, new Date().toISOString())
  console.log(`\nDone: ${ok} sent, ${failed} failed. PayPal can take up to a few hours to show them in Transaction Search, so press Resync later.`)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
