import { getAppUser } from '@/lib/app-auth'
import { loadSubscriptions } from '@/lib/data'
import { SubscriptionsClient } from '@/components/SubscriptionsClient'

export default async function SubscriptionsPage() {
  const user = (await getAppUser())!
  return <SubscriptionsClient subs={await loadSubscriptions(user)} />
}
