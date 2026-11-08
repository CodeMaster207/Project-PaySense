'use server'

import type { Where } from 'payload'
import { getPayloadClient } from '@/lib/payload'
import { endAppSession, getAppUser, startAppSession } from '@/lib/app-auth'
import { decryptKey, encryptKey, isProvider, PROVIDERS, revokeGoogleToken } from '@/lib/ai-config'
import { buildMonthReport } from '@/lib/report'
import { loadForecast } from '@/lib/forecast-input'
import { aiCategorize, aiChat, aiForecastAdvice, aiInsights, aiInvoiceDraft, aiMonthSummary, aiRequest, aiPickGoal, aiPlan, aiSuggestGoals, matchSubscription } from '@/lib/ai'
import { type PayPalTxn, accountCurrency, accountInfo, cancelPayPalSubscription, categoryFor, checkPayPalConnection, fetchSandboxTransactions, paymentRequestStatus, paypalConfigured, sendPaymentRequest, sendPayout } from '@/lib/paypal'
import { addDays, daysBetween, isDay, rm, today } from '@/lib/dates'
import { isCurrency } from '@/lib/money'
import { getRates } from '@/lib/rates'
import { asTagColor } from '@/lib/tagColors'
import { dailyFor, fundingDays, WEEKDAYS } from '@/lib/plan'
import { financeContext, loadEntries, loadGoals, loadSubscriptions } from '@/lib/data'
import type { ActionResult, GoalEditInput, Insight, PayPalMatch, PlanDraft, PlanItem } from '@/lib/types'

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error })
const msg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)

// ---------- auth ----------
export async function signInAction(email: string, password: string): Promise<ActionResult> {
  if (!email || !password) return fail('Enter your email and password.')
  const payload = await getPayloadClient()
  try {
    const res = await payload.login({ collection: 'users', data: { email: email.trim(), password } })
    if (!res.token) return fail('Could not sign in.')
    await startAppSession(res.token, res.exp)
    return { ok: true }
  } catch {
    return fail('Incorrect email or password.')
  }
}

export async function signUpAction(name: string, email: string, password: string): Promise<ActionResult> {
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Enter a valid email address.')
  if (password.length < 8) return fail('Password must be at least 8 characters.')
  const payload = await getPayloadClient()
  try {
    await payload.create({
      collection: 'users',
      data: { email: email.trim(), password, name: name.trim().slice(0, 80) },
      overrideAccess: false,
    })
  } catch (e) {
    return fail(msg(e, 'Could not create the account (email may already be used).'))
  }
  return signInAction(email, password)
}

export async function signOutAction(): Promise<ActionResult> {
  await endAppSession()
  return { ok: true }
}

async function requireUser() {
  const user = await getAppUser()
  if (!user) throw new Error('Please sign in first.')
  return user
}

export async function setCurrencyAction(code: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    if (!isCurrency(code)) return fail('Choose one of the listed currencies.')
    const payload = await getPayloadClient()
    await payload.update({ collection: 'users', id: user.id, user, overrideAccess: false, data: { currency: code } })
    return { ok: true }
  } catch (e) {
    return fail(msg(e, 'Could not save the currency.'))
  }
}

// ---------- entries ----------
export async function addEntryAction(input: { date: string; type: string; description: string; amount: number }): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const description = String(input.description ?? '').trim().slice(0, 120)
    const amount = Number(input.amount)
    if (!isDay(input.date)) return fail('Pick a valid date.')
    if (input.type !== 'income' && input.type !== 'expense') return fail('Invalid type.')
    if (!description) return fail('Add a description.')
    if (!Number.isFinite(amount) || amount <= 0) return fail('Amount must be greater than zero.')
    const payload = await getPayloadClient()
    await payload.create({
      collection: 'entries',
      user,
      overrideAccess: false,
      data: { owner: user.id, date: input.date, type: input.type, description, amount, source: 'manual' },
    })
    return { ok: true }
  } catch (e) {
    return fail(msg(e, 'Could not save the entry.'))
  }
}

