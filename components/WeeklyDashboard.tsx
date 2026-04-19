'use client'

import { useState, useEffect } from 'react'
import { Week, Workout, WorkoutType, WORKOUT_COLORS, WORKOUT_LABELS, PLAN, getCurrentWeek } from '@/lib/plan'

interface WorkoutLog {
  done: boolean
  note: string
  completedAt?: string
}
type WorkoutLogs = Record<string, WorkoutLog>

interface Activity {
  id: number
  name: string
  distance: number
  moving_time: number
  start_date: string
  average_heartrate?: number
  max_heartrate?: number
  average_cadence?: number
  total_elevation_gain: number
}

interface RunAnalysis {
  completionPct: number
  verdict: string
  paceAnalysis: string
  hrAnalysis: string
  cadenceAnalysis: string
  wins: string[]
  improvements: string[]
  nextSessionTip: string
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr)
  return (d.getDay() + 6) % 7 // 0=Mon
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0]
}

function isPast(dateStr: string): boolean {
  return dateStr < new Date().toISOString().split('T')[0]
}

function CircleProgress({ pct, size = 64, stroke = 5 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const color = pct >= 90 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#FC4C02'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  )
}

function WorkoutCard({
  workout, log, onToggle, onNote, onAnalyze, recentActivity,
}: {
  workout: Workout
  log?: WorkoutLog
  onToggle: (id: string, done: boolean) => void
  onNote: (id: string, note: string) => void
  onAnalyze: (activity: Activity) => void
  recentActivity?: Activity
}) {
  const [expanded, setExpanded] = useState(false)
  const [noteVal, setNoteVal] = useState(log?.note || '')
  const color = WORKOUT_COLORS[workout.type]
  const past = isPast(workout.date)
  const today = isToday(workout.date)

  return (
    <div style={{
      background: 'var(--surface)',
      border: `0.5px solid ${today ? color : 'var(--border)'}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 10,
      marginBottom: 8,
      opacity: workout.isTravel ? 0.6 : 1,
      transition: 'opacity 0.2s',
    }}>
      <div
        style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10 }}
        onClick={() => !workout.isTravel && setExpanded(!expanded)}
      >
        {/* Checkbox */}
        {!workout.isTravel && workout.type !== 'rest' && (
          <div
            onClick={(e) => { e.stopPropagation(); onToggle(workout.id, !log?.done) }}
            style={{
              width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
              border: `1.5px solid ${log?.done ? color : 'var(--border2)'}`,
              background: log?.done ? color : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {log?.done && (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        )}
        {(workout.isTravel || workout.type === 'rest') && (
          <div style={{ width: 20, height: 20, flexShrink: 0 }} />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{
              fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
              color, padding: '1px 6px', borderRadius: 4, background: `${color}18`,
            }}>
              {WORKOUT_LABELS[workout.type]}
            </span>
            {today && (
              <span style={{ fontSize: 10, color: '#fff', background: color, borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>
                TODAY
              </span>
            )}
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: log?.done ? 'var(--muted)' : 'var(--text)', textDecoration: log?.done ? 'line-through' : 'none' }}>
            {workout.title}
          </div>
          {workout.targetKm && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {workout.targetKm}km {workout.targetPace ? `· ${workout.targetPace}` : ''} {workout.targetHR ? `· ${workout.targetHR}` : ''}
            </div>
          )}
        </div>

        {!workout.isTravel && workout.type !== 'rest' && (
          <div style={{ fontSize: 18, color: 'var(--muted)', flexShrink: 0, marginTop: 2 }}>
            {expanded ? '↑' : '↓'}
          </div>
        )}
      </div>

      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: '0.5px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginTop: 10, marginBottom: 12 }}>
            {workout.description}
          </p>

          {/* Your notes */}
          <textarea
            value={noteVal}
            onChange={(e) => setNoteVal(e.target.value)}
            onBlur={() => onNote(workout.id, noteVal)}
            placeholder="Add your notes after completing this session..."
            rows={2}
            style={{
              width: '100%', background: 'var(--surface2)', border: '0.5px solid var(--border2)',
              borderRadius: 8, padding: '8px 10px', color: 'var(--text)', fontSize: 13,
              fontFamily: 'var(--font-body)', resize: 'none', outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {/* Analyze button if there's a recent run on this date */}
          {recentActivity && (
            <button
              onClick={() => onAnalyze(recentActivity)}
              style={{
                marginTop: 8, width: '100%', padding: '8px 12px',
                background: 'rgba(252,76,2,0.12)', border: '0.5px solid var(--orange)',
                borderRadius: 8, color: 'var(--orange)', fontSize: 13, cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontWeight: 500,
              }}
            >
              ⚡ Analyze this run vs plan
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function WeekSummary({ week, logs, workouts }: { week: Week; logs: WorkoutLogs; workouts: Workout[] }) {
  const completable = workouts.filter((w) => w.type !== 'rest' && w.type !== 'travel')
  const done = completable.filter((w) => logs[w.id]?.done)
  const pct = completable.length ? Math.round((done.length / completable.length) * 100) : 0

  const plannedKm = workouts.reduce((s, w) => s + (w.targetKm || 0), 0)
  const gymSessions = workouts.filter((w) => w.type === 'gym' && logs[w.id]?.done).length
  const runs = workouts.filter((w) => w.type !== 'gym' && w.type !== 'rest' && w.type !== 'travel' && logs[w.id]?.done)
  const qualitySessions = workouts.filter(
    (w) => (w.type === 'tempo' || w.type === 'intervals') && logs[w.id]?.done
  ).length

  const today = new Date().toISOString().split('T')[0]
  const weekEnded = today > week.endDate

  return (
    <div style={{
      background: 'var(--surface)',
      border: '0.5px solid var(--border)',
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
    }}>
      <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>
        {weekEnded ? 'Week Summary' : 'Week Progress'}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <CircleProgress pct={pct} size={72} stroke={6} />
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexDirection: 'column',
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{pct}%</span>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 2 }}>
            {done.length}/{completable.length} workouts
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {pct >= 90 ? '🔥 Outstanding week' : pct >= 70 ? '✅ Solid week' : pct >= 50 ? '📈 Keep building' : '💪 Every session counts'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'Planned km', value: `~${plannedKm}km` },
          { label: 'Gym sessions', value: `${gymSessions}` },
          { label: 'Quality runs', value: `${qualitySessions}` },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: 'var(--surface2)', borderRadius: 8, padding: '8px 10px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RunAnalysisPanel({ analysis, activity, onClose }: {
  analysis: RunAnalysis
  activity: Activity
  onClose: () => void
}) {
  const paceStr = (() => {
    const s = activity.moving_time / (activity.distance / 1000)
    return `${Math.floor(s / 60)}:${Math.round(s % 60).toString().padStart(2, '0')}/km`
  })()

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 20,
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 520,
        maxHeight: '85vh', overflowY: 'auto', border: '0.5px solid var(--border2)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, textTransform: 'uppercase' }}>
              Run Analysis
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{activity.name}</div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20,
          }}>✕</button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Completion score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <CircleProgress pct={analysis.completionPct} size={80} stroke={7} />
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>
                  {analysis.completionPct}%
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.5, marginBottom: 6 }}>
                {analysis.verdict}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  `${(activity.distance / 1000).toFixed(1)}km`,
                  paceStr,
                  activity.average_heartrate ? `${Math.round(activity.average_heartrate)}bpm` : null,
                  activity.average_cadence ? `${Math.round(activity.average_cadence * 2)}spm` : null,
                ].filter(Boolean).map((v) => (
                  <span key={v} style={{
                    fontSize: 12, background: 'var(--surface2)', border: '0.5px solid var(--border)',
                    borderRadius: 6, padding: '2px 8px', color: 'var(--text)',
                  }}>{v}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Analysis sections */}
          {[
            { label: 'Pace', text: analysis.paceAnalysis },
            { label: 'Heart rate', text: analysis.hrAnalysis },
            { label: 'Cadence', text: analysis.cadenceAnalysis },
          ].map((s) => (
            <div key={s.label} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 5 }}>
                {s.label}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', margin: 0 }}>{s.text}</p>
            </div>
          ))}

          {/* Wins */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 8 }}>
              ✅ What went well
            </div>
            {analysis.wins.map((w, i) => (
              <div key={i} style={{ fontSize: 14, color: 'var(--text)', padding: '5px 0', borderBottom: '0.5px solid var(--border)', lineHeight: 1.5 }}>
                {w}
              </div>
            ))}
          </div>

          {/* Improvements */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: 8 }}>
              ⚡ To improve
            </div>
            {analysis.improvements.map((w, i) => (
              <div key={i} style={{ fontSize: 14, color: 'var(--text)', padding: '5px 0', borderBottom: '0.5px solid var(--border)', lineHeight: 1.5 }}>
                {w}
              </div>
            ))}
          </div>

          {/* Next session tip */}
          <div style={{
            background: 'rgba(252,76,2,0.1)', border: '0.5px solid rgba(252,76,2,0.3)',
            borderRadius: 10, padding: '12px 14px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--orange)', marginBottom: 6 }}>
              Next session tip
            </div>
            <p style={{ fontSize: 14, color: 'var(--text)', margin: 0, lineHeight: 1.6 }}>
              {analysis.nextSessionTip}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WeeklyDashboard({ activities }: { activities: Activity[] }) {
  const [selectedWeek, setSelectedWeek] = useState<Week>(getCurrentWeek)
  const [logs, setLogs] = useState<WorkoutLogs>({})
  const [analysisActivity, setAnalysisActivity] = useState<Activity | null>(null)
  const [analysis, setAnalysis] = useState<RunAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [userNote, setUserNote] = useState('')

  useEffect(() => {
    fetch('/api/logs').then((r) => r.json()).then((d) => setLogs(d.logs || {}))
  }, [])

  const toggleWorkout = async (id: string, done: boolean) => {
    const updated = { ...logs, [id]: { ...logs[id], done, note: logs[id]?.note || '' } }
    setLogs(updated)
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workoutId: id, done }),
    })
  }

  const saveNote = async (id: string, note: string) => {
    const updated = { ...logs, [id]: { ...logs[id], note, done: logs[id]?.done || false } }
    setLogs(updated)
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workoutId: id, note }),
    })
  }

  const analyzeRun = async (activity: Activity) => {
    setAnalysisActivity(activity)
    setAnalysisLoading(true)
    setAnalysis(null)
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity, userNote }),
    })
    const data = await res.json()
    setAnalysis(data.analysis)
    setAnalysisLoading(false)
  }

  // Match activities to workouts by date
  const getActivityForWorkout = (workout: Workout): Activity | undefined => {
    const d = workout.date
    return activities.find((a) => a.start_date.split('T')[0] === d)
  }

  // Build 7-day grid for selected week
  const weekStart = new Date(selectedWeek.startDate)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d.toISOString().split('T')[0]
  })

  const workoutsForWeek = selectedWeek.workouts
  const completable = workoutsForWeek.filter((w) => w.type !== 'rest' && w.type !== 'travel')
  const pct = completable.length ? Math.round((completable.filter((w) => logs[w.id]?.done).length / completable.length) * 100) : 0

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '20px 20px 40px' }}>
      {/* Week selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {PLAN.map((w) => {
          const isCurrent = w.weekNum === getCurrentWeek().weekNum
          const isSelected = w.weekNum === selectedWeek.weekNum
          return (
            <button
              key={w.weekNum}
              onClick={() => setSelectedWeek(w)}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: `0.5px solid ${isSelected ? 'var(--orange)' : 'var(--border)'}`,
                background: isSelected ? 'rgba(252,76,2,0.12)' : 'var(--surface)',
                color: isSelected ? 'var(--orange)' : isCurrent ? 'var(--text)' : 'var(--muted)',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontWeight: isSelected ? 500 : 400,
                transition: 'all 0.15s',
              }}
            >
              {w.label} {isCurrent && !isSelected ? '•' : ''}
            </button>
          )
        })}
      </div>

      {/* Week header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
          {selectedWeek.subtitle}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
          {selectedWeek.dates} · {completable.filter((w) => logs[w.id]?.done).length}/{completable.length} done · {pct}%
        </div>
      </div>

      {/* 7-day mini calendar strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 20 }}>
        {days.map((date, i) => {
          const dayWorkouts = workoutsForWeek.filter((w) => w.date === date)
          const doneSome = dayWorkouts.some((w) => logs[w.id]?.done)
          const allDone = dayWorkouts.length > 0 && dayWorkouts.every((w) => w.type === 'rest' || w.type === 'travel' || logs[w.id]?.done)
          const today = isToday(date)
          const past = isPast(date)
          const mainType = dayWorkouts[0]?.type
          const color = mainType ? WORKOUT_COLORS[mainType] : '#444'

          return (
            <div key={date} style={{
              borderRadius: 8, padding: '8px 4px', textAlign: 'center',
              background: today ? 'rgba(252,76,2,0.1)' : 'var(--surface)',
              border: `0.5px solid ${today ? 'var(--orange)' : allDone ? color : 'var(--border)'}`,
              opacity: past && !doneSome && dayWorkouts.length === 0 ? 0.4 : 1,
            }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, fontWeight: today ? 600 : 400 }}>
                {DAY_LABELS[i]}
              </div>
              <div style={{ fontSize: 13, fontWeight: today ? 700 : 500, color: today ? 'var(--orange)' : 'var(--text)' }}>
                {new Date(date).getDate()}
              </div>
              {dayWorkouts.length > 0 && (
                <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center', gap: 3 }}>
                  {dayWorkouts.slice(0, 2).map((w) => (
                    <div key={w.id} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: logs[w.id]?.done ? WORKOUT_COLORS[w.type] : `${WORKOUT_COLORS[w.type]}55`,
                    }} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Workout cards grouped by day */}
      {days.map((date, i) => {
        const dayWorkouts = workoutsForWeek.filter((w) => w.date === date)
        if (dayWorkouts.length === 0) return null
        return (
          <div key={date} style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 12, fontWeight: 500, color: isToday(date) ? 'var(--orange)' : 'var(--muted)',
              marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {DAY_LABELS[i]} {new Date(date).getDate()}
              {isToday(date) && <span style={{ fontSize: 10, background: 'var(--orange)', color: '#fff', borderRadius: 4, padding: '1px 5px' }}>Today</span>}
            </div>
            {dayWorkouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                log={logs[workout.id]}
                onToggle={toggleWorkout}
                onNote={saveNote}
                onAnalyze={analyzeRun}
                recentActivity={getActivityForWorkout(workout)}
              />
            ))}
          </div>
        )
      })}

      {/* Week summary */}
      <WeekSummary week={selectedWeek} logs={logs} workouts={workoutsForWeek} />

      {/* Analysis modal */}
      {(analysisLoading || analysis) && analysisActivity && (
        <RunAnalysisPanel
          analysis={analysis || {
            completionPct: 0,
            verdict: 'Analyzing...',
            paceAnalysis: '...',
            hrAnalysis: '...',
            cadenceAnalysis: '...',
            wins: [],
            improvements: [],
            nextSessionTip: '...',
          }}
          activity={analysisActivity}
          onClose={() => { setAnalysis(null); setAnalysisActivity(null) }}
        />
      )}
    </div>
  )
}
