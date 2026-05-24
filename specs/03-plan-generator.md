# Spec 03 — Plan Generator

## Goal
Generate a week (and rolling 4-week block) of scheduled sessions using Daniels paces,
tuned for 3-4 running days + layered gym, respecting the current phase and the
athlete's available days.

## Inputs
- VDOT snapshot (paces) from `lib/vdot.ts`
- phase: "BASE" | "EARLY_QUALITY" | "VO2MAX" | "SPECIFIC" | "TAPER"
- runningDaysPerWeek: 3 | 4
- gymDaysPerWeek: 0 | 1 | 2
- availableWeekdays: which days the athlete can train (from calendar/prefs)
- currentWeeklyKm + a safe progression rule (no more than ~10%/week increase)

## Weekly skeletons
**4 running days:** longRun, quality (T or I by phase), easy, flex
**3 running days:** longRun, quality, easy
- Long run grows through BASE/EARLY_QUALITY; caps then trims in TAPER.
- Quality type by phase:
  - BASE: strides + short hill reps (R-ish, neuromuscular)
  - EARLY_QUALITY: Repetition sessions + intro Intervals
  - VO2MAX: Interval sessions (e.g. 5-6 x 1000m @ I pace, jog recovery)
  - SPECIFIC: Threshold (e.g. 2-3 x 10-15min @ T) + race-pace segments in long run
  - TAPER: reduced volume, keep some sharpness at T/I
- Daniels volume distribution: ~70-80% Easy, 10-15% M+T, 10-15% I+R. Enforce it as a
  validator — if a generated week violates it, rebalance.

## Gym placement rules
- Never the day before a quality or long-run day.
- Prefer easy-run days or rest days.
- Tag gym sessions as `type: "GYM"`, full-body, ~45-60 min, NOT counted toward running km.

## Session shape
```ts
interface PlannedSession {
  id: string;
  date: string;            // ISO, pre-computed server-side (never let the LLM derive)
  weekday: string;         // also pre-computed
  type: "EASY" | "LONG" | "THRESHOLD" | "INTERVAL" | "REPETITION" | "MARATHON" | "GYM" | "REST";
  title: string;           // "5 x 1000m @ 4:10/km, 2:30 jog recovery"
  targetDistanceKm?: number;
  targetPaceSecPerKm?: number;     // from trainingPaces()
  targetPaceLabel?: string;        // "4:10/km"
  structure?: WorkoutRep[];        // for interval/rep sessions
  notes?: string;
}
```

## Progression
- Generate a rolling 4-week block; week 4 is a down/recovery week (~20-30% less volume).
- Re-generate when: VDOT changes (re-test), phase changes, or the athlete edits
  availability/preferences.

## Acceptance
- Produces a valid week for 3 OR 4 running days without violating Daniels distribution.
- All dates/weekdays pre-computed server-side with date-fns; no LLM date math.
- Paces pulled directly from `trainingPaces(vdot)`; no hardcoded paces.
