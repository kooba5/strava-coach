import { NextRequest, NextResponse } from 'next/server'
import { setAuthCookie } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=access_denied', req.url))
  }

  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  const tokenData = await tokenRes.json()

  if (!tokenData.access_token) {
    return NextResponse.redirect(new URL('/login?error=token_failed', req.url))
  }

  await setAuthCookie({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    athleteId: tokenData.athlete.id,
    athleteName: `${tokenData.athlete.firstname} ${tokenData.athlete.lastname}`,
    athleteAvatar: tokenData.athlete.profile,
    expiresAt: tokenData.expires_at,
  })

  return NextResponse.redirect(new URL('/dashboard', req.url))
}
