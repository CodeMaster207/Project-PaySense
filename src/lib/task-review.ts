export type Review = { verdict: 'pay' | 'hold'; reason: string }

/** Above this (RM) a payment is never made automatically, whatever the AI or the autopay limit says. */
export const AUTOPAY_HARD_CAP = 5000
/** The most one task can pay out (RM). */
export const TASK_MAX = 100_000

export const isPayeeContact = (v: string) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 120) || /^[A-Z0-9]{13}$/.test(v)

const NOT_DONE = /\b(not yet|not done|not finished|unfinished|to ?do|wip|work in progress|in progress|still working|partly|partial|half done|will (?:send|do|finish|deliver)|later|tomorrow|next week)\b/i

/** Plain-rules check, used when no AI account is connected. It only judges whether the note says the work is finished. */
export function ruleReview(input: { title: string; note: string }): Review {
  const note = input.note.replace(/\s+/g, ' ').trim()
  if (note.length < 8) return { verdict: 'hold', reason: 'The delivery note is too short to show the work is finished.' }
  if (NOT_DONE.test(note)) return { verdict: 'hold', reason: 'The note suggests the work is not finished yet.' }
  return { verdict: 'pay', reason: `The note describes what was delivered for "${input.title.slice(0, 60)}".` }
}

/**
 * Whether a payment may go out without asking. Every condition must hold, and none of them can be changed by the AI:
 * autopay is switched on, the AI cleared the work, and the amount is within both the user's limit and the hard cap.
 */
export function canAutopay(input: { limit: number; amount: number; verdict: Review['verdict'] }) {
  return input.limit > 0 && input.verdict === 'pay' && input.amount <= input.limit && input.amount <= AUTOPAY_HARD_CAP
}
