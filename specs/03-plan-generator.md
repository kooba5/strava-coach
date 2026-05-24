# Spec 03 — Plan Generator (goal-aware)

## Goal
Generate a week (and rolling 4-week block) of scheduled sessions using calibrated
Daniels paces from `lib/vdot.ts`, tuned for 3-4 running days + a layered gym track,
respecting the current phase, the athlete's available days, AND the PRIMARY goal's
distance (which shapes only the peak phases — see below).

## CRITICAL PRINCIPLE — base is goal-agnostic, only the peak specializes
The athlete chose **sub-40 10k as PRIMARY** (a ~7-point VDOT reach; feasibility =
UNREALISTIC today, by design — see lib/goalFeasibility.ts). The binding constraint is
LOW VDOT (45, needs ~52), NOT 10k-specific sharpness. You DO NOT close a 7-point VDOT
gap with intervals — you close it with threshold work + easy volume that RAISE VDOT.

Therefore: **Phases I and II are identical regardless of primary goal.** Only Phases
III and IV branch on the primary goal's distance. A generator that front-loads 10k
intervals from week one is WRONG and will stall the athlete at VDOT 45. Encode this.

## Inputs
- VDOT snapshot (paces) from `lib/vdot.ts` (calibrated; do not hardcode paces)
- primaryGoal: from goalFeasibility SEED_GOALS where treatment === "primary"
  (currently Sub-40 10k, distanceMeters 10000)
- phase: "BASE" | "EARLY_QUALITY" | "VO2MAX" | "SPECIFIC" | "TAPER"
- runningDaysPerWeek: 3 | 4
- gymDaysPerWeek: 0 | 1 | 2
- availableWeekdays + blackout dates (from prefs/calendar)
- currentWeeklyKm + safe progression rule (<= ~10%/week increase)

## Phase-by-phase plan (PRIMARY = Sub-40 10k)
All paces come from trainingPaces(vdot) and TIGHTEN automatically as VDOT re-seeds.
Example paces shown at VDOT 45 -> 49 to illustrate the intended progression.

### Phase I — BASE (now -> ~Jul)  [goal-agnostic]
- Pure VDOT foundation. Easy volume, build frequency + weekly km toward top of range.
- Strides 2x/week (6-8 x 20s) for neuromuscular touch — NOT a quality session.
- No 10k-specificity yet; it would be premature.
- Quality slots: at most light hill strides. Long run grows gradually.

### Phase II — EARLY_QUALITY (Jul -> Aug)  [goal-agnostic]
- THRESHOLD is the workhorse — most VDOT-productive session, serves every goal.
  e.g. 2-3 x 10min @ T (4:49/km @45 -> 4:39 @47 -> 4:30 @49), short jog recovery.
- Introduce Repetition (R: 4:09/km @45) for economy — leans 10k-ward (turnover).
- One quality session/week (3-4 day athlete), alternating T and R weeks.
- Long run continues growing.

### Phase III — VO2MAX (Aug -> Sep)  [BRANCHES on primary goal]
- For 10k primary: INTERVAL sessions move to center (I: 4:27/km @45 -> 4:09 @49).
  e.g. 5-6 x 1000m @ I, jog recovery. VO2max is more 10k-relevant than half-relevant.
- **TUNE-UP RACE goes here** (see session type below). Race a 10k or 5k. Triple duty:
  real VDOT re-test (re-seeds all paces), hard VO2max stimulus, motivation hit.
  After the race, the app re-runs goalFeasibility — sub-40 should brighten if VDOT rose.
- Keep one T session/week alongside intervals to hold the aerobic gains.

### Phase IV — SPECIFIC (Sep -> race)  [BRANCHES on primary goal]
- For 10k primary: blend I-pace intervals with RACE-PACE segments (4:00/km) so
  40-min effort feels rehearsed. e.g. 5 x 1000m @ goal 10k pace.
- Long run TRIMS for a 10k (cap ~14-16km) — frees recovery for sharper quality.
- Short taper into the goal race.

### TAPER
- Reduced volume (~40-50% down over final 7-10 days), keep brief T/I sharpness.

## Goal-aware branch (encode as data, not prose)
```ts
// Only Phase III/IV read this. Phases I/II ignore primaryGoal.
const peakProfile = {
  "10000":   { phase3: "INTERVAL_FOCUS", phase4: "INTERVAL_PLUS_RACEPACE", longRunCapKm: 16 },
  "21097.5": { phase3: "THRESHOLD_INTERVAL_MIX", phase4: "THRESHOLD_PLUS_RACEPACE", longRunCapKm: 22 },
};
```
NOTE: if the athlete later flips primary to the half, the half profile lifts the
long-run cap to ~22km — which also satisfies the sub-1:30 gate (longestRecentRunKm>=18).
With 10k primary, the long run caps at 16km, so the half-unlock endurance gate may stay
shut even if VDOT clears 50. This is the accepted, stated trade of choosing 10k primary.

## Weekly skeletons
**4 running days:** longRun | quality (type by phase) | easy | flex (easy OR 2nd quality late in build)
**3 running days:** longRun | quality | easy
- Daniels distribution VALIDATOR: ~70-80% Easy, 10-15% M+T, 10-15% I+R by weekly volume.
  If a generated week violates it, rebalance before returning.

## Gym placement rules
- Never the day before a quality or long-run day.
- Prefer easy-run days or rest days. 2x/week full-body, ~45-60min.
- type: "GYM", NOT counted toward running km. Supports running; does not replace volume.

## Session shape
```ts
interface PlannedSession {
  id: string;
  date: string;            // ISO, pre-computed server-side (NEVER let the LLM derive)
  weekday: string;         // also pre-computed
  type: "EASY" | "LONG" | "THRESHOLD" | "INTERVAL" | "REPETITION" | "MARATHON"
      | "RACE" | "GYM" | "REST";
  title: string;           // "5 x 1000m @ 4:27/km, 2:30 jog recovery"
  targetDistanceKm?: number;
  targetPaceSecPerKm?: number;     // from trainingPaces()
  targetPaceLabel?: string;        // "4:27/km"
  structure?: WorkoutRep[];        // for interval/rep sessions
  isTuneUpRace?: boolean;          // RACE type; triggers VDOT re-test prompt on completion
  notes?: string;
}
```

## TUNE-UP RACE as a first-class session
- type: "RACE", isTuneUpRace: true. Scheduled in Phase III.
- On completion (matched via spec 05), the app:
  1. Recomputes VDOT from the race result (heat-adjusted) via lib/vdot.ts.
  2. Re-seeds all training paces (the whole plan tightens).
  3. Re-runs goalFeasibility so verdicts update — the athlete SEES progress.
- This closes the adaptive loop: race -> measure -> re-plan.

## Progression
- Rolling 4-week block; week 4 = down/recovery week (~20-30% less volume).
- Re-generate when: VDOT changes (re-test/race), phase changes, or prefs/availability edit.

## Acceptance
- Phases I/II output is IDENTICAL whether primary is 10k or half (assert in tests).
- Phases III/IV differ by primary goal per peakProfile; long-run cap respected.
- Valid week for 3 OR 4 running days without violating the Daniels distribution validator.
- All dates/weekdays pre-computed with date-fns; no LLM date math.
- Paces pulled from trainingPaces(vdot); zero hardcoded paces.
- Tune-up RACE session generated in Phase III and flagged isTuneUpRace.

## Known dependency note
- fmtPace edge case: 4:00/km currently renders "3:60" (Math.round(60) carry). Fix in
  lib/vdot.ts before titles quote race pace. Small, but it WILL appear in session titles.
