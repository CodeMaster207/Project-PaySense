import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getAppUser } from '@/lib/app-auth'
import { googleAuthUrl, googleConfigured, siteUrl } from '@/lib/ai-config'

export async function GET() {
  if (!(await getAppUser())) return NextResponse.redirect(new URL('/', siteUrl()))
  if (!googleConfigured()) return NextResponse.redirect(new URL('/insights?google=unconfigured', siteUrl()))
  const state = crypto.randomBytes(16).toString('hex')
  ;(await cookies()).set('g_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/ai/google',
    maxAge: 600,
  })
  return NextResponse.redirect(googleAuthUrl(state))
}
