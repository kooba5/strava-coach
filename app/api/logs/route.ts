import { NextRequest, NextResponse } from 'next/server'
import { getAuthData } from '@/lib/auth'
import { cookies } from 'next/headers'

// We store completions in a cookie (no DB needed)
// Format: { [workoutId]: { done: boolean, note: string, completedAt: string } }

export interface WorkoutLog {
  done: boolean
  note: string
  completedAt?: string
  actualKm?: number
  stravaActivityId?: number
  autoMatched?: boolean
}

export type WorkoutLogs = Record<string, WorkoutLog>

export async function GET(req: NextRequest) {
  const auth = await getAuthData()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cookie = cookies().get('workout_logs')
  const logs: WorkoutLogs = cookie ? JSON.parse(cookie.value) : {}
  return NextResponse.json({ logs })
}

export async function POST(req: NextRequest) {
  const auth = await getAuthData()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { workoutId, done, note, actualKm, stravaActivityId, autoMatched } = await req.json()

  const cookie = cookies().get('workout_logs')
  const logs: WorkoutLogs = cookie ? JSON.parse(cookie.value) : {}

  logs[workoutId] = {
    done: done ?? logs[workoutId]?.done ?? false,
    note: note ?? logs[workoutId]?.note ?? '',
    completedAt: done ? (logs[workoutId]?.completedAt || new Date().toISOString()) : logs[workoutId]?.completedAt,
    actualKm: actualKm ?? logs[workoutId]?.actualKm,
    stravaActivityId: stravaActivityId ?? logs[workoutId]?.stravaActivityId,
    autoMatched: autoMatched ?? logs[workoutId]?.autoMatched ?? false,
  }

  const res = NextResponse.json({ success: true, logs })
  res.cookies.set('workout_logs', JSON.stringify(logs), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 90,
    path: '/',
  })
  return res
}
