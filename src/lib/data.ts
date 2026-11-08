import 'server-only'
import { getPayloadClient } from '@/lib/payload'
import type { getAppUser } from '@/lib/app-auth'
import type { EntryView, GoalView, JobView, PaymentRequestView, SubscriptionView } from './types'

type AppUser = NonNullable<Awaited<ReturnType<typeof getAppUser>>>

export async function loadEntries(user: AppUser): Promise<EntryView[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({ collection: 'entries', user, overrideAccess: false, limit: 2000, sort: '-date', depth: 0 })
  return docs.map((d) => ({
    id: String(d.id),
    date: d.date,
    type: d.type,
    description: d.description,
    amount: d.amount,
    source: d.source ?? 'manual',
    ...(d.externalId ? { externalId: d.externalId } : {}),
    ...(d.originalCurrency && d.originalAmount != null ? { originalCurrency: d.originalCurrency, originalAmount: d.originalAmount } : {}),
  }))
}

export async function loadSubscriptions(user: AppUser): Promise<SubscriptionView[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({ collection: 'subscriptions', user, overrideAccess: false, limit: 500, sort: 'name', depth: 0 })
  return docs.map((d) => ({
    id: String(d.id),
    name: d.name,
    category: d.category ?? 'Other',
    amount: d.amount,
    renewDate: d.renewDate ?? '',
    terminationDate: d.terminationDate ?? '',
    status: d.status ?? 'active',
    tag: d.tag ?? '',
    note: d.note ?? '',
    linked: Boolean(d.externalId),
    paypalTransactionId: d.externalId ?? '',
    ...(d.originalCurrency && d.originalAmount != null ? { originalCurrency: d.originalCurrency, originalAmount: d.originalAmount } : {}),
    paypalCancellable: Boolean(d.paypalSubscriptionId),
  }))
}

export async function loadGoals(user: AppUser): Promise<GoalView[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'goals',
    user,
    overrideAccess: false,
    where: { status: { equals: 'active' } },
    limit: 200,
    sort: 'targetDate',
    depth: 0,
  })
  return docs.map((d) => ({
    id: String(d.id),
    title: d.title,
    description: d.description ?? '',
    startDate: d.startDate,
    targetDate: d.targetDate,
    targetAmount: d.targetAmount ?? 0,
    dailyAmount: d.dailyAmount,
    summary: (d.summary ?? []).map((s) => s.text),
    items: (d.items ?? []).map((i) => ({ date: i.date, label: i.label, amount: i.amount ?? 0 })),
    status: d.status ?? 'active',
    skipWeekdays: (d.skipWeekdays ?? []).map(Number),
    excludedDays: (d.excludedDays ?? []).map((x) => x.date),
    restoredDays: (d.restoredDays ?? []).map((x) => x.date),
    tag: d.tag ?? '',
    tagColor: d.tagColor ?? 'banana',
  }))
}

export async function loadJobs(user: AppUser): Promise<JobView[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({ collection: 'jobs', user, overrideAccess: false, limit: 100, sort: 'name', depth: 0 })
  return docs.map((d) => ({
    id: String(d.id),
    name: d.name,
    kind: d.kind ?? 'job',
    amount: d.amount,
    frequency: d.frequency,
    startDate: d.startDate,
    endDate: d.endDate ?? '',
  }))
}

export async function loadPaymentRequests(user: AppUser): Promise<PaymentRequestView[]> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({ collection: 'payment-requests', user, overrideAccess: false, limit: 100, sort: '-createdAt', depth: 0 })
  return docs.map((d) => ({
    id: String(d.id),
    email: d.recipientEmail,
    amount: d.amount,
    description: d.description,
    dueDate: d.dueDate ?? '',
    status: d.status ?? 'sent',
    invoiceId: d.invoiceId,
  }))
}

export function financeContext(entries: EntryView[], subs: SubscriptionView[], goals: GoalView[]) {
  const income = entries.filter((e) => e.type === 'income').reduce((a, e) => a + e.amount, 0)
  const expense = entries.filter((e) => e.type === 'expense').reduce((a, e) => a + e.amount, 0)
  const active = subs.filter((s) => s.status === 'active')
  return [
    `Total income logged: RM${income.toFixed(2)}; total expenses: RM${expense.toFixed(2)}.`,
    `Recent entries: ${entries.slice(0, 8).map((e) => `${e.date} ${e.type} ${e.description} RM${e.amount}`).join('; ') || 'none'}.`,
    `Active subscriptions: ${active.map((s) => `${s.name} RM${s.amount}`).join(', ') || 'none'} (subscription spend RM${active.reduce((a, s) => a + s.amount, 0).toFixed(2)}).`,
    `Goals: ${goals.map((g) => `${g.title} RM${g.targetAmount} by ${g.targetDate}`).join('; ') || 'none'}.`,
  ].join('\n')
}
