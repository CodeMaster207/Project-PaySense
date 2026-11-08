'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { signOutAction } from '@/app/(frontend)/actions'
import { Icon, type IconName } from './Icon'

const nav: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Homepage', icon: 'home' },
  { href: '/dashboard', label: 'Dashboard', icon: 'chart' },
  { href: '/incomes', label: 'Incomes', icon: 'income' },
  { href: '/goals', label: 'Goal Page', icon: 'flag' },
  { href: '/plans', label: 'Plan Page', icon: 'calendar' },
  { href: '/subscriptions', label: 'Subscriptions', icon: 'renew' },
  { href: '/paypal', label: 'PayPal Integration', icon: 'wallet' },
  { href: '/insights', label: 'AI Insights', icon: 'sparkle' },
]

export function Sidebar({ email }: { email: string }) {
  const path = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    if (localStorage.getItem('sidebar-collapsed') === '1') setCollapsed(true)
  }, [])
  const toggle = () =>
    setCollapsed((c) => {
      localStorage.setItem('sidebar-collapsed', c ? '0' : '1')
      return !c
    })
  return (
    <aside className={`sticky top-0 flex h-screen shrink-0 flex-col border-r-2 border-banana-300 bg-banana-100 p-4 transition-[width] duration-200 ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className={`mb-8 flex items-center pt-2 ${collapsed ? 'flex-col gap-3' : 'justify-between gap-2 px-2'}`}>
        <div className="flex items-center gap-2 border-b-4 border-banana-400 pb-1.5">
          <span className="shrink-0 rounded-xl bg-white p-0.5">
            <img
              src="/logo.png"
              alt="PaySense logo"
              width={32}
              height={32}
              className="block size-8 rounded-lg"
              style={{ imageRendering: 'pixelated' }}
            />
          </span>
          {!collapsed && <span className="text-xl font-extrabold">PaySense</span>}
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          className="grid size-8 place-items-center rounded-lg text-peel-700 hover:bg-banana-200"
        >
          <Icon name={collapsed ? 'right' : 'left'} />
        </button>
      </div>
      <nav className="flex flex-col gap-1">
        {nav.map((n) => {
          const active = n.href === '/' ? path === '/' : path.startsWith(n.href)
          return (
            <Link
              key={n.href}
              href={n.href}
              title={collapsed ? n.label : undefined}
              aria-label={n.label}
              className={`flex items-center rounded-xl py-2.5 font-bold transition ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'} ${active ? 'bg-banana-300 text-peel-900 shadow-[0_3px_0_0_var(--color-peel-900)]' : 'text-peel-700 hover:bg-banana-200'}`}
            >
              <Icon name={n.icon} className="size-5 shrink-0" />
              {!collapsed && n.label}
            </Link>
          )
        })}
      </nav>
      <div className={`mt-auto rounded-xl bg-white text-sm ${collapsed ? 'p-2' : 'p-3'}`}>
        {!collapsed && <p className="truncate font-semibold" title={email}>{email}</p>}
        <button
          type="button"
          title={collapsed ? 'Sign out' : undefined}
          aria-label="Sign out"
          onClick={async () => {
            await signOutAction()
            router.replace('/signin')
            router.refresh()
          }}
          className={`flex items-center gap-2 font-bold text-peel-700 hover:text-peel-900 ${collapsed ? 'mx-auto' : 'mt-2'}`}
        >
          <Icon name="logout" className="size-4" /> {!collapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  )
}
