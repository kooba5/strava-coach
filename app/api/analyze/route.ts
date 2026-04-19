import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthData } from '@/lib/auth'
import { PLAN, Workout } from '@/lib/plan'
import {
  fetchStreams,
  buildKmSplits,
  buildMinuteSplits,
  detectIntervalReps,
  formatSplitsForPrompt,
} from '@/lib/streams'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function findPlannedWorkout(date: string): Workout | null {
  const d = date.split('T')[0]
  for (const week of PLAN) {
    const w = week.workouts.find((w) => w.date === d)
    if (w) return w
  }
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

  // Fetch streams from Strava
  let splitsSection = ''
  let hasSplits = false
  try {
    const streams = await fetchStreams(activity.id, auth.accessToken)
    if (streams && streams.time.length > 0) {
      hasSplits = true
      const isIntervals = planned?.type === 'intervals' || planned?.type === 'tempo'

      if (isIntervals) {
        const reps = detectIntervalReps(streams, planned?.targetPace)
        const minSplits = buildMinuteSplits(streams)
        splitsSection = formatSplitsForPrompt(minSplits, 'minute', reps.length > 0 ? reps : undefined)
      } else {
        const kmSplits = buildKmSplits(streams)
        splitsSection = formatSplitsForPrompt(kmSplits, 'km')
      }
    }
  } catch {
    splitsSection = ''
  }

  const prompt = `You are analyzing a completed run for Jakub Ratajczak, a 196cm runner targeting sub-1:35 on 23 May 2026.

PLANNED WORKOUT:
${planned ? `Type: ${planned.type}
Title: ${planned.title}
Description: ${planned.description}
Target distance: ${planned.targetKm ?? 'not specified'}km
Target pace: ${planned.targetPace ?? 'not specified'}
Target HR: ${planned.targetHR ?? 'not specified'}` : 'No specific workout planned for this date'}

ACTUAL RUN SUMMARY:
- Date: ${activity.start_date}
- Distance: ${(activity.distance / 1000).toFixed(2)}km
- Moving time: ${Math.floor(activity.moving_time / 60)}m ${activity.moving_time % 60}s
- Average pace: ${actualPaceStr}
- Average HR: ${activity.average_heartrate ? Math.round(activity.average_heartrate) + 'bpm' : 'not recorded'}
- Max HR: ${activity.max_heartrate ? Math.round(activity.max_heartrate) + 'bpm' : 'not recorded'}
- Average cadence: ${activity.average_cadence ? Math.round(activity.average_cadence * 2) + 'spm' : 'not recorded'}
- Elevation gain: ${Math.round(activity.total_elevation_gain)}m
- Name: "${activity.name}"

${splitsSection ? `DETAILED SPLIT DATA (reconstructed from GPS streams):\n${splitsSection}` : '(No split data available — analysis based on summary only)'}

ATHLETE CONTEXT:
- Target cadence: 170–175spm (baseline 154spm — mention any improvement or regression)
- Known weakness: leg fatigue at high HR, likely overstriding
- For intervals: comment on each rep individually if rep data available
- For easy runs: check for pace drift (speeding up = too hard early)
- For long runs: check last few km for significant slowdown (fatigue)

${userNote ? `ATHLETE'S OWN FEEDBACK: "${userNote}"` : ''}

Respond ONLY with valid JSON (no markdown, no backticks, no preamble):
{
  "completionPct": 85,
  "verdict": "one sentence referencing actual numbers",
  "paceAnalysis": "2-3 sentences referencing specific splits or reps if available",
  "hrAnalysis": "2 sentences on HR average and drift",
  "cadenceAnalysis": "2 sentences on cadence vs 170spm target",
  "splitsInsight": "2 sentences on split pattern (negative split / fade / rep consistency)",
  "wins": ["specific win with numbers", "another win"],
  "improvements": ["specific fix with numbers", "another improvement"],
  "nextSessionTip": "one very specific actionable tip"
}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const clean = text.replace(/```json|```/g, '').trim()

  try {
    const analysis = JSON.parse(clean)
    return NextResponse.json({ analysis, planned, hasSplits })
  } catch {
    return NextResponse.json({ error: 'Parse failed', raw: text }, { status: 500 })
  }
}
