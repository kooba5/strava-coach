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
    dates: '20–27 Apr',
    startDate: '2026-04-20',
    endDate: '2026-04-27',
    workouts: [
      {
        id: 'w1-mon',
        date: '2026-04-20',
        type: 'gym',
        title: 'Gym (light)',
        description: 'Single-leg RDL, Bulgarian split squats, hip thrusts, calf raises, dead bugs. Keep it light — legs still cooked from the race.',
      },
      {
        id: 'w1-tue',
        date: '2026-04-21',
        type: 'easy',
        title: '6km easy + cadence drill',
        description: 'Very easy effort at 5:50–6:10/km. Focus: consciously shorten stride, target 170spm. Use a metronome app if needed.',
        targetKm: 6,
        targetPace: '5:50–6:10/km',
        targetHR: '140–150bpm',
      },
      {
        id: 'w1-wed',
        date: '2026-04-22',
        type: 'easy',
        title: '8km easy',
        description: 'Easy aerobic run at 5:40–6:00/km. HR must stay under 155. If it creeps up, slow down.',
        targetKm: 8,
        targetPace: '5:40–6:00/km',
        targetHR: '140–155bpm',
      },
      {
        id: 'w1-thu',
        date: '2026-04-23',
        type: 'gym',
        title: 'Gym',
        description: 'Full session: single-leg RDL 3×10, Bulgarian split squats 3×8 each, hip thrusts 3×12, calf raises 3×15, dead bugs 3×10.',
      },
      {
        id: 'w1-fri',
        date: '2026-04-24',
        type: 'strides',
        title: '6km easy + strides',
        description: '6km easy then 4×100m strides at 4:00–4:15/km pace. Walk back to recover fully between each. These train fast-twitch without fatigue.',
        targetKm: 6,
        targetPace: '5:40–6:00/km easy',
        targetHR: '140–150bpm',
      },
      {
        id: 'w1-sat',
        date: '2026-04-25',
        type: 'easy',
        title: '6km easy (evening)',
        description: 'Saturday evening easy run. Keep it genuinely easy — tomorrow is the long run. 5:45–6:00/km, HR under 150.',
        targetKm: 6,
        targetPace: '5:45–6:00/km',
        targetHR: '140–150bpm',
      },
      {
        id: 'w1-sun',
        date: '2026-04-26',
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
    dates: '28 Apr–4 May',
    startDate: '2026-04-28',
    endDate: '2026-05-04',
    workouts: [
      {
        id: 'w2-mon',
        date: '2026-04-28',
        type: 'gym',
        title: 'Gym',
        description: 'Full session before the trip.',
      },
      {
        id: 'w2-mon-run',
        date: '2026-04-28',
        type: 'easy',
        title: '10km w/ steady middle',
        description: '2km warmup + 5km at steady 5:05–5:15/km + 3km cooldown. Last quality session before mountain trip.',
        targetKm: 10,
        targetPace: '5:05–5:15/km (middle 5km)',
        targetHR: '155–162bpm',
      },
      {
        id: 'w2-tue',
        date: '2026-04-29',
        type: 'travel',
        title: '🏔️ Mountain trip begins',
        description: 'Hiking counts as active recovery. No running needed. Enjoy it.',
        isTravel: true,
      },
      {
        id: 'w2-wed',
        date: '2026-04-30',
        type: 'travel',
        title: '🏔️ Hike',
        description: 'Active recovery. Focus on enjoying the mountains.',
        isTravel: true,
      },
      {
        id: 'w2-thu',
        date: '2026-05-01',
        type: 'travel',
        title: '🏔️ Hike',
        description: 'Active recovery.',
        isTravel: true,
      },
      {
        id: 'w2-fri',
        date: '2026-05-02',
        type: 'travel',
        title: '🏔️ Hike',
        description: 'Active recovery.',
        isTravel: true,
      },
      {
        id: 'w2-sat',
        date: '2026-05-03',
        type: 'travel',
        title: '🏔️ Last mountain day',
        description: 'Optional easy 20–30 min jog if legs feel fresh.',
        isTravel: true,
      },
      {
        id: 'w2-sun',
        date: '2026-05-04',
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
    dates: '5–11 May',
    startDate: '2026-05-05',
    endDate: '2026-05-11',
    workouts: [
      {
        id: 'w3-mon',
        date: '2026-05-05',
        type: 'gym',
        title: 'Gym',
        description: 'Full session. Last heavy gym before Edinburgh.',
      },
      {
        id: 'w3-tue',
        date: '2026-05-06',
        type: 'tempo',
        title: 'Tempo 10km',
        description: '2km warmup + 6km at 4:35–4:45/km + 2km cooldown. This is the most important session of the plan. Control your pace — do not go faster than 4:35/km.',
        targetKm: 10,
        targetPace: '4:35–4:45/km (tempo portion)',
        targetHR: '165–172bpm',
      },
      {
        id: 'w3-wed',
        date: '2026-05-07',
        type: 'travel',
        title: '✈️ Edinburgh begins',
        description: '6km easy run if possible, otherwise rest. Keep legs moving but nothing hard.',
        isTravel: true,
      },
      {
        id: 'w3-thu',
        date: '2026-05-08',
        type: 'easy',
        title: '5km city run',
        description: 'Easy 5km around Edinburgh. Hilly city — keep effort genuinely easy regardless of pace.',
        targetKm: 5,
        targetPace: 'easy effort',
      },
      {
        id: 'w3-fri',
        date: '2026-05-09',
        type: 'rest',
        title: 'Rest',
        description: 'Edinburgh — rest and enjoy the city.',
      },
      {
        id: 'w3-sat',
        date: '2026-05-10',
        type: 'rest',
        title: 'Rest',
        description: 'Edinburgh — rest.',
      },
      {
        id: 'w3-sun',
        date: '2026-05-11',
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
    dates: '12–18 May',
    startDate: '2026-05-12',
    endDate: '2026-05-18',
    workouts: [
      {
        id: 'w4-mon',
        date: '2026-05-12',
        type: 'gym',
        title: 'Gym',
        description: 'Last proper gym session. Keep intensity moderate — big running week ahead.',
      },
      {
        id: 'w4-tue',
        date: '2026-05-13',
        type: 'intervals',
        title: 'Race pace intervals',
        description: '2km warmup + 3×2km at 4:28–4:32/km (90 sec jog recovery) + 2km cooldown. This is race pace — it should feel controlled but hard. 12km total.',
        targetKm: 12,
        targetPace: '4:28–4:32/km (intervals)',
        targetHR: '168–175bpm',
      },
      {
        id: 'w4-wed',
        date: '2026-05-14',
        type: 'easy',
        title: '7km easy',
        description: 'Easy flush-out at 5:40/km. HR under 155. This recovers you from yesterday\'s intervals.',
        targetKm: 7,
        targetPace: '5:40/km',
        targetHR: '140–155bpm',
      },
      {
        id: 'w4-thu',
        date: '2026-05-15',
        type: 'travel',
        title: '🏙️ Warsaw',
        description: 'Rest or 20 min very easy jog. Warsaw trip.',
        isTravel: true,
      },
      {
        id: 'w4-fri',
        date: '2026-05-16',
        type: 'rest',
        title: 'Rest',
        description: 'Warsaw — rest.',
      },
      {
        id: 'w4-sat',
        date: '2026-05-17',
        type: 'easy',
        title: '5km shakeout',
        description: 'Back home. Easy 5km to reactivate legs after Warsaw.',
        targetKm: 5,
        targetPace: '5:45/km',
      },
      {
        id: 'w4-sun',
        date: '2026-05-18',
        type: 'long',
        title: '16km long run',
        description: '12km easy + final 4km at steady 5:00–5:10/km. Last long run before taper. The final 4km should feel comfortably hard, not all-out.',
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
    dates: '19–23 May',
    startDate: '2026-05-19',
    endDate: '2026-05-23',
    workouts: [
      {
        id: 'w5-mon',
        date: '2026-05-19',
        type: 'easy',
        title: '6km easy',
        description: 'Easy run to start taper week. Legs should feel heavy — that\'s normal.',
        targetKm: 6,
        targetPace: '5:45/km',
      },
      {
        id: 'w5-tue',
        date: '2026-05-20',
        type: 'intervals',
        title: '5km w/ race pace reps',
        description: '1km warmup + 3×1km at race pace 4:28–4:32/km (full recovery) + 1km cooldown. Short and sharp — just reminding your legs what race pace feels like.',
        targetKm: 5,
        targetPace: '4:28–4:32/km (reps)',
      },
      {
        id: 'w5-wed',
        date: '2026-05-21',
        type: 'easy',
        title: '4km very easy',
        description: 'Very easy 4km. Keep HR under 145. Just moving, nothing more.',
        targetKm: 4,
        targetPace: '6:00/km',
      },
      {
        id: 'w5-thu',
        date: '2026-05-22',
        type: 'strides',
        title: '20 min easy + strides',
        description: '20 min easy jog + 4×100m strides. Last session before race. Keep everything controlled.',
        targetKm: 4,
      },
      {
        id: 'w5-fri',
        date: '2026-05-23',
        type: 'race',
        title: '🏆 RACE DAY',
        description: 'Half marathon. Target: sub-1:35:00. Strategy: km 1–3 at 4:35/km, km 4–15 at 4:28–4:32/km, km 16+ everything you have.',
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
