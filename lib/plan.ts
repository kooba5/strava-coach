export type WorkoutType = 'gym' | 'easy' | 'tempo' | 'intervals' | 'long' | 'race' | 'rest' | 'travel' | 'strides'

export interface Workout {
  id: string
  date: string // YYYY-MM-DD
  type: WorkoutType
  title: string
  description: string
  targetKm?: number
  targetPace?: string
  targetHR?: string
  isTravel?: boolean
}

export interface Week {
  weekNum: number
  label: string
  subtitle: string
  dates: string
  startDate: string
  endDate: string
  workouts: Workout[]
}

export const PLAN: Week[] = [
  {
    weekNum: 1,
    label: 'Week 1',
    subtitle: 'Recovery + Reactivation',
    dates: '20–26 Apr',
    startDate: '2026-04-20',
    endDate: '2026-04-26',
    workouts: [
      {
        id: 'w1-mon',
        date: '2026-04-20',    // Mon
        type: 'gym',
        title: 'Gym (light)',
        description: 'Single-leg RDL, Bulgarian split squats, hip thrusts, calf raises, dead bugs. Keep it light — legs still cooked from the race.',
      },
      {
        id: 'w1-tue',
        date: '2026-04-21',    // Tue
        type: 'easy',
        title: '6km easy + cadence drill',
        description: 'Very easy effort at 5:50–6:10/km. Focus: consciously shorten stride, target 170spm. Use a metronome app if needed.',
        targetKm: 6,
        targetPace: '5:50–6:10/km',
        targetHR: '140–150bpm',
      },
      {
        id: 'w1-wed',
        date: '2026-04-22',    // Wed
        type: 'easy',
        title: '8km easy',
        description: 'Easy aerobic run at 5:40–6:00/km. HR must stay under 155. If it creeps up, slow down.',
        targetKm: 8,
        targetPace: '5:40–6:00/km',
        targetHR: '140–155bpm',
      },
      {
        id: 'w1-thu',
        date: '2026-04-23',    // Thu
        type: 'gym',
        title: 'Gym',
        description: 'Full session: single-leg RDL 3×10, Bulgarian split squats 3×8 each, hip thrusts 3×12, calf raises 3×15, dead bugs 3×10.',
      },
      {
        id: 'w1-fri',
        date: '2026-04-24',    // Fri
        type: 'strides',
        title: '6km easy + strides',
        description: '6km easy then 4×100m strides at 4:00–4:15/km pace. Walk back to recover fully between each. These train fast-twitch without fatigue.',
        targetKm: 6,
        targetPace: '5:40–6:00/km easy',
        targetHR: '140–150bpm',
      },
      {
        id: 'w1-sat',
        date: '2026-04-25',    // Sat
        type: 'easy',
        title: '6km easy (evening)',
        description: 'Saturday evening easy run. Keep it genuinely easy — tomorrow is the long run. 5:45–6:00/km, HR under 150.',
        targetKm: 6,
        targetPace: '5:45–6:00/km',
        targetHR: '140–150bpm',
      },
      {
        id: 'w1-sun',
        date: '2026-04-26',    // Sun
        type: 'long',
        title: '14km long run',
        description: 'Long run at easy effort 5:30–5:50/km. No pace pressure — this is about time on feet and aerobic base. Keep HR under 155.',
        targetKm: 14,
        targetPace: '5:30–5:50/km',
        targetHR: '140–155bpm',
      },
    ],
  },
  {
    weekNum: 2,
    label: 'Week 2',
    subtitle: 'Mountain Trip 🏔️',
    dates: '27 Apr–3 May',
    startDate: '2026-04-27',
    endDate: '2026-05-03',
    workouts: [
      {
        id: 'w2-mon',
        date: '2026-04-27',    // Mon
        type: 'gym',
        title: 'Gym',
        description: 'Full session before the trip.',
      },
      {
        id: 'w2-mon-run',
        date: '2026-04-27',    // Mon
        type: 'easy',
        title: '10km w/ steady middle',
        description: '2km warmup + 5km at steady 5:05–5:15/km + 3km cooldown. Last quality session before mountain trip.',
        targetKm: 10,
        targetPace: '5:05–5:15/km (middle 5km)',
        targetHR: '155–162bpm',
      },
      {
        id: 'w2-tue',
        date: '2026-04-28',    // Tue
        type: 'travel',
        title: '🏔️ Mountain trip — easy day',
        description: 'Travel to mountains. Easy hiking, no running needed.',
        isTravel: true,
      },
      {
        id: 'w2-wed',
        date: '2026-04-29',    // Wed
        type: 'travel',
        title: '🏔️ Hike',
        description: 'Active recovery. Focus on enjoying the mountains.',
        isTravel: true,
      },
      {
        id: 'w2-thu',
        date: '2026-04-30',    // Thu
        type: 'travel',
        title: '🏔️ Hike',
        description: 'Active recovery.',
        isTravel: true,
      },
      {
        id: 'w2-fri',
        date: '2026-05-01',    // Fri
        type: 'travel',
        title: '🏔️ Hike',
        description: 'Active recovery.',
        isTravel: true,
      },
      {
        id: 'w2-sat',
        date: '2026-05-02',    // Sat
        type: 'travel',
        title: '🏔️ Last mountain day',
        description: 'Optional easy 20–30 min jog if legs feel fresh.',
        isTravel: true,
      },
      {
        id: 'w2-sun',
        date: '2026-05-03',    // Sun
        type: 'easy',
        title: '12km easy shakeout',
        description: 'Back home. Easy 12km at 5:30–5:45/km to flush out the mountains and get legs turning over again.',
        targetKm: 12,
        targetPace: '5:30–5:45/km',
        targetHR: '140–155bpm',
      },
    ],
  },
  {
    weekNum: 3,
    label: 'Week 3',
    subtitle: 'Key Quality Week ✈️',
    dates: '4–10 May',
    startDate: '2026-05-04',
    endDate: '2026-05-10',
    workouts: [
      {
        id: 'w3-mon',
        date: '2026-05-04',    // Mon
        type: 'gym',
        title: 'Gym',
        description: 'Full session. Last heavy gym before Edinburgh.',
      },
      {
        id: 'w3-tue',
        date: '2026-05-05',    // Tue
        type: 'tempo',
        title: 'Tempo 10km',
        description: '2km warmup + 6km at 4:35–4:45/km + 2km cooldown. Most important session of the plan. Control your pace — do not go faster than 4:35/km.',
        targetKm: 10,
        targetPace: '4:35–4:45/km (tempo portion)',
        targetHR: '165–172bpm',
      },
      {
        id: 'w3-wed',
        date: '2026-05-06',    // Wed
        type: 'easy',
        title: '6km easy',
        description: 'Easy recovery run before Edinburgh trip. 5:40–6:00/km, HR under 155.',
        targetKm: 6,
        targetPace: '5:40–6:00/km',
        targetHR: '140–155bpm',
      },
      {
        id: 'w3-thu',
        date: '2026-05-07',    // Thu — Edinburgh begins
        type: 'travel',
        title: '✈️ Edinburgh begins',
        description: 'Travel day. Rest or 20 min easy jog if energy allows.',
        isTravel: true,
      },
      {
        id: 'w3-fri',
        date: '2026-05-08',    // Fri
        type: 'easy',
        title: '5km city run',
        description: 'Easy 5km around Edinburgh. Hilly city — keep effort genuinely easy regardless of pace.',
        targetKm: 5,
        targetPace: 'easy effort',
      },
      {
        id: 'w3-sat',
        date: '2026-05-09',    // Sat
        type: 'rest',
        title: 'Rest',
        description: 'Edinburgh — rest and enjoy the city.',
      },
      {
        id: 'w3-sun',
        date: '2026-05-10',    // Sun — Edinburgh ends
        type: 'rest',
        title: 'Travel back',
        description: 'Travel day — rest.',
      },
    ],
  },
  {
    weekNum: 4,
    label: 'Week 4',
    subtitle: 'Peak Week 🔥',
    dates: '11–17 May',
    startDate: '2026-05-11',
    endDate: '2026-05-17',
    workouts: [
      {
        id: 'w4-mon',
        date: '2026-05-11',    // Mon
        type: 'gym',
        title: 'Gym',
        description: 'Last proper gym session. Keep intensity moderate — big running week ahead.',
      },
      {
        id: 'w4-tue',
        date: '2026-05-12',    // Tue
        type: 'intervals',
        title: 'Race pace intervals',
        description: '2km warmup + 3×2km at 4:28–4:32/km (90 sec jog recovery) + 2km cooldown. This is race pace — controlled but hard. 12km total.',
        targetKm: 12,
        targetPace: '4:28–4:32/km (intervals)',
        targetHR: '168–175bpm',
      },
      {
        id: 'w4-wed',
        date: '2026-05-13',    // Wed
        type: 'easy',
        title: '7km easy',
        description: 'Easy flush-out at 5:40/km. HR under 155. Recovers you from yesterday\'s intervals.',
        targetKm: 7,
        targetPace: '5:40/km',
        targetHR: '140–155bpm',
      },
      {
        id: 'w4-thu',
        date: '2026-05-14',    // Thu
        type: 'rest',
        title: 'Rest',
        description: 'Rest day before Warsaw trip.',
      },
      {
        id: 'w4-fri',
        date: '2026-05-15',    // Fri — Warsaw begins
        type: 'travel',
        title: '🏙️ Warsaw',
        description: 'Rest or 20 min very easy jog. Warsaw trip.',
        isTravel: true,
      },
      {
        id: 'w4-sat',
        date: '2026-05-16',    // Sat
        type: 'travel',
        title: '🏙️ Warsaw',
        description: 'Warsaw — rest.',
        isTravel: true,
      },
      {
        id: 'w4-sun',
        date: '2026-05-17',    // Sun — Warsaw ends, long run
        type: 'long',
        title: '16km long run',
        description: 'Back home. 12km easy + final 4km at steady 5:00–5:10/km. Last long run before taper. Final 4km should feel comfortably hard, not all-out.',
        targetKm: 16,
        targetPace: '5:30/km easy, 5:00–5:10/km finish',
        targetHR: '140–162bpm',
      },
    ],
  },
  {
    weekNum: 5,
    label: 'Week 5',
    subtitle: 'Taper 🏁',
    dates: '18–23 May',
    startDate: '2026-05-18',
    endDate: '2026-05-23',
    workouts: [
      {
        id: 'w5-mon',
        date: '2026-05-18',    // Mon
        type: 'easy',
        title: '6km easy',
        description: 'Easy run to start taper week. Legs may feel heavy — that\'s normal and expected.',
        targetKm: 6,
        targetPace: '5:45/km',
      },
      {
        id: 'w5-tue',
        date: '2026-05-19',    // Tue
        type: 'intervals',
        title: '5km w/ race pace reps',
        description: '1km warmup + 3×1km at race pace 4:28–4:32/km (full recovery) + 1km cooldown. Short and sharp — reminding your legs what race pace feels like.',
        targetKm: 5,
        targetPace: '4:28–4:32/km (reps)',
      },
      {
        id: 'w5-wed',
        date: '2026-05-20',    // Wed
        type: 'easy',
        title: '4km very easy',
        description: 'Very easy 4km. Keep HR under 145. Just moving, nothing more.',
        targetKm: 4,
        targetPace: '6:00/km',
      },
      {
        id: 'w5-thu',
        date: '2026-05-21',    // Thu
        type: 'strides',
        title: '20 min easy + strides',
        description: '20 min easy jog + 4×100m strides. Keep everything controlled and relaxed.',
        targetKm: 4,
      },
      {
        id: 'w5-fri',
        date: '2026-05-22',    // Fri
        type: 'rest',
        title: 'Rest — race eve',
        description: 'Complete rest. Eat well, hydrate, lay out your kit, sleep early. No running.',
      },
      {
        id: 'w5-sat',
        date: '2026-05-23',    // Sat — RACE DAY
        type: 'race',
        title: '🏆 RACE DAY',
        description: 'Half marathon. Target: sub-1:35:00. Strategy: km 1–3 at 4:35/km (hold back from the crowd), km 4–15 at 4:28–4:32/km (cruise), km 16+ everything you have.',
        targetKm: 21.1,
        targetPace: '4:28–4:32/km',
      },
    ],
  },
]

export function getCurrentWeek(): Week {
  const today = new Date().toISOString().split('T')[0]
  return (
    PLAN.find((w) => today >= w.startDate && today <= w.endDate) || PLAN[0]
  )
}

export function getWorkoutsForWeek(week: Week): Workout[] {
  return week.workouts
}

export function getWorkoutById(id: string): Workout | undefined {
  for (const week of PLAN) {
    const w = week.workouts.find((w) => w.id === id)
    if (w) return w
  }
}

export const WORKOUT_COLORS: Record<WorkoutType, string> = {
  gym: '#7c6fff',
  easy: '#22c55e',
  tempo: '#f59e0b',
  intervals: '#FC4C02',
  long: '#3b82f6',
  race: '#FC4C02',
  rest: '#444',
  travel: '#666',
  strides: '#10b981',
}

export const WORKOUT_LABELS: Record<WorkoutType, string> = {
  gym: 'Gym',
  easy: 'Easy run',
  tempo: 'Tempo',
  intervals: 'Intervals',
  long: 'Long run',
  race: 'Race',
  rest: 'Rest',
  travel: 'Travel',
  strides: 'Strides',
}
