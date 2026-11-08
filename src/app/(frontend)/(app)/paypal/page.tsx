import { getAppUser } from '@/lib/app-auth'
import { loadEntries, loadSubscriptions } from '@/lib/data'
import { paypalConfigured } from '@/lib/paypal'
import { PayPalClient } from '@/components/PayPalClient'

export default async function PayPalPage() {
  const user = (await getAppUser())!
  const [entries, subs] = await Promise.all([loadEntries(user), loadSubscriptions(user)])
  return (
    <PayPalClient
      connected={user.paypalStatus === 'connected'}
      lastSync={user.paypalLastSync ?? null}
      mode={paypalConfigured() ? 'sandbox' : 'demo'}
      entries={entries}
      subs={subs}
    />
  )
}
