'use client'

import { useState } from 'react'
import { insightsAction, removeAiSettingsAction, saveAiSettingsAction } from '@/app/(frontend)/actions'
import { rm } from '@/lib/dates'
import type { Insight } from '@/lib/types'
import { Icon } from './Icon'
import { btnDanger, btnGhost, btnPrimary, card, Feedback, PageTitle, useAction } from './ui'

const KINDS: Record<Insight['kind'], { label: string; badge: string }> = {
  unusual: { label: 'Unusual spending', badge: 'bg-berry-100 text-berry-500' },
  saving: { label: 'Saving idea', badge: 'bg-leaf-100 text-leaf-700' },
  subscription: { label: 'Subscription', badge: 'bg-banana-200 text-peel-900' },
  forecast: { label: 'Forecast', badge: 'bg-sky-100 text-sky-700' },
  fees: { label: 'PayPal fees', badge: 'bg-violet-100 text-violet-700' },
  clients: { label: 'Clients', badge: 'bg-leaf-100 text-leaf-700' },
}

type Own = { provider: string; label: string; model: string; hint: string; auth: 'key' | 'google' }
type Google = { ready: boolean; redirect: string; status: string | null }

const GOOGLE_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  ok: { ok: true, text: 'Signed in with Google. Gemini is now connected.' },
  denied: { ok: false, text: 'Google sign-in was cancelled.' },
  state: { ok: false, text: 'The sign-in could not be verified. Please try again.' },
  token: { ok: false, text: 'Google did not accept the sign-in. Check the client ID, secret and redirect URI.' },
  norefresh: { ok: false, text: 'Google did not allow ongoing access. Remove this app from your Google account permissions and try again.' },
  test: { ok: false, text: 'You signed in, but Gemini refused the request. The account may not have Gemini API access.' },
  unconfigured: { ok: false, text: 'Google sign-in is not set up on this server yet.' },
}

function AiAccount({ engine, own, serverKey, providers, google }: { engine: string; own: Own | null; serverKey: boolean; providers: { id: string; label: string; model: string }[]; google: Google }) {
  const save = useAction()
  const remove = useAction()
  const [provider, setProvider] = useState(providers[0]?.id ?? 'openai')
  const [key, setKey] = useState('')
  const [model, setModel] = useState('')
  const chosen = providers.find((p) => p.id === provider)

  return (
    <section className={`${card} mb-6 p-5`}>
      <h2 className="mb-1 text-lg font-extrabold">Your AI account</h2>
      <p className="mb-3 text-sm font-bold text-peel-900">
        {own
          ? own.auth === 'google'
            ? `Using Gemini, signed in with Google as ${own.hint || 'your account'} (model ${own.model}).`
            : `Using your ${own.label} account (key ending ${own.hint}, model ${own.model}).`
          : serverKey
            ? `Using the AI key set on the server (${engine}). Connect your own account below to use that instead.`
            : 'No AI account connected, so simple built-in rules are used. Connect one below to turn on AI everywhere in the app.'}
      </p>
      {google.status && GOOGLE_MESSAGES[google.status] && (
        <p role="status" className={`mb-3 rounded-xl px-3 py-2 text-sm font-semibold ${GOOGLE_MESSAGES[google.status].ok ? 'bg-leaf-100 text-leaf-700' : 'bg-berry-100 text-berry-500'}`}>
          {GOOGLE_MESSAGES[google.status].text}
        </p>
      )}
      <div className="mb-4 rounded-xl border-2 border-banana-200 bg-banana-50 p-4">
        <p className="mb-2 text-sm font-bold">Gemini: sign in instead of using a key</p>
        {google.ready ? (
          <a href="/ai/google/start" className={btnGhost}>
            <Icon name="check" /> Sign in with Google
          </a>
        ) : (
          <>
            <button type="button" className={`${btnGhost} opacity-60`} disabled>Sign in with Google</button>
            <p className="mt-2 text-xs text-peel-700">
              Not set up on this server. Create an OAuth client in Google Cloud, add <code>{google.redirect}</code> as an authorised redirect URI, enable the Gemini API, then set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in <code>.env.local</code> and restart.
            </p>
          </>
        )}
        <p className="mt-2 text-xs text-peel-500">OpenAI and Claude do not offer a sign-in for other apps, so those two need an API key (below).</p>
      </div>
      <form
        className="grid grid-cols-2 items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          save.run(() => saveAiSettingsAction({ provider, model, key }), () => setKey(''))
        }}
      >
        <label className="flex flex-col gap-1 text-sm font-bold">
          Provider
          <select value={provider} onChange={(e) => setProvider(e.target.value)}>
            {providers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          Model (optional)
          <input maxLength={80} placeholder={chosen?.model} value={model} onChange={(e) => setModel(e.target.value)} />
        </label>
        <label className="col-span-2 flex flex-col gap-1 text-sm font-bold">
          API key
          <input required type="password" autoComplete="off" spellCheck={false} placeholder="Paste your API key" value={key} onChange={(e) => setKey(e.target.value)} />
        </label>
        <div className="col-span-2 flex flex-wrap items-center gap-3">
          <button className={btnPrimary} disabled={save.pending}>
            <Icon name="check" /> {save.pending ? 'Testing...' : own ? 'Test and replace' : 'Test and save'}
          </button>
          {own && (
            <button type="button" className={btnGhost} disabled={remove.pending} onClick={() => remove.run(() => removeAiSettingsAction())}>
              Remove my account
            </button>
          )}
          <Feedback error={save.error ?? remove.error} notice={save.notice ?? remove.notice} />
        </div>
      </form>
      <p className="mt-3 text-xs text-peel-500">
        Use an API key from your OpenAI, Anthropic (Claude) or Google AI Studio (Gemini) developer account. A chat subscription such as ChatGPT Plus, Claude Pro or Gemini Advanced does not include API access.
        The key is tested once, then stored encrypted on the server and never shown again. Requests go from the server straight to the provider you chose, and you are billed by that provider.
      </p>
    </section>
  )
}

