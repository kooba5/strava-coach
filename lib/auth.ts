import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production'
)

export interface TokenData {
  accessToken: string
  refreshToken: string
  athleteId: number
  athleteName: string
  athleteAvatar: string
  expiresAt: number
}

export async function setAuthCookie(data: TokenData) {
  const token = await new SignJWT(data as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)

  cookies().set('strava_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
}

export async function getAuthData(): Promise<TokenData | null> {
  const cookie = cookies().get('strava_session')
  if (!cookie) return null
  try {
    const { payload } = await jwtVerify(cookie.value, secret)
    return payload as unknown as TokenData
  } catch {
    return null
  }
}

export async function clearAuthCookie() {
  cookies().delete('strava_session')
}
