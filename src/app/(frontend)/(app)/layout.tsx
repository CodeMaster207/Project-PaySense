import { redirect } from 'next/navigation'
import { getAppUser } from '@/lib/app-auth'
import { getRates } from '@/lib/rates'
import { CurrencyProvider } from '@/components/CurrencyProvider'
import { Sidebar } from '@/components/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAppUser()
  if (!user) redirect('/signin')
  const { rates, source } = await getRates()
  return (
    <CurrencyProvider code={user.currency ?? 'MYR'} rates={rates} source={source}>
      <div className="flex min-h-screen">
        <Sidebar email={user.email} />
        <main className="min-w-0 flex-1 p-8">{children}</main>
      </div>
    </CurrencyProvider>
  )
}
