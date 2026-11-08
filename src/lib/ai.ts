import 'server-only'
import { addDays, daysBetween, rm } from './dates'
import type { PlanDraft, PlanItem } from './types'

type Msg = { role: 'system' | 'user' | 'assistant'; content: string }

export const aiProvider = () => (process.env.APP_OPENAI_API_KEY ? 'openai' : 'built-in planner')

async function llm(messages: Msg[], json = false): Promise<string | null> {
  const key = process.env.APP_OPENAI_API_KEY
  if (!key) return null
  try {
    const res = await fetch(`${process.env.APP_OPENAI_BASE_URL || 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.APP_OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        temperature: 0.4,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
      cache: 'no-store',
    })
    if (!res.ok) return null
    return (await res.json()).choices?.[0]?.message?.content ?? null
  } catch {
    return null
  }
}

const clampItems = (items: unknown, start: string, end: string): PlanItem[] => {
  if (!Array.isArray(items)) return []
  return items
    .map((i) => ({
      date: String((i as PlanItem).date ?? ''),
      label: String((i as PlanItem).label ?? '').slice(0, 120),
      amount: Math.max(0, Number((i as PlanItem).amount) || 0),
    }))
    .filter((i) => /^\d{4}-\d{2}-\d{2}$/.test(i.date) && i.label && i.date >= start && i.date <= end)
    .slice(0, 120)
}

function milestones(start: string, target: string, amount: number, steps: number): PlanItem[] {
  const days = Math.max(1, daysBetween(start, target))
  return Array.from({ length: steps }, (_, i) => {
    const frac = (i + 1) / steps
    return {
      date: addDays(start, Math.round(days * frac)),
      label: frac === 1 ? 'Goal reached - celebrate!' : `${Math.round(frac * 100)}% checkpoint`,
      amount: Math.round(amount * frac),
    }
  })
}

export function builtInPlan(input: { title: string; description: string; targetDate: string; targetAmount: number; startDate: string }): PlanDraft {
  const days = Math.max(1, daysBetween(input.startDate, input.targetDate))
  const daily = Math.max(1, Math.ceil(input.targetAmount / days))
  return {
    ...input,
    dailyAmount: daily,
    summary: [
      `Set aside ${rm(daily)} every day towards "${input.title}".`,
      `The goal of ${rm(input.targetAmount)} will be reached by ${input.targetDate}.`,
    ],
    items: milestones(input.startDate, input.targetDate, input.targetAmount, 4),
  }
}

export async function aiPlan(
  input: { title: string; description: string; targetDate: string; targetAmount: number; startDate: string },
  refine?: PlanDraft,
): Promise<PlanDraft> {
  const fallback = refine
    ? {
        ...refine,
        items: [
          ...refine.items,
          ...Array.from({ length: Math.min(40, Math.floor(daysBetween(refine.startDate, refine.targetDate) / 7)) }, (_, i) => ({
            date: addDays(refine.startDate, (i + 1) * 7),
            label: `Week ${i + 1} review: log savings and adjust`,
            amount: refine.dailyAmount * (i + 1) * 7,
          })),
        ].filter((v, i, a) => a.findIndex((x) => x.date === v.date && x.label === v.label) === i),
      }
    : builtInPlan(input)
  const text = await llm(
    [
      {
        role: 'system',
        content:
          'You are a personal finance planner. Reply with JSON only: {"dailyAmount":number,"summary":string[2-4],"items":[{"date":"YYYY-MM-DD","label":string,"amount":number}]}. Items are checkpoints between start and target date (max 60). Amounts are cumulative RM saved at that checkpoint.',
      },
      {
        role: 'user',
        content: JSON.stringify({ ...input, ...(refine ? { existingPlan: refine, instruction: 'Break this plan down into finer weekly steps.' } : {}) }),
      },
    ],
    true,
  )
  if (!text) return fallback
  try {
    const j = JSON.parse(text)
    const items = clampItems(j.items, input.startDate, input.targetDate)
    const summary = Array.isArray(j.summary) ? j.summary.map(String).slice(0, 5) : []
    const daily = Number(j.dailyAmount)
    if (!items.length || !summary.length || !Number.isFinite(daily) || daily <= 0) return fallback
    return { ...input, dailyAmount: Math.ceil(daily), summary, items }
  } catch {
    return fallback
  }
}

export async function aiChat(history: Msg[], context: string): Promise<string> {
  const reply = await llm([
    {
      role: 'system',
      content: `You are Personal AI inside a budgeting app (currency RM). Be concise and concrete. User's data:\n${context}`,
    },
    ...history.slice(-10),
  ])
  if (reply) return reply
  const raw = history.at(-1)?.content ?? ''
  const snap = raw.match(/Budget snapshot[^\n]*/)?.[0]
  if (snap) {
    const bal = Number(snap.match(/balance RM(-?[\d.]+)/)?.[1] ?? 0)
    const top = snap.match(/Biggest expenses: (.*)\.$/)?.[1] ?? 'none'
    const gap = rm(Math.abs(bal))
    return bal < 0
      ? `You are ${gap} short for this period. A quick plan:\n1. Trim your biggest expenses by 10-15% (${top}).\n2. Skip weekends or holidays on your goal on the Plan page, or push its target date out, to lower the daily funding.\n3. Cancel subscriptions you rarely use.\n4. Add income on the Incomes tab, for example a part-time job.\n\nConnect an AI key (APP_OPENAI_API_KEY) for a plan tailored to your exact numbers.`
      : `You have a ${gap} surplus. A quick plan:\n1. Put about half towards your nearest goal to finish it sooner.\n2. Keep a quarter as an emergency buffer.\n3. Review recurring expenses (${top}) to see what else can be saved.\n\nConnect an AI key (APP_OPENAI_API_KEY) for a plan tailored to your exact numbers.`
  }
  const last = raw.toLowerCase()
  if (/subscri/.test(last)) return `Here is what I can see:\n${context.split('\n').filter((l) => /subscription/i.test(l)).join('\n') || 'No subscriptions imported yet - open the PayPal page and sync.'}`
  return `Quick snapshot of your finances:\n${context}\n\nTip: connect an AI key (APP_OPENAI_API_KEY) for open-ended answers.`
}

