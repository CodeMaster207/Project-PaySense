'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInAction, signUpAction } from '@/app/(frontend)/actions'
import { Icon } from './Icon'
import { btnGhost, btnPrimary, card, Feedback, useAction } from './ui'

export function SignInForm() {
  const router = useRouter()
  const [mode, setMode] = useState<'choose' | 'in' | 'up'>('choose')
  const [viaPayPal, setViaPayPal] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { run, pending, error } = useAction()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    run(
      () => (mode === 'up' ? signUpAction(name, email, password) : signInAction(email, password)),
      () => router.replace(viaPayPal ? '/paypal' : '/'),
    )
  }

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className={`${card} w-full max-w-md p-8`}>
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 block w-fit rounded-2xl bg-white p-1">
            <img src="/logo.png" alt="PaySense logo" width={56} height={56} className="block size-14 rounded-xl" style={{ imageRendering: 'pixelated' }} />
          </span>
          <h1 className="text-3xl font-extrabold">Sign-in!</h1>
          <p className="mt-1 text-sm text-peel-700">Plan goals with AI. Track money with PayPal sandbox.</p>
        </div>

        {mode === 'choose' ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className={`${btnPrimary} w-full py-3`}
              onClick={() => {
                setViaPayPal(true)
                setMode('in')
              }}
            >
              <Icon name="wallet" /> Connect to PayPal
            </button>
            <button type="button" className={`${btnGhost} w-full py-3`} onClick={() => setMode('in')}>
              Sign-in / Sign-up with Email
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            {viaPayPal && (
              <p className="rounded-xl bg-banana-100 p-3 text-sm">
                Create or open your account first, then you will link your PayPal sandbox on the next screen. We never ask for your PayPal password.
              </p>
            )}
            {mode === 'up' && (
              <label className="flex flex-col gap-1 text-sm font-bold">
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </label>
            )}
            <label className="flex flex-col gap-1 text-sm font-bold">
              Email
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-bold">
              Password
              <input
                type="password"
                required
                minLength={mode === 'up' ? 8 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              />
            </label>
            <Feedback error={error} />
            <button className={`${btnPrimary} py-3`} disabled={pending}>
              {pending ? 'Please wait...' : mode === 'up' ? 'Create account' : 'Sign in'}
            </button>
            <div className="flex justify-between text-sm font-bold text-peel-700">
              <button type="button" onClick={() => setMode(mode === 'up' ? 'in' : 'up')}>
                {mode === 'up' ? 'I already have an account' : 'Create an account'}
              </button>
              <button type="button" onClick={() => { setMode('choose'); setViaPayPal(false) }}>Back</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
