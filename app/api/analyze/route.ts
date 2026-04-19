import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthData } from '@/lib/auth'
import { PLAN, Workout } from '@/lib/plan'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function findPlannedWorkout(date: string): Workout | null {
  const d = date.split('T')[0]
  for (const week of PLAN) {
    const w = week.workouts.find((w) => w.date === d)
    if (w) return w
  }
  // find closest workout by date
  const allWorkouts = PLAN.flatMap((w) => w.workouts).filter(
    (w) => w.type !== 'rest' && w.type !== 'travel'
  )
  allWorkouts.sort((a, b) => {
    const da = Math.abs(new Date(a.date).getTime() - new Date(d).getTime())
    const db = Math.abs(new Date(b.date).getTime() - new Date(d).getTime())
    return da - db
  })
  return allWorkouts[0] || null
}

export async function POST(req: NextRequest) {
  const auth = await getAuthData()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { activity, userNote } = await req.json()

  const planned = findPlannedWorkout(activity.start_date)

  const actualPaceSecPerKm = activity.moving_time / (activity.distance / 1000)
  const actualPaceStr = `${Math.floor(actualPaceSecPerKm / 60)}:${Math.round(actualPaceSecPerKm % 60).toString().padStart(2, '0')}/km`

  const prompt = `Analyze this completed run vs the training plan.

PLANNED WORKOUT:
${planned ? JSON.stringify(planned, null, 2) : 'No specific workout planned for this date'}

ACTUAL RUN:
- Date: ${activity.start_date}
- Distance: ${(activity.distance / 1000).toFixed(2)}km
- Moving time: ${Math.floor(activity.moving_time / 60)}:${(activity.moving_time % 60).toString().padStart(2, '0')}
- Average pace: ${actualPaceStr}
- Average HR: ${activity.average_heartrate ? Math.round(activity.average_heartrate) + 'bpm' : 'not recorded'}
- Max HR: ${activity.max_heartrate ? Math.round(activity.max_heartrate) + 'bpm' : 'not recorded'}
- Cadence: ${activity.average_cadence ? Math.round(activity.average_cadence * 2) + 'spm' : 'not recorded'}
- Elevation gain: ${Math.round(activity.total_elevation_gain)}m
- Name: "${activity.name}"

ATHLETE CONTEXT:
- Target cadence: 170–175spm (current avg: 154spm — key focus area)
- Goal: sub-1:35 half marathon on 23 May 2026
- Known weakness: legs fatigue at high HR, likely due to overstriding

${userNote ? `ATHLETE'S OWN FEEDBACK: "${userNote}"` : ''}

Respond ONLY with a JSON object (no markdown, no preamble) with this exact structure:
{
  "completionPct": 85,
  "verdict": "one sentence overall verdict",
  "paceAnalysis": "2 sentences on pace vs plan",
  "hrAnalysis": "2 sentences on HR and effort",
  "cadenceAnalysis": "2 sentences on cadence",
  "wins": ["win 1", "win 2"],
  "improvements": ["thing to fix 1", "thing to fix 2"],
  "nextSessionTip": "one specific tip for the next session"
}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const clean = text.replace(/```json|```/g, '').trim()

  try {
    const analysis = JSON.parse(clean)
    return NextResponse.json({ analysis, planned })
  } catch {
    return NextResponse.json({ error: 'Parse failed', raw: text }, { status: 500 })
  }
}
