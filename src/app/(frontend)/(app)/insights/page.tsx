import { aiProvider } from '@/lib/ai'
import { aiSettings, PROVIDERS } from '@/lib/ai-config'
import { InsightsClient } from '@/components/InsightsClient'

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const { google } = await searchParams
  const [engine, settings] = await Promise.all([aiProvider(), aiSettings()])
  const providers = Object.entries(PROVIDERS).map(([id, p]) => ({ id, label: p.label, model: p.model }))
  return (
    <InsightsClient
      engine={engine}
      own={settings.own}
      serverKey={settings.serverKey}
      providers={providers}
      google={{ ready: settings.googleReady, redirect: settings.googleRedirect, status: google ?? null }}
    />
  )
}
