import { NextResponse } from 'next/server'
import { getAuthData } from '@/lib/auth'
import { fetchActivities, buildStravaContext } from '@/lib/strava'

export async function GET() {
  const auth = await getAuthData()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const activities = await fetchActivities(auth.accessToken)
    const context = buildStravaContext(activities)
    return NextResponse.json({ activities, context, athleteName: auth.athleteName })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }
}