/** Sends the money to a PayPal ID or email from your sandbox account, then records it as an expense. */
export async function sendPayPalExpenseAction(input: { date: string; description: string; amount: number; recipient: string }): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const description = String(input.description ?? '').trim().slice(0, 120)
    const recipient = String(input.recipient ?? '').trim()
    const amount = Math.round(Number(input.amount) * 100) / 100
    if (!description) return fail('Add a description.')
    if (!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) && recipient.length <= 120) && !/^[A-Z0-9]{13}$/.test(recipient)) {
      return fail('Enter the recipient\'s PayPal ID (13 letters and numbers) or their PayPal email.')
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return fail('Amount must be greater than zero.')
    if (input.date !== today()) return fail('PayPal payments are sent now, so select today\'s date first.')
    if (!paypalConfigured()) return fail(NO_PAYPAL)
    const currency = (await accountCurrency()) ?? (process.env.PAYPAL_INVOICE_CURRENCY || 'USD').toUpperCase()
    const fx = (await getRates()).rates[currency]
    if (!fx) return fail(`The app has no exchange rate for ${currency}, your PayPal account's currency.`)
    const sent = Math.round(amount * fx * 100) / 100
    if (sent <= 0) return fail('That amount is too small to send in this currency.')
    const out = await sendPayout({ recipient, amount: sent, currency, note: description, reference: crypto.randomUUID() })
    const payload = await getPayloadClient()
    await payload.create({
      collection: 'entries',
      user,
      overrideAccess: false,
      data: {
        owner: user.id,
        date: input.date,
        type: 'expense',
        description,
        amount,
        source: 'paypal',
        externalId: out.transactionId ?? `payout-${out.batchId}`,
        paypalAccountId: (await accountInfo()).id ?? undefined,
        originalCurrency: currency,
        originalAmount: sent,
      },
    })
    return {
      ok: true,
      message: out.transactionId
        ? `Sent ${currency} ${sent.toFixed(2)} to ${recipient} and recorded it.`
        : `Sent ${currency} ${sent.toFixed(2)} to ${recipient} and recorded it. PayPal is still processing it, so a later sync may list it again.`,
    }
  } catch (e) {
    return fail(msg(e, 'Could not send the payment.'))
  }
}

export async function deleteEntryAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const payload = await getPayloadClient()
    await payload.delete({ collection: 'entries', id, user, overrideAccess: false })
    return { ok: true }
  } catch (e) {
    return fail(msg(e, 'Could not delete the entry.'))
  }
}

// ---------- PayPal ----------
const NO_PAYPAL = 'PayPal sandbox credentials are not set. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env.local and restart the server.'

export async function connectPayPalAction(): Promise<ActionResult<{ mode: 'sandbox' }>> {
  try {
    const user = await requireUser()
    if (!paypalConfigured()) return fail(NO_PAYPAL)
    const check = await checkPayPalConnection()
    if (!check.ok) return fail(check.error)
    const payload = await getPayloadClient()
    // Server-owned status field: only this verified server path can set it.
    await payload.update({ collection: 'users', id: user.id, data: { paypalStatus: 'connected' }, overrideAccess: true })
    return { ok: true, data: { mode: 'sandbox' } }
  } catch (e) {
    return fail(msg(e, 'Could not connect to PayPal.'))
  }
}

