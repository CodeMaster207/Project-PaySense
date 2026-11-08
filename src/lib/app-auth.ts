import 'server-only'
import { cookies } from 'next/headers'
import { getPayloadClient } from '@/lib/payload'

const COOKIE = 'app-session'
const COLLECTION = 'users'

/** Resolves the signed-in app user from the isolated app-session cookie only. */
export async function getAppUser() {
  const token = (await cookies()).get(COOKIE)?.value
  if (!token) return null
  const payload = await getPayloadClient()
  try {
    const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
    if (!user || user.collection !== COLLECTION) return null
    return user
  } catch {
    return null
  }
}

export async function startAppSession(token: string, exp?: number) {
  ;(await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: exp ? new Date(exp * 1000) : undefined,
  })
}

export async function endAppSession() {
  ;(await cookies()).delete(COOKIE)
}
