# Spec 08 — Calendar & Scheduling

## Goal
Two things: (1) permanently fix the "app gets dates wrong" bug, and (2) fit sessions
around the athlete's real availability and optionally write workouts back to a calendar.

## Part A — Fix the date bug (do this regardless of calendar sync)
Root cause: LLMs guess day-of-week and drift on dates. Fix:
- Server-side, with **date-fns** (or `Temporal`), pre-compute the next 14 days as an
  explicit list: `[{ iso, weekday, isToday }]`.
- Inject that block into the coach prompt (spec 06). The model only ever *references*
  these, never derives a date itself.
- All `plannedSession.date` / `.weekday` are computed server-side at generation time.
This alone eliminates the calendar mistakes.

## Part B — Availability-aware scheduling
- Store `availableWeekdays` + any blackout dates in athlete prefs.
- Plan generator (spec 03) only places sessions on available days.
- When the athlete says "I'm traveling Thursday," update prefs/blackouts and regenerate
  the affected week, protecting the long run + key quality session.

## Part C — Optional Google Calendar sync
The dev environment already has Google Calendar connected, so the athlete uses it.
- Read: pull busy blocks to auto-detect realistic training windows.
- Write: push planned sessions as calendar events (title = session title, e.g.
  "5x1000m @ 4:10/km"), with the workout detail in the description.
- Make this OPT-IN and degrade gracefully if not connected.
- Use OAuth via the existing Google integration pattern; never hardcode tokens.

## Tasks for Claude Code
1. `lib/calendar.ts` with `next14Days()` (pure, server-side, date-fns).
2. Inject the 14-day block into the chat route's state assembly.
3. Availability model in prefs + plan-generator integration.
4. (Opt-in) Google Calendar read/write behind a feature flag.

## Acceptance
- Coach never miscomputes a weekday or date.
- "I can't run Thursday this week" regenerates the week correctly, keeping long run + quality.
- Calendar write is opt-in and failure-tolerant.
```