export async function syncPayPalAction(): Promise<ActionResult<{ imported: number; mode: 'sandbox' }>> {
  try {
    const user = await requireUser()
    if (!paypalConfigured()) return fail(NO_PAYPAL)
    const mode = 'sandbox' as const
    const txns = await fetchSandboxTransactions(90)
    const acct = await accountInfo()
    let note = ''
    const payload = await getPayloadClient()
    let imported = 0
    // Skip transactions already imported, whichever collection they landed in.
    const fresh = []
    for (const t of txns) {
      const found = await Promise.all(
        (['subscriptions', 'entries'] as const).map((collection) =>
          payload.find({ collection, user, overrideAccess: false, where: { externalId: { equals: t.externalId } }, limit: 1, depth: 0 }),
        ),
      )
      if (!found.some((r) => r.totalDocs)) fresh.push(t)
    }
    const labels = await aiCategorize(fresh.map((t) => ({ id: t.externalId, business: t.business, amount: t.amount, kind: t.kind })))
    if (labels) note += ` AI categorised ${labels.size} transaction${labels.size === 1 ? '' : 's'}.`
    for (const raw of fresh) {
      const label = labels?.get(raw.externalId)
      const t = label ? { ...raw, kind: label.kind } : raw
      if (t.kind === 'subscription') {
        await payload.create({
          collection: 'subscriptions',
          user,
          overrideAccess: false,
          data: {
            owner: user.id,
            name: t.business.slice(0, 80),
            category: (label?.category ?? categoryFor(t.business)) as 'Other',
            amount: Math.abs(t.amount),
            renewDate: t.status === 'active' ? addDays(t.date, 30) : undefined,
            terminationDate: t.status === 'cancelled' ? t.date : undefined,
            status: t.status,
            source: 'paypal',
            externalId: t.externalId,
            paypalSubscriptionId: t.subscriptionId,
            paypalAccountId: acct.id ?? undefined,
            originalCurrency: t.currency,
            originalAmount: Math.abs(t.originalAmount),
          },
        })
      } else {
        await payload.create({
          collection: 'entries',
          user,
          overrideAccess: false,
          data: {
            owner: user.id,
            date: t.date,
            type: t.kind === 'income' ? 'income' : 'expense',
            description: t.business.slice(0, 120),
            amount: Math.abs(t.amount),
            fee: t.fee,
            counterparty: t.counterparty || undefined,
            source: 'paypal',
            externalId: t.externalId,
            paypalAccountId: acct.id ?? undefined,
            originalCurrency: t.currency,
            originalAmount: Math.abs(t.originalAmount),
          },
        })
      }
      imported++
    }

    // Entries imported before fees and clients were tracked: fill them in from PayPal's data.
    const byId = new Map(txns.map((t) => [t.externalId, t]))
    const noFee: Where = { and: [{ source: { equals: 'paypal' } }, { fee: { exists: false } }] }
    const needFee = await payload.find({ collection: 'entries', user, overrideAccess: false, where: noFee, limit: 1000, depth: 0, pagination: false })
    for (const d of needFee.docs) {
      const t = d.externalId ? byId.get(d.externalId) : undefined
      if (!t) continue
      await payload.update({ collection: 'entries', id: d.id, user, overrideAccess: false, data: { fee: t.fee, counterparty: t.counterparty || undefined } })
    }

    // Records imported before accounts were tracked: confirm the ones that belong to this account, and mark the
    // rest as unverified so the PayPal page can ask whether to delete them.
    if (acct.id) {
      const known = new Set(txns.map((t) => t.externalId))
      const since = addDays(today(), -90)
      const unstamped: Where = { and: [{ source: { equals: 'paypal' } }, { paypalAccountId: { exists: false } }] }
      const [oldEntries, oldSubs] = await Promise.all([
        payload.find({ collection: 'entries', user, overrideAccess: false, where: unstamped, limit: 1000, depth: 0, pagination: false }),
        payload.find({ collection: 'subscriptions', user, overrideAccess: false, where: unstamped, limit: 1000, depth: 0, pagination: false }),
      ])
      let unverified = 0
      for (const d of oldEntries.docs) {
        if (!d.externalId) continue
        // Only records inside the 90-day window can be checked; older ones are left alone.
        const mark = known.has(d.externalId) ? acct.id : d.date >= since ? 'unverified' : null
        if (!mark) continue
        if (mark === 'unverified') unverified++
        await payload.update({ collection: 'entries', id: d.id, user, overrideAccess: false, data: { paypalAccountId: mark } })
      }
      for (const d of oldSubs.docs) {
        if (!d.externalId) continue
        const mark = known.has(d.externalId) ? acct.id : 'unverified'
        if (mark === 'unverified') unverified++
        await payload.update({ collection: 'subscriptions', id: d.id, user, overrideAccess: false, data: { paypalAccountId: mark } })
      }
      if (unverified) note += ` ${unverified} older record${unverified === 1 ? '' : 's'} did not match this PayPal account.`
    }
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { paypalStatus: 'connected', paypalLastSync: new Date().toISOString() },
      overrideAccess: true,
    })
    return { ok: true, data: { imported, mode }, message: `Imported ${imported} new transaction${imported === 1 ? '' : 's'}.${note}` }
  } catch (e) {
    return fail(msg(e, 'PayPal sync failed.'))
  }
}

/** Deletes PayPal records that came from a different PayPal account than the one connected now. */
export async function deleteForeignPayPalRecordsAction(): Promise<ActionResult<{ deleted: number }>> {
  try {
    const user = await requireUser()
    if (!paypalConfigured()) return fail(NO_PAYPAL)
    // The set to delete is worked out here from the connected account, never taken from the browser.
    const acct = await accountInfo()
    if (!acct.id) return fail('Could not read the connected PayPal account. Try again in a moment.')
    const payload = await getPayloadClient()
    const where: Where = { and: [{ source: { equals: 'paypal' } }, { paypalAccountId: { exists: true } }, { paypalAccountId: { not_equals: acct.id } }] }
    const [entries, subs] = await Promise.all([
      payload.delete({ collection: 'entries', user, overrideAccess: false, where }),
      payload.delete({ collection: 'subscriptions', user, overrideAccess: false, where }),
    ])
    const deleted = entries.docs.length + subs.docs.length
    return { ok: true, data: { deleted }, message: `Deleted ${deleted} record${deleted === 1 ? '' : 's'} from the other PayPal account.` }
  } catch (e) {
    return fail(msg(e, 'Could not delete those records.'))
  }
}

// ---------- forecast ----------
/** A short written read of the cash-flow forecast. The projection is rebuilt here, never taken from the browser. */
export async function forecastAdviceAction(): Promise<ActionResult<{ text: string; ai: boolean }>> {
  try {
    const user = await requireUser()
    return { ok: true, data: await aiForecastAdvice(await loadForecast(user)) }
  } catch (e) {
    return fail(msg(e, 'Could not explain the forecast.'))
  }
}

// ---------- reports ----------
/** A short written summary of one month. The figures are recalculated here, never taken from the browser. */
export async function monthSummaryAction(month: string): Promise<ActionResult<{ text: string; ai: boolean }>> {
  try {
    const user = await requireUser()
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month))) return fail('Pick a valid month.')
    const [entries, subs] = await Promise.all([loadEntries(user), loadSubscriptions(user)])
    return { ok: true, data: await aiMonthSummary(buildMonthReport(entries, subs, month, today())) }
  } catch (e) {
    return fail(msg(e, 'Could not summarise this month.'))
  }
}

