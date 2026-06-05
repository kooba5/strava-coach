# Current Tasks

## Build order (one feature per Claude Code session — see /specs)
Work top to bottom. Each spec is self-contained. Plan-then-implement per WORKFLOW.md.

## Up Next
- [ ] **Spec 06 — Coach prompt**: state-block assembly, harsh-but-fair logic, streaming
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
- [x] **Spec 05 — Matcher**: `lib/matcher.ts` — reconcileWeek(), heat-adjusted pace classification, COMPLETED/MODIFIED/SKIPPED/PENDING, intensity creep detection, pattern detection (qualitySkipStreak, intensityCreepFlag, skipsOnGreen/RedDays); 21 tests green (both acceptance tests + coverage); build clean
- [x] **Spec 04 — Persistence**: Turso/libSQL + Drizzle ORM; `lib/schema.ts` (4 tables: athlete, plannedSession, sessionResult, recoveryDay), `lib/db.ts`, `lib/queries.ts` (6 typed helpers), `lib/migrate.ts`, `scripts/seed.ts`; initial migration generated; seed runs clean; README updated; build clean
- [x] **Spec 03 — Plan generator**: `lib/planGenerator.ts` — volume-driven quality sizing (T floor=20min, I=8%, R=5%), validator trims on absolute ceiling only / ADD_EASY_VOLUME advisory for low volume, Phases I/II goal-agnostic, gym placement rules enforced, `generate4WeekBlock`; 26 tests green (3 required regressions + 23 structural); build clean

---
## Notes for Claude Code
Read CLAUDE.md, PLANNING.md, and the relevant spec in /specs before starting each item.
Athlete starts at VDOT ~45. Goals: sub-40 10k (primary), sub-1:35 half (stretch),
sub-1:30 half (data-gated). Coach = harsh on execution, deferential to recovery.