type Clients = { total: number; top: { name: string; amount: number; share: number }[] }
type Fees = { fees: number; paypalIncome: number; net: number; rate: number }

function Overview({ clients, fees }: { clients: Clients; fees: Fees }) {
  const lead = clients.top[0]
  const concentrated = lead && clients.top.length > 1 && lead.share >= 0.5
  return (
    <section className={`${card} mb-6 p-5`}>
      <h2 className="text-lg font-extrabold">Last 90 days at a glance</h2>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl bg-banana-50 p-3"><p className="text-xs font-bold text-peel-700">Income</p><p className="text-lg font-extrabold text-leaf-700">{rm(clients.total)}</p></div>
        <div className="rounded-xl bg-banana-50 p-3"><p className="text-xs font-bold text-peel-700">PayPal fees</p><p className="text-lg font-extrabold text-berry-500">-{rm(fees.fees)}</p></div>
        <div className="rounded-xl bg-peel-900 p-3 text-white"><p className="text-xs font-bold opacity-80">After fees</p><p className="text-lg font-extrabold">{rm(fees.net)}</p></div>
      </div>
      {fees.fees > 0 && <p className="mt-2 text-xs text-peel-500">Fees are {(fees.rate * 100).toFixed(1)}% of what you received through PayPal.</p>}

      <h3 className="mt-5 font-extrabold">Income by client</h3>
      {clients.top.length === 0 ? (
        <p className="mt-1 text-sm text-peel-500">No income recorded in the last 90 days.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {clients.top.map((c) => (
            <li key={c.name}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-semibold">{c.name}</span>
                <span className="shrink-0 text-peel-700">{rm(c.amount)} · {Math.round(c.share * 100)}%</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-banana-100">
                <div className={`h-full rounded-full ${c === lead && concentrated ? 'bg-berry-500' : 'bg-leaf-500'}`} style={{ width: `${Math.max(2, Math.round(c.share * 100))}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {concentrated && (
        <p role="status" className="mt-3 rounded-xl bg-berry-100 px-3 py-2 text-sm font-semibold text-berry-500">
          {Math.round(lead.share * 100)}% of your income comes from {lead.name}. Relying on one client is risky.
        </p>
      )}
    </section>
  )
}

export function InsightsClient({ engine, own, serverKey, providers, google, clients, fees }: { engine: string; own: Own | null; serverKey: boolean; providers: { id: string; label: string; model: string }[]; google: Google; clients: Clients; fees: Fees }) {
  const act = useAction()
  const [result, setResult] = useState<{ insights: Insight[]; ai: boolean; engine?: string; aiError?: string } | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const disconnect = useAction()

  return (
    <div className="max-w-3xl">
      <PageTitle icon="sparkle" title="AI Insights" sub="AI reads your PayPal and recorded transactions and points out what stands out." />

      <Overview clients={clients} fees={fees} />

      <AiAccount engine={engine} own={own} serverKey={serverKey} providers={providers} google={google} />

      <section className={`${card} mb-6 p-5`}>
        <p className="text-sm text-peel-700">
          This analysis looks at your last 90 days of transactions and your subscriptions. It looks for payments that are out of pattern, ways to spend less, subscriptions worth reviewing, what PayPal fees cost you, how much of your income depends on one client, and what next month is likely to look like.
          Findings cite your real amounts, and nothing is changed in your records.
          {engine === 'built-in planner' ? ' No AI account is connected, so simple built-in rules are used instead.' : ''}
        </p>
        <details className="mt-4 rounded-xl border-2 border-banana-200 bg-banana-50 px-4 py-2 text-sm text-peel-700">
          <summary className="cursor-pointer font-bold text-peel-900">How is AI used here?</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><b>What it receives.</b> Your recent transactions (date, type, description, amount, and whether PayPal supplied it) and your subscriptions. Up to 150 transactions from the last 90 days are sent. Planned goal funding is left out.</li>
            <li><b>What it does.</b> It analyses the data rather than writing freely: it spots payments that are out of pattern, recurring costs worth reviewing, ways to spend less, and what the next 30 days look like.</li>
            <li><b>What comes back.</b> A short list of findings in a fixed format. Each one is labelled as unusual spending, a saving idea, a subscription, a forecast, PayPal fees or clients. The totals and client shares are calculated exactly by the app and handed to the AI, so it never has to do the sums itself. The app checks the format, drops anything malformed, and shows at most six.</li>
            <li><b>What it never does.</b> It does not add, edit or delete any of your records, and it is told not to invent transactions.</li>
            <li><b>Privacy and fallback.</b> Data is sent to your configured AI provider only when a key is set on the server. Without one, nothing leaves the app and simple built-in rules produce basic findings instead.</li>
          </ul>
        </details>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className={btnPrimary} disabled={act.pending} onClick={() => { setDismissed(false); act.run(() => insightsAction(), (r) => setResult(r.data ?? null)) }}>
            <Icon name="sparkle" /> {act.pending ? 'Analysing...' : result ? 'Analyse again' : 'Analyse my spending'}
          </button>
          <Feedback error={act.error} />
        </div>
      </section>

      {result?.aiError && !dismissed && (
        <section role="alert" className={`${card} mb-4 border-berry-500 p-4`}>
          <p className="font-extrabold text-berry-500">Your AI account did not answer</p>
          <p className="mt-1 text-sm text-peel-700">{result.aiError} Simple built-in rules were used for the findings below. You can keep the connection and try again later, or disconnect this AI account.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" className={btnGhost} onClick={() => setDismissed(true)}>Keep connection</button>
            <button type="button" className={btnDanger} disabled={disconnect.pending} onClick={() => disconnect.run(() => removeAiSettingsAction(), () => { setDismissed(true); setResult((r) => (r ? { ...r, aiError: undefined } : r)) })}>
              {disconnect.pending ? 'Disconnecting...' : 'Disconnect AI account'}
            </button>
            <Feedback error={disconnect.error} />
          </div>
        </section>
      )}

      {result && (
        <>
          <p className="mb-3 text-sm font-bold text-peel-700">
            <span className="mr-2 rounded-full bg-banana-200 px-2 py-0.5 text-xs font-bold text-peel-900">{result.ai ? `AI analysis by ${result.engine ?? 'your AI account'}` : 'Rule-based analysis'}</span>
            {result.insights.length} finding{result.insights.length === 1 ? '' : 's'}
          </p>
          <ul className="space-y-3">
            {result.insights.map((i, n) => (
              <li key={n} className={`${card} p-4`}>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${KINDS[i.kind].badge}`}>{KINDS[i.kind].label}</span>
                <h2 className="mt-2 font-extrabold">{i.title}</h2>
                <p className="mt-1 text-sm text-peel-700">{i.detail}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