// ---------- payment requests ----------
/** Drafts an invoice from a sentence. Nothing is sent: the user reviews the filled-in form and confirms. */
export async function draftInvoiceAction(text: string): Promise<
  ActionResult<{ email: string; amountBase: number; description: string; dueDays: number; shown: string; ai: boolean; missing: string[] }>
> {
  try {
    const user = await requireUser()
    const typed = String(text ?? '').trim()
    if (typed.length < 5) return fail('Describe the invoice, for example: invoice Acme RM500 for logo design, due in 14 days.')
    const { draft, ai } = await aiInvoiceDraft(typed)
    if (!draft) return fail('I could not find an amount. Try something like: invoice Acme RM500 for logo design, due in 14 days.')
    // No currency in the text means the one the user normally sees.
    const currency = draft.currency ?? (user.currency as string | undefined) ?? 'MYR'
    const fx = (await getRates()).rates[currency]
    if (!fx) return fail(`I do not have an exchange rate for ${currency}. Use RM, USD, EUR, GBP, SGD, AUD, CNY, INR, THB, JPY or IDR.`)
    const missing: string[] = []
    if (!draft.email) missing.push('their PayPal email')
    return {
      ok: true,
      data: {
        email: draft.email,
        amountBase: Math.round((draft.amount / fx) * 100) / 100,
        description: draft.description,
        dueDays: draft.dueDays,
        shown: `${currency} ${draft.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        ai,
        missing,
      },
    }
  } catch (e) {
    return fail(msg(e, 'Could not draft the invoice.'))
  }
}

export async function requestPaymentAction(input: { email: string; amount: number; description: string; dueDays: number }): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const email = String(input.email ?? '').trim().toLowerCase()
    const description = String(input.description ?? '').trim().slice(0, 120)
    const amount = Math.round(Number(input.amount) * 100) / 100
    const dueDays = Math.min(90, Math.max(0, Math.floor(Number(input.dueDays) || 0)))
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return fail('Enter the PayPal email of the person you are requesting from.')
    if (!description) return fail('Say what the payment is for.')
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return fail('Enter an amount greater than zero.')
    if (!paypalConfigured()) return fail(NO_PAYPAL)
    const dueDate = addDays(today(), dueDays)
    // PayPal only lets a merchant invoice in a currency its account can receive, so use the account's own and convert from the RM base.
    const currency = (await accountCurrency()) ?? (process.env.PAYPAL_INVOICE_CURRENCY || 'USD').toUpperCase()
    const fx = (await getRates()).rates[currency]
    if (!fx) return fail(`The app has no exchange rate for ${currency}, your PayPal account's currency.`)
    const invoiceAmount = Math.round(amount * fx * 100) / 100
    if (invoiceAmount <= 0) return fail('That amount is too small to invoice in this currency.')
    const { id } = await sendPaymentRequest({ email, amount: invoiceAmount, currency, description, dueDate })
    const payload = await getPayloadClient()
    await payload.create({
      collection: 'payment-requests',
      overrideAccess: true,
      data: { owner: user.id, recipientEmail: email, amount, description, dueDate, invoiceId: id, status: 'sent' },
    })
    return { ok: true, message: `Payment request for ${currency} ${invoiceAmount.toFixed(2)} (${rm(amount)}) sent to ${email}.` }
  } catch (e) {
    return fail(msg(e, 'Could not send the payment request.'))
  }
}

export async function refreshPaymentRequestsAction(): Promise<ActionResult> {
  try {
    const user = await requireUser()
    if (!paypalConfigured()) return fail(NO_PAYPAL)
    const payload = await getPayloadClient()
    const { docs } = await payload.find({ collection: 'payment-requests', user, overrideAccess: false, where: { status: { equals: 'sent' } }, limit: 100, depth: 0 })
    let paid = 0
    for (const d of docs) {
      const status = await paymentRequestStatus(d.invoiceId)
      if (status === d.status) continue
      await payload.update({ collection: 'payment-requests', id: d.id, overrideAccess: true, data: { status } })
      if (status === 'paid') paid++
    }
    return { ok: true, message: paid ? `${paid} request${paid === 1 ? ' was' : 's were'} paid. Resync on the PayPal page to import the payment.` : 'No new payments yet.' }
  } catch (e) {
    return fail(msg(e, 'Could not check your payment requests.'))
  }
}

// ---------- jobs ----------
export async function addJobAction(input: {
  kind?: string
  name: string
  amount: number
  frequency: string
  startDate: string
  endDate: string
}): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const name = String(input.name ?? '').trim().slice(0, 80)
    const amount = Number(input.amount)
    const frequency = ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'].find((f) => f === input.frequency) as
      | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | undefined
    const endDate = input.endDate ? String(input.endDate) : ''
    const kind = input.kind === 'contract' ? 'contract' : 'job'
    if (!name) return fail(`Give the ${kind} a name.`)
    if (kind === 'contract' && !endDate) return fail('A contract needs an end date.')
    if (!Number.isFinite(amount) || amount <= 0) return fail('Income must be greater than zero.')
    if (!frequency) return fail('Choose how often you are paid.')
    if (!isDay(input.startDate)) return fail('Pick a valid start date.')
    if (endDate && (!isDay(endDate) || endDate < input.startDate)) return fail('The end date cannot be before the start date.')
    const payload = await getPayloadClient()
    await payload.create({
      collection: 'jobs',
      user,
      overrideAccess: false,
      data: { owner: user.id, kind, name, amount, frequency, startDate: input.startDate, endDate: endDate || undefined },
    })
    return { ok: true, message: `${kind === 'contract' ? 'Contract' : 'Job'} "${name}" added.` }
  } catch (e) {
    return fail(msg(e, 'Could not save the job.'))
  }
}

