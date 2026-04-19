export interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type: string
  distance: number
  moving_time: number
  elapsed_time: number
  total_elevation_gain: number
  start_date: string
  average_speed: number
  max_speed: number
  average_heartrate?: number
  max_heartrate?: number
  suffer_score?: number
  average_cadence?: number
  workout_type?: number
}

export interface StravaAthlete {
  id: number
  firstname: string
  lastname: string
  profile: string
  city: string
  country: string
  sex: string
  summit: boolean
}

export async function refreshStravaToken(refreshToken: string) {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  return res.json()
}

export async function fetchActivities(
  accessToken: string,
  months = 6
): Promise<StravaActivity[]> {
  const after = Math.floor(Date.now() / 1000) - months * 30.44 * 24 * 3600
  const allActivities: StravaActivity[] = []
  let page = 1

  while (true) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) break
    allActivities.push(...data)
    if (data.length < 100) break
    page++
  }

  return allActivities
    .filter((a) => a.type === 'Run' || a.sport_type === 'Run')
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
}

export function metersToKm(m: number) {
  return (m / 1000).toFixed(2)
}

export function secondsToPace(seconds: number, distanceM: number): string {
  if (distanceM === 0) return '—'
  const paceSecPerKm = seconds / (distanceM / 1000)
  const mins = Math.floor(paceSecPerKm / 60)
  const secs = Math.round(paceSecPerKm % 60)
  return `${mins}:${secs.toString().padStart(2, '0')} /km`
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

export function buildStravaContext(activities: StravaActivity[]): string {
  if (activities.length === 0) return 'No recent running activities found.'

  const totalRuns = activities.length
  const totalKm = activities.reduce((s, a) => s + a.distance, 0) / 1000
  const totalTime = activities.reduce((s, a) => s + a.moving_time, 0)
  const avgKmPerWeek = totalKm / 16 // ~4 months

  const paces = activities
    .filter((a) => a.distance > 1000)
    .map((a) => (a.moving_time / (a.distance / 1000)) / 60)
  const avgPaceMin = paces.length
    ? paces.reduce((a, b) => a + b, 0) / paces.length
    : 0

  const longestRun = Math.max(...activities.map((a) => a.distance)) / 1000
  const hrActivities = activities.filter((a) => a.average_heartrate)
  const avgHR = hrActivities.length
    ? hrActivities.reduce((s, a) => s + (a.average_heartrate || 0), 0) /
      hrActivities.length
    : null

  const recentRuns = activities.slice(0, 10).map((a) => ({
    date: a.start_date.split('T')[0],
    km: (a.distance / 1000).toFixed(1),
    pace: secondsToPace(a.moving_time, a.distance),
    hr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
    elevation: Math.round(a.total_elevation_gain),
    name: a.name,
  }))

  return `
ATHLETE STRAVA DATA (last ~4 months):
- Total runs: ${totalRuns}
- Total distance: ${totalKm.toFixed(1)} km
- Average weekly volume: ${avgKmPerWeek.toFixed(1)} km/week
- Average pace: ${Math.floor(avgPaceMin)}:${Math.round((avgPaceMin % 1) * 60).toString().padStart(2, '0')} /km
- Longest run: ${longestRun.toFixed(1)} km
${avgHR ? `- Average heart rate: ${Math.round(avgHR)} bpm` : ''}

RECENT 10 RUNS:
${recentRuns.map((r) => `  ${r.date} | ${r.km}km | ${r.pace}${r.hr ? ` | ${r.hr}bpm` : ''} | +${r.elevation}m | "${r.name}"`).join('\n')}
`
}
