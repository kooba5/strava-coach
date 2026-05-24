# Spec 02 — Goal Feasibility Module

## Goal
An honest, continuously-updated verdict on each goal. This is what makes the coach
credible instead of a cheerleader. It must downgrade or upgrade goals based on the
athlete's *current* VDOT and the time remaining.

## Inputs
- current VDOT (from `lib/vdot.ts`, seeded from best recent effort)
- list of goals: `{ label, distanceMeters, targetTimeSeconds, targetDate }`
- training context: running days/week, current weekly km, weeks until target date

## Logic
For each goal:
1. Compute `requiredVdot = vdotFromPerformance(distanceMeters, targetTimeSeconds)`.
2. `gap = requiredVdot - currentVdot`.
3. Estimate achievable VDOT gain over the runway:
   - Baseline: ~0.5–0.8 VDOT points/month for a consistent runner, MORE early in a
     block and LESS as you approach the athlete's ceiling.
   - Scale DOWN for low frequency (3-4 days caps realistic gain) and low volume.
4. Verdict bands (tune these):
   - `gap <= projectedGain * 0.7`  -> "ON TRACK"
   - `gap <= projectedGain * 1.0`  -> "STRETCH"
   - `gap <= projectedGain * 1.3`  -> "UNLIKELY — data-gated"
   - else                           -> "UNREALISTIC THIS BLOCK"

## Seed config for this athlete (from PLANNING.md)
```ts
const goals = [
  { label: "Sub-40 10k",   distanceMeters: 10000,   targetTimeSeconds: 2399,  // 39:59
    targetDate: "2026-10-15", treatment: "primary" },
  { label: "Sub-1:35 half", distanceMeters: 21097.5, targetTimeSeconds: 5699,  // 1:34:59
    targetDate: "2026-10-15", treatment: "stretch" },
  { label: "Sub-1:30 half", distanceMeters: 21097.5, targetTimeSeconds: 5399,  // 1:29:59
    targetDate: "2026-11-15", treatment: "gated" },
];
```
NOTE: sub-40 10k needs VDOT ~52 and sub-1:30 half ~51 — both ~6-7 points above the
athlete's current 45. They are similar difficulty; do not present the 10k as easy.

## Data gate for the sub-1:30 unlock
The "gated" goal stays locked until BOTH:
- current VDOT >= 50, AND
- a long-run endurance check passes (e.g. completed a 18+ km long run at easy pace
  without HR drift > X, or a recent half/long effort confirms aerobic durability).
Expose `isUnlocked(goal, athleteState): boolean`.

## Output
```ts
interface FeasibilityVerdict {
  goal: Goal;
  requiredVdot: number;
  currentVdot: number;
  gap: number;
  verdict: "ON_TRACK" | "STRETCH" | "UNLIKELY" | "UNREALISTIC";
  unlocked: boolean;       // for gated goals
  rationale: string;       // human-readable, fed into the coach prompt
}
```

## Acceptance
- Re-runs cheaply on every session so verdicts track fitness.
- Output feeds directly into the coach system prompt so the coach speaks from it.
- Never returns "ON_TRACK" for a goal whose gap exceeds projected gain.