/** Removing a job means ending it: the user says when the last payment arrives, and past income is kept. */
export async function endJobAction(id: string, lastPaymentDate: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    if (!isDay(lastPaymentDate)) return fail('Tell us when you will receive the last payment.')
    const payload = await getPayloadClient()
    const job = await payload.findByID({ collection: 'jobs', id, user, overrideAccess: false, depth: 0 })
    if (lastPaymentDate < job.startDate) return fail('The last payment cannot be before the job started.')
    await payload.update({ collection: 'jobs', id, user, overrideAccess: false, data: { endDate: lastPaymentDate } })
    return { ok: true, message: `"${job.name}" will pay out until ${lastPaymentDate}.` }
  } catch (e) {
    return fail(msg(e, 'Could not remove the job.'))
  }
}

// ---------- goals / plans ----------
function cleanItems(items: unknown, start: string, end: string): PlanItem[] {
  if (!Array.isArray(items)) return []
  return items
    .map((i) => ({ date: String(i?.date ?? ''), label: String(i?.label ?? '').trim().slice(0, 120), amount: Math.max(0, Number(i?.amount) || 0) }))
    .filter((i) => isDay(i.date) && i.label && i.date >= start && i.date <= end)
    .slice(0, 400)
}

export async function draftPlanAction(input: {
  title: string
  description: string
  targetDate: string
  targetAmount: number
  refine?: PlanDraft
}): Promise<ActionResult<PlanDraft>> {
  try {
    await requireUser()
    const title = String(input.title ?? '').trim().slice(0, 120)
    const targetAmount = Number(input.targetAmount)
    const startDate = today()
    if (!title) return fail('Give your goal a name.')
    if (!isDay(input.targetDate) || input.targetDate <= startDate) return fail('Choose a target date in the future.')
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) return fail('Enter how much you want to reach.')
    const draft = await aiPlan(
      { title, description: String(input.description ?? '').slice(0, 4000), targetDate: input.targetDate, targetAmount, startDate },
      input.refine ? { ...input.refine, startDate, items: cleanItems(input.refine.items, startDate, input.targetDate) } : undefined,
    )
    return { ok: true, data: draft }
  } catch (e) {
    return fail(msg(e, 'The AI could not build a plan.'))
  }
}

type GoalBase = { startDate: string; targetDate: string; targetAmount: number; items: PlanItem[] }

/** Validates edits and derives everything that depends on them (daily amount, checkpoints, summary). */
function computeGoal(base: GoalBase, input: GoalEditInput, keepSummary?: string[]) {
  const title = String(input.title ?? '').trim().slice(0, 120)
  const amount = Number(input.targetAmount)
  if (!title) return { ok: false, error: 'Give your goal a name.' } as const
  if (!isDay(input.targetDate) || input.targetDate <= base.startDate) return { ok: false, error: 'The target date must be after the plan start date.' } as const
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: 'Enter an amount greater than zero.' } as const
  const skipWeekdays = [...new Set((input.skipWeekdays ?? []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))]
  const inPlan = (d: string) => d >= base.startDate && d <= input.targetDate
  const excludedDays = [...new Set((input.excludedDays ?? []).filter(isDay))].filter(inPlan).sort().slice(0, 800)
  const restoredDays = [...new Set((input.restoredDays ?? []).filter(isDay))]
    .filter((d) => inPlan(d) && !excludedDays.includes(d))
    .sort()
    .slice(0, 800)
  const days = fundingDays(base.startDate, input.targetDate, { skipWeekdays, excludedDays, restoredDays })
  if (days < 1) return { ok: false, error: 'Every day is excluded. Leave at least one funding day.' } as const
  const daily = dailyFor(amount, days)

  let items: PlanItem[] = input.items ? cleanItems(input.items, base.startDate, input.targetDate) : base.items
  if (!input.items && (input.targetDate !== base.targetDate || amount !== base.targetAmount)) {
    // Rescale checkpoints along the new timeline and amount.
    const oldSpan = Math.max(1, daysBetween(base.startDate, base.targetDate))
    const newSpan = daysBetween(base.startDate, input.targetDate)
    const ratio = base.targetAmount ? amount / base.targetAmount : 1
    items = items.map((i) => ({
      date: addDays(base.startDate, Math.round((daysBetween(base.startDate, i.date) / oldSpan) * newSpan)),
      label: i.label,
      amount: Math.round(i.amount * ratio),
    }))
  }
  const skipNote = [
    skipWeekdays.length ? `every ${skipWeekdays.map((d) => WEEKDAYS[d]).join(', ')}` : '',
    excludedDays.length ? `${excludedDays.length} specific day${excludedDays.length === 1 ? '' : 's'}` : '',
  ].filter(Boolean)
  const unchanged = input.targetDate === base.targetDate && amount === base.targetAmount && !skipNote.length
  const summary =
    keepSummary?.length && unchanged
      ? keepSummary
      : [
          `Set aside RM${daily} on each of ${days} funding days towards "${title}".`,
          skipNote.length ? `Skipping ${skipNote.join(' and ')}.` : 'No days are skipped.',
          `RM${amount} will be reached by ${input.targetDate}.`,
        ]
  return {
    ok: true,
    data: {
      title,
      tag: String(input.tag ?? '').trim().slice(0, 40),
      tagColor: asTagColor(input.tagColor),
      targetDate: input.targetDate,
      targetAmount: amount,
      dailyAmount: daily,
      skipWeekdays: skipWeekdays.map(String) as ('0' | '1' | '2' | '3' | '4' | '5' | '6')[],
      excludedDays: excludedDays.map((date) => ({ date })),
      restoredDays: restoredDays.map((date) => ({ date })),
      items: items.filter((i) => i.date >= base.startDate && i.date <= input.targetDate),
      summary: summary.slice(0, 6).map((text) => ({ text: String(text).slice(0, 240) })),
    },
    daily,
  } as const
}

