export type EntryView = {
  id: string
  date: string
  type: 'income' | 'expense'
  description: string
  amount: number
  source: 'manual' | 'paypal' | 'goal' | 'job'
  /** PayPal transaction ID for entries imported from PayPal. */
  externalId?: string
  /** The PayPal account the transaction was imported from. */
  paypalAccountId?: string
  /** PayPal's fee on this payment, in RM. */
  fee?: number
  /** Who paid you (money in): the client or customer. */
  counterparty?: string
  /** What PayPal reported before conversion to RM. */
  originalCurrency?: string
  originalAmount?: number
  goalId?: string
  jobId?: string
  /** Goal funding for this day that recorded income did not cover. */
  defaulted?: number
  /** Catch-up added to a future day's funding to repay defaulted amounts. */
  extra?: number
}

export type SubscriptionView = {
  id: string
  name: string
  category: string
  amount: number
  renewDate: string
  terminationDate: string
  status: 'active' | 'cancelled'
  tag: string
  note: string
  /** Tied to a PayPal transaction, either imported from PayPal or linked by hand. */
  linked: boolean
  source: 'manual' | 'paypal'
  paypalAccountId?: string
  originalCurrency?: string
  originalAmount?: number
  paypalTransactionId: string
  paypalCancellable: boolean
}

export type PlanItem = { date: string; label: string; amount: number }

export type PlanDraft = {
  title: string
  description: string
  startDate: string
  targetDate: string
  targetAmount: number
  dailyAmount: number
  summary: string[]
  items: PlanItem[]
  skipWeekdays?: number[]
  excludedDays?: string[]
  restoredDays?: string[]
  tag?: string
  tagColor?: string
}

export type GoalView = PlanDraft & {
  id: string
  status: 'active' | 'archived'
  skipWeekdays: number[]
  excludedDays: string[]
  restoredDays: string[]
  tag: string
  tagColor: string
}

export type PaymentRequestView = {
  id: string
  email: string
  amount: number
  description: string
  dueDate: string
  status: 'sent' | 'paid' | 'cancelled'
  invoiceId: string
}

export type Insight = { kind: 'unusual' | 'saving' | 'subscription' | 'forecast' | 'fees' | 'clients'; title: string; detail: string }

export type PayPalMatch = {
  externalId: string
  business: string
  amount: number
  date: string
  hasSubscriptionId: boolean
  reason: string
  ai: boolean
  mode: 'sandbox'
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string }

/** Values the shared goal editor submits, both for new AI drafts and saved plans. */
export type GoalEditInput = {
  title: string
  tag?: string
  tagColor?: string
  targetDate: string
  targetAmount: number
  skipWeekdays: number[]
  excludedDays: string[]
  restoredDays?: string[]
  items?: PlanItem[]
}

export type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export type JobView = {
  id: string
  name: string
  /** 'job' = employment with a salary; 'contract' = fixed-term self-employed work. */
  kind: 'job' | 'contract'
  amount: number
  frequency: Frequency
  startDate: string
  endDate: string // empty = indefinite
}
