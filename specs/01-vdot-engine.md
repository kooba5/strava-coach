# Spec 01 — VDOT Engine

**Status:** Starter code already written in `lib/vdot.ts`. This spec covers finishing it.

## Goal
A deterministic, dependency-free module that computes VDOT, training paces, race
predictions, and heat-adjusted equivalent times. The single source of pace truth.

## What exists
`lib/vdot.ts` implements: `vdotFromPerformance`, `predictTime`, `trainingPaces`,
`heatAdjustTime`, `snapshotFromPerformance`, plus `fmtPace`/`fmtTime` and `DISTANCES`.

## Validated against athlete data
- 1:40:04 half -> VDOT 45.1, predicts 1:39:57 half (matches actual: math is sound)
- sub-40 10k requires VDOT ~52 | sub-1:30 half ~51 | sub-1:35 half ~48
- 1:46 half @ 28C -> heat-adjusted to ~1:42 (VDOT 44.1)

## Tasks for Claude Code
1. Add a Vitest/Jest test file `lib/vdot.test.ts` that asserts:
   - `vdotFromPerformance(21097.5, 6004)` is within 0.2 of 45.1
   - `predictTime(10000, 52)` is under 40:00 (2400s)
   - `trainingPaces(45).easyLow > trainingPaces(45).easyHigh` (slower number is bigger)
   - `heatAdjustTime(t, 15) === t` (no adjustment at/below neutral)
   - `heatAdjustTime(t, 28) < t` (hot weather reduces the fair-equivalent time)
2. Add an optional calibration constant so the heat model can be tuned from the
   athlete's own hot-vs-cool paired efforts later (export `HEAT_NEUTRAL_C` and
   `HEAT_PENALTY_PER_5C`).
3. Cross-check `trainingPaces` output against published Daniels tables for VDOT
   40/45/50 and document any deltas in a comment. Tolerances of a few sec/km are fine.
4. Do NOT add external deps. Keep it pure functions.

## Acceptance
- `npm run build` passes, tests green.
- Given any (distance, time, temp?) the module returns a full `VdotSnapshot`.