/** Creates a goal from an AI draft, applying whatever the user edited before confirming. */
export async function saveGoalAction(draft: PlanDraft, input: GoalEditInput): Promise<ActionResult> {
  try {
    const user = await requireUser()
    if (!isDay(draft.startDate) || !isDay(draft.targetDate)) return fail('The plan is incomplete.')
    const base: GoalBase = {
      startDate: draft.startDate,
      targetDate: draft.targetDate,
      targetAmount: Math.max(0, Number(draft.targetAmount) || 0),
      items: cleanItems(draft.items, draft.startDate, draft.targetDate),
    }
    const r = computeGoal(base, input, draft.summary)
    if (!r.ok) return fail(r.error)
    const payload = await getPayloadClient()
    await payload.create({
      collection: 'goals',
      user,
      overrideAccess: false,
      data: {
        ...r.data,
        owner: user.id,
        description: String(draft.description ?? '').slice(0, 4000),
        startDate: draft.startDate,
        status: 'active',
      },
    })
    return { ok: true, message: 'Plan saved.' }
  } catch (e) {
    return fail(msg(e, 'Could not save the plan.'))
  }
}

export async function updateGoalAction(id: string, input: GoalEditInput): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const payload = await getPayloadClient()
    const g = await payload.findByID({ collection: 'goals', id, user, overrideAccess: false, depth: 0 })
    const base: GoalBase = {
      startDate: g.startDate,
      targetDate: g.targetDate,
      targetAmount: g.targetAmount ?? 0,
      items: (g.items ?? []).map((i) => ({ date: i.date, label: i.label, amount: i.amount ?? 0 })),
    }
    const r = computeGoal(base, input)
    if (!r.ok) return fail(r.error)
    await payload.update({ collection: 'goals', id, user, overrideAccess: false, data: r.data })
    // One tag, one color: keep other goals with the same tag in step.
    if (r.data.tag) {
      await payload.update({
        collection: 'goals',
        user,
        overrideAccess: false,
        where: { and: [{ tag: { equals: r.data.tag } }, { id: { not_equals: id } }] },
        data: { tagColor: r.data.tagColor },
      })
    }
    return { ok: true, message: `Plan updated: RM${r.daily} per funding day.` }
  } catch (e) {
    return fail(msg(e, 'Could not update the plan.'))
  }
}

export async function archiveGoalAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const payload = await getPayloadClient()
    await payload.update({ collection: 'goals', id, user, overrideAccess: false, data: { status: 'archived' } })
    return { ok: true }
  } catch (e) {
    return fail(msg(e, 'Could not remove the plan.'))
  }
}

// ---------- subscriptions ----------
export async function createSubscriptionAction(input: {
  name: string
  category: string
  amount: number
  renewDate?: string
  status: 'active' | 'cancelled'
}): Promise<ActionResult<{ id: string }>> {
  if (!input.name?.trim()) return fail('Name is required.')
  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) return fail('Enter a valid amount greater than 0.')
  const categories = ['Streaming', 'Software', 'Shopping', 'Utilities', 'Other']
  if (!categories.includes(input.category)) return fail('Invalid category.')
  try {
    const user = await requireUser()
    const payload = await getPayloadClient()
    const created = await payload.create({
      collection: 'subscriptions',
      user,
      overrideAccess: false,
      data: {
        owner: user.id,
        name: input.name.trim().slice(0, 80),
        category: input.category as 'Other',
        amount,
        status: input.status,
        renewDate: input.status === 'active' && input.renewDate ? input.renewDate : undefined,
        terminationDate: input.status === 'cancelled' ? today() : undefined,
        source: 'manual',
      },
    })
    return { ok: true, data: { id: String(created.id) }, message: 'Subscription added.' }
  } catch (e) {
    return fail(msg(e, 'Could not create the subscription.'))
  }
}

