import { getAppUser } from '@/lib/app-auth'
import { loadForecast } from '@/lib/forecast-input'
import { ForecastClient } from '@/components/ForecastClient'

export default async function ForecastPage() {
  const user = (await getAppUser())!
  return <ForecastClient forecast={await loadForecast(user)} />
}