export async function aiSuggestGoals(context: string): Promise<{ title: string; targetAmount: number; months: number; why: string }[]> {
  const fallback = [
    { title: 'Emergency fund', targetAmount: 3000, months: 6, why: 'Covers about a month of expenses as a safety net.' },
    { title: 'Holiday fund', targetAmount: 2000, months: 8, why: 'A dedicated pot keeps trips off your credit card.' },
    { title: 'Cut one subscription', targetAmount: 600, months: 12, why: 'Cancelling an unused service frees monthly cash.' },
  ]
  const text = await llm(
    [
      { role: 'system', content: 'Reply JSON only: {"goals":[{"title":string,"targetAmount":number,"months":number,"why":string}]} with 3 realistic savings goals in RM.' },
      { role: 'user', content: context },
    ],
    true,
  )
  if (!text) return fallback
  try {
    const g = JSON.parse(text).goals
    if (!Array.isArray(g) || !g.length) return fallback
    return g.slice(0, 4).map((x: { title: unknown; targetAmount: unknown; months: unknown; why: unknown }) => ({
      title: String(x.title).slice(0, 80),
      targetAmount: Math.max(1, Number(x.targetAmount) || 1000),
      months: Math.min(36, Math.max(1, Number(x.months) || 6)),
      why: String(x.why).slice(0, 200),
    }))
  } catch {
    return fallback
  }
}

/** Decides which goal the user should edit first. Falls back to the goal that takes the most per day. */
export async function aiPickGoal(
  goals: { id: string; title: string; dailyAmount: number; targetAmount: number; targetDate: string; tag: string }[],
  context: string,
  deficit: boolean,
): Promise<{ goalId: string; reason: string } | null> {
  if (!goals.length) return null
  const heaviest = [...goals].sort((a, b) => b.dailyAmount - a.dailyAmount)[0]
  const fallback = {
    goalId: heaviest.id,
    reason: deficit
      ? `"${heaviest.title}" takes the most from your budget (${rm(heaviest.dailyAmount)} a day). Pushing its target date back or skipping weekends would ease your deficit.`
      : `"${heaviest.title}" is your biggest daily commitment (${rm(heaviest.dailyAmount)} a day). Review its date and skipped days to keep it comfortable.`,
  }
  const text = await llm(
    [
      {
        role: 'system',
        content:
          'You help a user fix their budget by editing ONE savings goal. Reply with JSON only: {"goalId": string, "reason": string}. Pick the goal whose change would help most (reason in one or two sentences, mention a concrete edit such as moving the target date, lowering the amount, or skipping weekdays). goalId must be one of the provided ids.',
      },
      { role: 'user', content: JSON.stringify({ deficit, finances: context, goals }) },
    ],
    true,
  )
  if (!text) return fallback
  try {
    const j = JSON.parse(text)
    if (goals.some((g) => g.id === j.goalId) && typeof j.reason === 'string' && j.reason.trim()) {
      return { goalId: j.goalId, reason: j.reason.trim().slice(0, 400) }
    }
  } catch {}
  return fallback
}
