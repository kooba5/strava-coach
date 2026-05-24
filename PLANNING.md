# Strava Coach — Planning & Roadmap (v2)

## What this app is becoming
Not "chat about my Strava data" but a **stateful, adaptive running coach** built on Dr. Jack Daniels'
VDOT methodology. It generates a real training plan, persists it, reconciles planned-vs-actual from
Strava (and recovery data from Garmin), adapts to the athlete's schedule and recovery, and holds the
athlete accountable — harsh about execution, deferential to genuine recovery/injury signals.

---

## Athlete profile (seed values — update as fitness changes)
- **Current fitness:** Half marathon 1:40:04 (5 weeks ago, fair conditions) -> **VDOT ~= 45**
  - Secondary data point: 1:46 half yesterday — heat-degraded, NOT used for VDOT (see heat adjustment)
- **Frequency:** 3-4 running days/week + 2 optional full-body gym sessions (layered, not counted as runs)
- **Current volume:** 25-40 km/week
- **Equivalent performances at VDOT 45:** ~42:40 10k, ~1:40 half

## Goals — honest feasibility framing (THIS IS LOAD-BEARING)
The app must NOT cheerlead unrealistic targets. The framing:

| Goal | Required VDOT | Verdict from VDOT 45 on 3-4 days | App treatment |
|---|---|---|---|
| Sub-40 10k | ~49-50 | Stretch but achievable | **PRIMARY GOAL** |
| Sub-1:35 half | ~48-49 | Realistic stretch | **Stretch goal / stepping stone** |
| Sub-1:30 half | ~51-52 | Unlikely this block on this frequency | **Data-gated unlock** — only greenlit if VDOT tracks past ~50 AND long-run endurance holds |

A focused multi-month block typically yields +3 to +5 VDOT points. The goals above need +4 to +7,
with the half being the harder target. Sequencing: build the 10k speed and aerobic base; let the half
target be *earned* by the data, not promised up front.

## Timeline
~5-6 months runway to an Oct/Nov goal race. Daniels periodization:
- **Phase I — Base** (now -> ~Jul): easy mileage, build volume + frequency, strides
- **Phase II — Early Quality** (Jul -> Aug): Repetition + intro Intervals (economy, VO2max)
- **Phase III — VO2max** (Aug -> Sep): Interval-heavy; slot a tune-up 10k race here = real VDOT re-test
- **Phase IV — Specific** (Sep -> race): Threshold-dominant + race-pace work, then taper

---

## Daniels training paces at VDOT 45 (starting paces — tighten as VDOT climbs)
| Zone | Pace (min/km) | Purpose | % weekly volume (Daniels) |
|---|---|---|---|
| Easy (E) | 5:35-6:00 | Aerobic base, recovery | 70-80% |
| Marathon (M) | ~5:05 | Race-specific endurance | part of the 10-15% |
| Threshold (T) | ~4:45 | Lactate clearance — KEY for both goals | 10-15% (M+T) |
| Interval (I) | ~4:20 | VO2max | 10-15% (I+R) |
| Repetition (R) | ~4:05 | Speed, economy | part of the 10-15% |

Note: sub-40 10k goal pace is **4:00/km** — currently faster than interval pace. This is why it's a
stretch and why the plan must systematically lower these paces over the summer.

---

## Weekly skeleton for 3-4 running days
With limited frequency, every run earns its place; no junk-mileage buffer for sloppy pacing.

**4-day week:** 1 long run | 1 quality (T or I by phase) | 1 easy/recovery | 1 flex (easy volume OR 2nd quality late in build)
**3-day week:** drop the flex run; long run does double duty
**Gym:** 2x full-body, placed on easy or rest days, NEVER the day before a quality session.
Gym supports running (durability, economy, injury resistance) but does NOT replace running volume.

---

## Architecture decisions log (v2)

| Decision | Why |
|---|---|
| Add a database (was "no DB") | A dynamic, memory-bearing coach needs to persist the plan + session history. Leaning Vercel Postgres or Turso/libSQL (SQLite). |
| Deterministic VDOT/pace engine (`lib/vdot.ts`) | LLMs do pace math unreliably. Compute paces in code; Claude only interprets. |
| Heat-adjust efforts before they touch VDOT | Yesterday's 1:46 was heat-degraded. ~1-2% slowdown per few degrees over ~15C. Prevents false "you got slower" reads. |
| Pre-computed calendar block injected each prompt | LLMs guess day-of-week. Generate next 14 days server-side; Claude only references, never derives, dates. |
| Strava = primary activity feed; Garmin = recovery layer | Garmin sleep/HRV can't come through Strava. GarminDB (SQLite, CLI) runs on a scheduler off-Vercel, syncs recovery rows up. |
| Coach is rule-backed harsh, recovery-deferential | Harshness lands when it's *correct*. Skips with green recovery + no reason -> sharp. Tanked HRV/sleep -> forced rest, not slugging. |

---

## Feature build sequence (hand to Claude Code one at a time)
1. **VDOT engine** — `lib/vdot.ts` + heat-adjustment helper (spec: `specs/01-vdot-engine.md`)
2. **Goal-feasibility module** — honest verdicts, continuously re-rated (spec: `specs/02-goal-feasibility.md`)
3. **Plan generator** — 3-4 day weeks + layered gym, real Daniels paces (spec: `specs/03-plan-generator.md`)
4. **Persistence** — DB schema for plan + sessions + recovery (spec: `specs/04-persistence.md`)
5. **Planned-vs-actual matcher** — reconcile Strava activities to scheduled sessions (spec: `specs/05-matcher.md`)
6. **Adaptive coach prompt** — ties it together; harsh-but-fair logic (spec: `specs/06-coach-prompt.md`)
7. **Garmin recovery layer** — GarminDB -> sync -> readiness-gated adjustments (spec: `specs/07-garmin.md`)
8. **Calendar/scheduling** — fit sessions around real availability (spec: `specs/08-calendar.md`)

---

## Guardrails (non-negotiable)
- Harsh-coach framing NEVER overrides injury/overtraining signals. Pain mentioned -> coach pivots to rest.
- Declining pace at same HR, tanked HRV, wrecked sleep -> force easy/rest. Daniels' system exists to
  drive progress WITHOUT overtraining.
- Heat/altitude/illness context must be applied before judging a "bad" session.
- The app states uncertainty honestly. It does not promise PRs.
