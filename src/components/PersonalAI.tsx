'use client'

import { useRef, useState, useTransition } from 'react'
import { chatAction } from '@/app/(frontend)/actions'
import { localize } from '@/lib/money'
import { Icon } from './Icon'
import { card } from './ui'

type M = { role: 'user' | 'assistant'; content: string }

export function PersonalAI({
  engine,
  className = '',
  title = 'Personal AI',
  greeting = 'Hi! Ask me about your spending, subscriptions or goals.',
  suggestions = [],
  context,
}: {
  engine: string
  className?: string
  title?: string
  greeting?: string
  /** One-tap prompts shown above the input. */
  suggestions?: string[]
  /** Hidden snapshot sent along with each question (e.g. the dashboard's current figures). */
  context?: string
}) {
  const [msgs, setMsgs] = useState<M[]>([
    { role: 'assistant', content: greeting },
  ])
  const [text, setText] = useState('')
  const [pending, start] = useTransition()
  const end = useRef<HTMLDivElement>(null)

  function ask(q: string) {
    if (!q || pending) return
    const next: M[] = [...msgs, { role: 'user', content: q }]
    setMsgs(next)
    setText('')
    start(async () => {
      const history = next.slice(1).map((m, i, all) => (context && i === all.length - 1 && m.role === 'user' ? { ...m, content: `${context}\n\nQuestion: ${m.content}` } : m))
      const r = await chatAction(history)
      setMsgs([...next, { role: 'assistant', content: r.ok ? (r.data ?? '') : r.error }])
      setTimeout(() => end.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    })
  }

  function send(e: React.FormEvent) {
    e.preventDefault()
    ask(text.trim())
  }

  return (
    <section className={`${card} flex min-h-0 flex-col overflow-hidden ${className}`}>
      <h2 className="flex items-center justify-between border-b-2 border-banana-200 bg-banana-100 px-4 py-2 font-extrabold">
        <span className="flex items-center gap-2"><Icon name="chat" className="size-5" /> {title}</span>
        <span className="text-xs font-bold text-peel-500">{engine}</span>
      </h2>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {msgs.map((m, i) => (
          <p key={i} className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'self-end bg-banana-300' : 'self-start bg-banana-100'}`}>
            {m.role === 'assistant' ? localize(m.content) : m.content}
          </p>
        ))}
        {pending && <p className="self-start rounded-2xl bg-banana-100 px-3 py-2 text-sm text-peel-500">Thinking...</p>}
        <div ref={end} />
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t-2 border-banana-100 px-3 pt-2">
          {suggestions.map((q) => (
            <button key={q} type="button" disabled={pending} onClick={() => ask(q)} className="rounded-full border-2 border-banana-300 bg-banana-50 px-3 py-1 text-xs font-bold text-peel-700 hover:bg-banana-200">
              {q}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={send} className="flex gap-2 border-t-2 border-banana-200 p-2">
        <input className="min-w-0 flex-1" placeholder="Ask anything here!" value={text} onChange={(e) => setText(e.target.value)} />
        <button aria-label="Send" className="grid size-10 place-items-center rounded-xl bg-banana-300 hover:bg-banana-400" disabled={pending}>
          <Icon name="send" />
        </button>
      </form>
    </section>
  )
}
