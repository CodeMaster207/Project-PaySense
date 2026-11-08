'use server'

import { getPayloadClient } from '@/lib/payload'
import { endAppSession, getAppUser, startAppSession } from '@/lib/app-auth'
import { aiChat, aiPickGoal, aiPlan, aiSuggestGoals } from '@/lib/ai'
import { PayPalUnreachable, categoryFor, checkPayPalConnection, demoTransactions, fetchSandboxTransactions, paypalConfigured } from '@/lib/paypal'
import { addDays, daysBetween, isDay, today } from '@/lib/dates'
import { isCurrency } from '@/lib/money'
import { asTagColor } from '@/lib/tagColors'
import { dailyFor, fundingDays, WEEKDAYS } from '@/lib/plan'
import { financeContext, loadEntries, loadGoals, loadSubscriptions } from '@/lib/data'
import type { ActionResult, GoalEditInput, PlanDraft, PlanItem } from '@/lib/types'

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
export async function connectPayPalAction(): Promise<ActionResult<{ mode: 'sandbox' | 'demo' }>> {
  try {
    const user = await requireUser()
    const mode = paypalConfigured() ? 'sandbox' : 'demo'
    let note: string | undefined
    if (mode === 'sandbox') {
      const check = await checkPayPalConnection()
      if (!check.ok) {
        if (!('unreachable' in check) || !check.unreachable) return fail(check.error)
        note = `${check.error} Demo data will be used instead.`
      }
    }
    const payload = await getPayloadClient()
    // Server-owned status field: only this verified server path can set it.
    await payload.update({ collection: 'users', id: user.id, data: { paypalStatus: 'connected' }, overrideAccess: true })
    return { ok: true, data: { mode }, message: note }
  } catch (e) {
    return fail(msg(e, 'Could not connect to PayPal.'))
  }
}

export async function syncPayPalAction(): Promise<ActionResult<{ imported: number; mode: 'sandbox' | 'demo' }>> {
  try {
    const user = await requireUser()
    const mode = paypalConfigured() ? 'sandbox' : 'demo'
    let txns
    let note = ''
    if (mode === 'sandbox') {
      try {
        txns = await fetchSandboxTransactions(90)
      } catch (e) {
        if (!(e instanceof PayPalUnreachable)) throw e
        txns = demoTransactions()
        note = ` ${e.message} Imported demo data instead.`
      }
    } else {
      txns = demoTransactions()
    }
    const payload = await getPayloadClient()
    let imported = 0
    for (const t of txns) {
      const collection = t.kind === 'subscription' ? 'subscriptions' : 'entries'
      const existing = await payload.find({
        collection,
        user,
        overrideAccess: false,
        where: { externalId: { equals: t.externalId } },
        limit: 1,
        depth: 0,
      })
      if (existing.totalDocs) continue
      if (t.kind === 'subscription') {
        await payload.create({
          collection: 'subscriptions',
          user,
          overrideAccess: false,
          data: {
            owner: user.id,
            name: t.business.slice(0, 80),
            category: categoryFor(t.business) as 'Other',
            amount: Math.abs(t.amount),
            renewDate: t.status === 'active' ? addDays(t.date, 30) : undefined,
            terminationDate: t.status === 'cancelled' ? t.date : undefined,
            status: t.status,
            source: 'paypal',
            externalId: t.externalId,
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
            source: 'paypal',
            externalId: t.externalId,
          },
        })
      }
      imported++
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

// ---------- jobs ----------
export async function addJobAction(input: {
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
    if (!name) return fail('Give the job a name.')
    if (!Number.isFinite(amount) || amount <= 0) return fail('Income must be greater than zero.')
    if (!frequency) return fail('Choose how often you are paid.')
    if (!isDay(input.startDate)) return fail('Pick a valid start date.')
    if (endDate && (!isDay(endDate) || endDate < input.startDate)) return fail('The end date cannot be before the start date.')
    const payload = await getPayloadClient()
    await payload.create({
      collection: 'jobs',
      user,
      overrideAccess: false,
      data: { owner: user.id, name, amount, frequency, startDate: input.startDate, endDate: endDate || undefined },
    })
    return { ok: true, message: `Job "${name}" added.` }
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
    await payload.update({ collection: 'subscriptions', id, user, overrideAccess: false, data })
    return { ok: true }
  } catch (e) {
    return fail(msg(e, 'Could not update the subscription.'))
  }
}

// ---------- AI ----------
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

