# Current Tasks

## Build order (one feature per Claude Code session — see /specs)
Work top to bottom. Each spec is self-contained. Plan-then-implement per WORKFLOW.md.

## Up Next
- [ ] **Spec 03 — Plan generator**: 3-4 day weeks + layered gym, Daniels paces
- [ ] **Spec 04 — Persistence**: DB schema (Turso/Postgres + Drizzle), update README off "no DB"
- [ ] **Spec 05 — Matcher**: planned-vs-actual reconciliation + pattern detection
- [ ] **Spec 06 — Coach prompt**: state-block assembly, harsh-but-fair logic, streaming
- [ ] **Spec 07 — Garmin recovery**: GarminDB cron off-Vercel -> /api/recovery/ingest -> readiness
- [ ] **Spec 08 — Calendar**: fix date bug (date-fns 14-day block) + availability + opt-in GCal

## In Progress
<!-- move the active spec here -->

## Done
- [x] Initial app (Strava OAuth, Claude streaming chat, activity sidebar, Vercel)
- [x] Architecture planning (v2) — see PLANNING.md
- [x] VDOT engine starter + validation (VDOT 45 confirmed from 1:40:04 half)
- [x] **Spec 01 — VDOT engine**: calibrated pace anchors to Daniels 3rd-ed tables (ANCHORS + EASY_BAND); added `HEAT_NEUTRAL_C` / `HEAT_PENALTY_PER_5C` export constants; 8 guard tests green (`npm test`)
- [x] **Spec 02 — Goal feasibility**: `lib/goalFeasibility.ts` — dynamic baseRate(vdot), frequency/volume multipliers, gap→verdict bands, `isUnlocked` data-gate (VDOT≥50 + 18km long run), `assessAllGoals`; 11 tests green; build clean

---
## Notes for Claude Code
Read CLAUDE.md, PLANNING.md, and the relevant spec in /specs before starting each item.
Athlete starts at VDOT ~45. Goals: sub-40 10k (primary), sub-1:35 half (stretch),
sub-1:30 half (data-gated). Coach = harsh on execution, deferential to recovery.