/** Outgoing PayPal transactions that have not been imported or linked yet. */
async function unlinkedPayPalCandidates(user: NonNullable<Awaited<ReturnType<typeof getAppUser>>>) {
  if (!paypalConfigured()) throw new Error(NO_PAYPAL)
  const mode = 'sandbox' as const
  const txns: PayPalTxn[] = await fetchSandboxTransactions(90)
  const out = txns.filter((t) => t.amount < 0)
  const payload = await getPayloadClient()
  const where = { externalId: { in: out.map((t) => t.externalId) } }
  const [subs, entries] = await Promise.all([
    payload.find({ collection: 'subscriptions', user, overrideAccess: false, where, limit: 500, depth: 0, pagination: false }),
    payload.find({ collection: 'entries', user, overrideAccess: false, where, limit: 500, depth: 0, pagination: false }),
  ])
  const used = new Set([...subs.docs, ...entries.docs].map((d) => d.externalId))
  return { mode, cands: out.filter((t) => !used.has(t.externalId)) }
}

export async function suggestPayPalMatchAction(id: string): Promise<ActionResult<{ match: PayPalMatch | null; note: string }>> {
  try {
    const user = await requireUser()
    const payload = await getPayloadClient()
    const sub = await payload.findByID({ collection: 'subscriptions', id, user, overrideAccess: false, depth: 0 })
    if (sub.externalId) return { ok: true, data: { match: null, note: 'This subscription is already linked to PayPal.' } }
    const { mode, cands } = await unlinkedPayPalCandidates(user)
    const r = await matchSubscription(
      { name: sub.name, category: sub.category ?? 'Other', amount: sub.amount },
      cands.map((t) => ({ id: t.externalId, business: t.business, amount: t.amount, date: t.date, recurring: t.kind === 'subscription' })),
    )
    const t = r.id ? cands.find((c) => c.externalId === r.id) : undefined
    if (!t) return { ok: true, data: { match: null, note: r.reason } }
    return {
      ok: true,
      data: {
        match: { externalId: t.externalId, business: t.business, amount: Math.abs(t.amount), date: t.date, hasSubscriptionId: Boolean(t.subscriptionId), reason: r.reason, ai: r.usedAI, mode },
        note: r.reason,
      },
    }
  } catch (e) {
    return fail(msg(e, 'Could not search the PayPal sandbox.'))
  }
}

export async function linkSubscriptionAction(id: string, externalId: string): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const payload = await getPayloadClient()
    const sub = await payload.findByID({ collection: 'subscriptions', id, user, overrideAccess: false, depth: 0 })
    if (sub.externalId) return fail('This subscription is already linked to PayPal.')
    // Look the transaction up again on the server so a PayPal subscription ID can never come from the browser.
    const { cands } = await unlinkedPayPalCandidates(user)
    const t = cands.find((c) => c.externalId === externalId)
    if (!t) return fail('That PayPal transaction is no longer available to link.')
    await payload.update({
      collection: 'subscriptions',
      id,
      user,
      overrideAccess: false,
      data: { source: 'paypal', externalId: t.externalId, paypalSubscriptionId: t.subscriptionId },
    })
    return { ok: true, message: t.subscriptionId ? 'Linked. Cancelling it here will also cancel it in PayPal.' : 'Linked to the PayPal transaction.' }
  } catch (e) {
    return fail(msg(e, 'Could not link the subscription.'))
  }
}

export async function updateSubscriptionAction(id: string, patch: { tag?: string; note?: string; status?: string }): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const data: Record<string, unknown> = {}
    if (patch.tag !== undefined) data.tag = String(patch.tag).slice(0, 40)
    if (patch.note !== undefined) data.note = String(patch.note).slice(0, 500)
    if (patch.status === 'active' || patch.status === 'cancelled') {
      data.status = patch.status
      data.terminationDate = patch.status === 'cancelled' ? today() : ''
    }
    const payload = await getPayloadClient()
    let note: string | undefined
    if (patch.status === 'cancelled') {
      const sub = await payload.findByID({ collection: 'subscriptions', id, user, overrideAccess: false, depth: 0 })
      if (sub.source === 'paypal' && sub.status === 'active') {
        if (sub.paypalSubscriptionId && paypalConfigured()) {
          try {
            await cancelPayPalSubscription(sub.paypalSubscriptionId, 'Cancelled from PaySense')
            note = 'Cancelled here and in the PayPal sandbox.'
          } catch (e) {
            note = `Cancelled here, but PayPal was not cancelled: ${msg(e, 'request failed')}.`
          }
        } else {
          note = 'Cancelled here only: this subscription has no PayPal subscription ID to cancel.'
        }
      }
    }
    await payload.update({ collection: 'subscriptions', id, user, overrideAccess: false, data })
    return { ok: true, message: note }
  } catch (e) {
    return fail(msg(e, 'Could not update the subscription.'))
  }
}

