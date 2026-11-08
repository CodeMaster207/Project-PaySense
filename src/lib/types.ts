export type EntryView = {
  id: string
  date: string
  type: 'income' | 'expense'
  description: string
  amount: number
  source: 'manual' | 'paypal' | 'goal' | 'job'
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
  amount: number
  frequency: Frequency
  startDate: string
  endDate: string // empty = indefinite
}
