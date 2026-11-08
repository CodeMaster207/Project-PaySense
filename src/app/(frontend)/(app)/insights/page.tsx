import { aiProvider } from '@/lib/ai'
import { aiSettings, PROVIDERS } from '@/lib/ai-config'
import { getAppUser } from '@/lib/app-auth'
import { loadEntries } from '@/lib/data'
import { today } from '@/lib/dates'
import { feeSummary, incomeByClient } from '@/lib/insights'
import { InsightsClient } from '@/components/InsightsClient'

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const { google } = await searchParams
  const user = (await getAppUser())!
  const [engine, settings, entries] = await Promise.all([aiProvider(), aiSettings(), loadEntries(user)])
  const providers = Object.entries(PROVIDERS).map(([id, p]) => ({ id, label: p.label, model: p.model }))
  const { total, clients } = incomeByClient(entries, today())
  return (
    <InsightsClient
      engine={engine}
      own={settings.own}
      serverKey={settings.serverKey}
      providers={providers}
      google={{ ready: settings.googleReady, redirect: settings.googleRedirect, status: google ?? null }}
      clients={{ total, top: clients.slice(0, 5) }}
      fees={feeSummary(entries, today())}
    />
  )
}