// ---------- AI ----------
/** If the user is signed in with Google for Gemini, revoke that grant before it is replaced or removed. */
async function revokeStoredGoogle(userId: string | number) {
  const payload = await getPayloadClient()
  const doc = await payload.findByID({ collection: 'users', id: userId, overrideAccess: true, depth: 0 })
  if (doc.aiAuth === 'google' && doc.aiKeyEnc) {
    try {
      await revokeGoogleToken(decryptKey(doc.aiKeyEnc))
    } catch {}
  }
}

export async function saveAiSettingsAction(input: { provider: string; model: string; key: string }): Promise<ActionResult<{ label: string }>> {
  try {
    const user = await requireUser()
    if (!isProvider(input.provider)) return fail('Choose OpenAI, Claude or Gemini.')
    const key = String(input.key ?? '').trim()
    if (key.length < 20 || key.length > 400 || /\s/.test(key)) return fail('That does not look like an API key. Paste the full key from your provider.')
    const model = String(input.model ?? '').trim() || PROVIDERS[input.provider].model
    if (!/^[A-Za-z0-9._:-]{1,80}$/.test(model)) return fail('Model names can only use letters, numbers and . _ : -')
    const test = await aiRequest({ provider: input.provider, key, model, source: 'user', auth: 'key' }, [{ role: 'user', content: 'Reply with the single word: ok' }])
    if (!test.text) return fail(test.error ?? 'The provider did not answer. Check the key and model.')
    await revokeStoredGoogle(user.id)
    const payload = await getPayloadClient()
    await payload.update({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      data: { aiProvider: input.provider, aiAuth: 'key', aiModel: model, aiKeyHint: key.slice(-4), aiKeyEnc: encryptKey(key) },
    })
    return { ok: true, data: { label: PROVIDERS[input.provider].label }, message: `${PROVIDERS[input.provider].label} connected.` }
  } catch (e) {
    return fail(msg(e, 'Could not save the AI account.'))
  }
}

export async function removeAiSettingsAction(): Promise<ActionResult> {
  try {
    const user = await requireUser()
    await revokeStoredGoogle(user.id)
    const payload = await getPayloadClient()
    await payload.update({ collection: 'users', id: user.id, overrideAccess: true, data: { aiProvider: null, aiAuth: null, aiModel: null, aiKeyHint: null, aiKeyEnc: null } })
    return { ok: true, message: 'AI account removed.' }
  } catch (e) {
    return fail(msg(e, 'Could not remove the AI account.'))
  }
}

export async function insightsAction(): Promise<ActionResult<{ insights: Insight[]; ai: boolean }>> {
  try {
    const user = await requireUser()
    const [entries, subs] = await Promise.all([loadEntries(user), loadSubscriptions(user)])
    return { ok: true, data: await aiInsights(entries, subs) }
  } catch (e) {
    return fail(msg(e, 'Could not analyse your spending.'))
  }
}

async function context() {
  const user = await requireUser()
  const [e, s, g] = await Promise.all([loadEntries(user), loadSubscriptions(user), loadGoals(user)])
  return financeContext(e, s, g)
}

export async function chatAction(history: { role: 'user' | 'assistant'; content: string }[]): Promise<ActionResult<string>> {
  try {
    const ctx = await context()
    const clean = history.slice(-10).map((m) => ({ role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const), content: String(m.content).slice(0, 2000) }))
    if (!clean.length) return fail('Ask something first.')
    return { ok: true, data: await aiChat(clean, ctx) }
  } catch (e) {
    return fail(msg(e, 'The assistant is unavailable.'))
  }
}

export async function pickGoalToEditAction(deficit: boolean): Promise<ActionResult<{ goalId: string; reason: string } | null>> {
  try {
    const user = await requireUser()
    const [e, s, g] = await Promise.all([loadEntries(user), loadSubscriptions(user), loadGoals(user)])
    const pick = await aiPickGoal(
      g.map((x) => ({ id: x.id, title: x.title, dailyAmount: x.dailyAmount, targetAmount: x.targetAmount, targetDate: x.targetDate, tag: x.tag })),
      financeContext(e, s, g),
      Boolean(deficit),
    )
    return { ok: true, data: pick }
  } catch (err) {
    return fail(msg(err, 'The AI could not choose a goal.'))
  }
}

export async function suggestGoalsAction() {
  try {
    const ctx = await context()
    return { ok: true as const, data: await aiSuggestGoals(ctx) }
  } catch (e) {
    return fail(msg(e, 'Could not suggest goals.'))
  }
}

