import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { aiRequest } from '@/lib/ai'
import { encryptKey, googleExchangeCode, PROVIDERS, siteUrl } from '@/lib/ai-config'
import { getAppUser } from '@/lib/app-auth'
import { getPayloadClient } from '@/lib/payload'

export async function GET(req: Request) {
  const back = (status: string) => NextResponse.redirect(new URL(`/insights?google=${status}`, siteUrl()))
  const user = await getAppUser()
  if (!user) return NextResponse.redirect(new URL('/', siteUrl()))

  const url = new URL(req.url)
  const jar = await cookies()
  const saved = jar.get('g_oauth_state')?.value
  jar.delete({ name: 'g_oauth_state', path: '/ai/google' })
  if (url.searchParams.get('error')) return back('denied')
  const code = url.searchParams.get('code')
  if (!saved || !code || saved !== url.searchParams.get('state')) return back('state')

  try {
    const t = await googleExchangeCode(code)
    if (!t.refreshToken) return back('norefresh')
    const model = PROVIDERS.gemini.model
    const test = await aiRequest({ provider: 'gemini', key: t.refreshToken, model, source: 'user', auth: 'google' }, [{ role: 'user', content: 'Reply with the single word: ok' }])
    if (!test.text) return back('test')
    const payload = await getPayloadClient()
    await payload.update({
      collection: 'users',
      id: user.id,
      overrideAccess: true,
      data: { aiProvider: 'gemini', aiAuth: 'google', aiModel: model, aiKeyHint: t.email, aiKeyEnc: encryptKey(t.refreshToken) },
    })
    return back('ok')
  } catch {
    return back('token')
  }
}
