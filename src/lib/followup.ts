export type Tone = 'gentle' | 'firm' | 'final'

/** The most reminders the agent sends for one invoice. */
export const MAX_REMINDERS = 3
/** The fewest days between two reminders for one invoice. */
export const COOLDOWN_DAYS = 3

const toUtc = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
const between = (a: string, b: string) => Math.round((toUtc(b) - toUtc(a)) / 86_400_000)

/** Whole days past the due date (0 when not yet overdue or when there is no due date). */
export const overdueDays = (dueDate: string, today: string) => (dueDate ? Math.max(0, between(dueDate, today)) : 0)

/** The firmer the longer it has been, and the more reminders have already gone out. */
export function toneFor(days: number, sent: number): Tone {
  if (sent >= 2 || days >= 22) return 'final'
  if (sent >= 1 || days >= 8) return 'firm'
  return 'gentle'
}

/** Whether the agent may send a reminder for this invoice today. These rules are fixed in code, not left to the AI. */
export function canRemind(i: { status: string; dueDate: string; remindersSent: number; lastReminderDate: string; today: string }): { ok: true } | { ok: false; reason: string } {
  if (i.status !== 'sent') return { ok: false, reason: 'Only pending invoices can be reminded.' }
  if (!i.dueDate) return { ok: false, reason: 'This invoice has no due date, so it cannot be overdue.' }
  if (overdueDays(i.dueDate, i.today) < 1) return { ok: false, reason: 'This invoice is not overdue yet.' }
  if (i.remindersSent >= MAX_REMINDERS) return { ok: false, reason: `The agent sends at most ${MAX_REMINDERS} reminders per invoice. Contact the client directly now.` }
  if (i.lastReminderDate) {
    const ago = between(i.lastReminderDate, i.today)
    if (ago < COOLDOWN_DAYS) {
      const wait = COOLDOWN_DAYS - ago
      return { ok: false, reason: `A reminder went out ${ago === 0 ? 'today' : `${ago} day${ago === 1 ? '' : 's'} ago`}. The agent waits ${wait} more day${wait === 1 ? '' : 's'} before the next one.` }
    }
  }
  return { ok: true }
}

/** The wording used when no AI account is connected, or when an AI draft fails the checks below. */
export function templateReminder(input: { description: string; days: number; tone: Tone }): { subject: string; note: string } {
  const what = input.description.replace(/\s+/g, ' ').trim().slice(0, 80) || 'your invoice'
  const late = `${input.days} day${input.days === 1 ? '' : 's'}`
  if (input.tone === 'gentle') {
    return { subject: 'A friendly reminder about your invoice', note: `Hi, just a quick reminder that the invoice for "${what}" was due ${late} ago and is still unpaid. If you have already paid, thank you and please ignore this message. Otherwise you can pay it from the invoice link.` }
  }
  if (input.tone === 'firm') {
    return { subject: 'Reminder: invoice now overdue', note: `Hello, the invoice for "${what}" is now ${late} overdue. Please arrange payment as soon as you can, or reply if there is a problem so we can sort it out together.` }
  }
  return { subject: 'Final reminder: overdue invoice', note: `Hello, this is a final reminder that the invoice for "${what}" is ${late} overdue. Please pay it as soon as possible. If you cannot, please contact me today so we can agree a plan.` }
}

/**
 * Checks AI-written text before it can be sent on its own. It must be a sensible length, contain no links or email
 * addresses, and no numbers other than the days overdue, so the AI cannot quote an amount or a date that is wrong.
 * Returns the cleaned text, or null if it fails.
 */
export function cleanReminderText(text: unknown, days: number, max: number): string | null {
  if (typeof text !== 'string') return null
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length < 15 || t.length > max) return null
  if (/https?:|www\.|@|\.com\b/i.test(t)) return null
  const numbers = t.match(/\d+/g) ?? []
  if (numbers.some((n) => Number(n) !== days)) return null
  return t
}
