import 'server-only'
import crypto from 'node:crypto'
import { getAppUser } from './app-auth'
import { getPayloadClient } from './payload'

export type Provider = 'openai' | 'anthropic' | 'gemini'

export const PROVIDERS: Record<Provider, { label: string; model: string }> = {
  openai: { label: 'OpenAI', model: 'gpt-4o-mini' },
  anthropic: { label: 'Claude', model: 'claude-haiku-5-5' },
  gemini: { label: 'Gemini', model: 'gemini-2.5-flash' },
}

export const isProvider = (v: unknown): v is Provider => typeof v === 'string' && v in PROVIDERS

/** `key` = a pasted API key. `google` = `key` holds an encrypted-at-rest Google refresh token (Gemini only). */
export type AiConfig = { provider: Provider; key: string; model: string; source: 'user' | 'server'; auth: 'key' | 'google' }

const secretKey = () => crypto.createHash('sha256').update(process.env.PAYLOAD_SECRET ?? 'dev-secret-change-me-in-production').digest()

export function encryptKey(plain: string) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join('.')
}

export function decryptKey(stored: string) {
  const [iv, tag, data] = stored.split('.').map((s) => Buffer.from(s, 'base64'))
  const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

// ---------- Google sign-in (Gemini) ----------
const GOOGLE_SCOPES = process.env.GOOGLE_AI_SCOPES || 'openid email https://www.googleapis.com/auth/generative-language.retriever https://www.googleapis.com/auth/cloud-platform'

export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
export const googleRedirectUri = () => `${siteUrl()}/ai/google/callback`

export function googleAuthUrl(state: string) {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`
}

async function googleToken(params: Record<string, string>) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID ?? '', client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '', ...params }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Google token request failed (${res.status}).`)
  return (await res.json()) as { access_token: string; expires_in: number; refresh_token?: string }
}

export async function googleExchangeCode(code: string) {
  const t = await googleToken({ grant_type: 'authorization_code', code, redirect_uri: googleRedirectUri() })
  let email = ''
  try {
    const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${t.access_token}` }, cache: 'no-store' })
    if (res.ok) email = ((await res.json()) as { email?: string }).email ?? ''
  } catch {}
  return { accessToken: t.access_token, refreshToken: t.refresh_token, email }
}

const accessCache = new Map<string, { token: string; exp: number }>()

/** Short-lived Gemini access token for a stored refresh token. */
export async function googleAccessToken(refreshToken: string) {
  const hit = accessCache.get(refreshToken)
  if (hit && hit.exp > Date.now() + 60_000) return hit.token
  const t = await googleToken({ grant_type: 'refresh_token', refresh_token: refreshToken })
  accessCache.set(refreshToken, { token: t.access_token, exp: Date.now() + t.expires_in * 1000 })
  return t.access_token
}

export async function revokeGoogleToken(refreshToken: string) {
  accessCache.delete(refreshToken)
  try {
    await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: refreshToken }) })
  } catch {}
}

// ---------- resolving the AI to use ----------
/** The AI account to use for the signed-in user: their own if they connected one, otherwise the server's key. */
export async function resolveAi(): Promise<AiConfig | null> {
  const user = await getAppUser()
  if (user) {
    const payload = await getPayloadClient()
    const doc = await payload.findByID({ collection: 'users', id: user.id, overrideAccess: true, depth: 0 })
    if (doc.aiKeyEnc && isProvider(doc.aiProvider)) {
      try {
        const auth = doc.aiAuth === 'google' && doc.aiProvider === 'gemini' ? 'google' : 'key'
        return { provider: doc.aiProvider, key: decryptKey(doc.aiKeyEnc), model: doc.aiModel || PROVIDERS[doc.aiProvider].model, source: 'user', auth }
      } catch {
        // Unreadable (for example the server secret changed): fall through to the server key.
      }
    }
  }
  const key = process.env.APP_OPENAI_API_KEY
  return key ? { provider: 'openai', key, model: process.env.APP_OPENAI_MODEL || PROVIDERS.openai.model, source: 'server', auth: 'key' } : null
}

/** Non-secret view of the AI setup, safe to send to the browser. */
export async function aiSettings() {
  const user = await getAppUser()
  let own: { provider: Provider; label: string; model: string; hint: string; auth: 'key' | 'google' } | null = null
  if (user) {
    const payload = await getPayloadClient()
    const doc = await payload.findByID({ collection: 'users', id: user.id, overrideAccess: true, depth: 0 })
    if (doc.aiKeyEnc && isProvider(doc.aiProvider)) {
      own = {
        provider: doc.aiProvider,
        label: PROVIDERS[doc.aiProvider].label,
        model: doc.aiModel || PROVIDERS[doc.aiProvider].model,
        hint: doc.aiKeyHint ?? '',
        auth: doc.aiAuth === 'google' ? 'google' : 'key',
      }
    }
  }
  return { own, serverKey: Boolean(process.env.APP_OPENAI_API_KEY), googleReady: googleConfigured(), googleRedirect: googleRedirectUri() }
}
