# Implementation Specs

Each file here is a self-contained feature spec to hand to Claude Code **one at a time**.
Build them in order — later specs depend on earlier ones.

| # | Spec | Depends on | Produces |
|---|------|-----------|----------|
| 01 | VDOT engine | — | `lib/vdot.ts` (+ tests) — pace/VDOT/prediction/heat math |
| 02 | Goal feasibility | 01 | honest goal verdicts, sub-1:30 data-gate |
| 03 | Plan generator | 01, 02 | weekly/block plans for 3-4 days + gym |
| 04 | Persistence | — (do early) | DB schema + typed queries (Drizzle) |
| 05 | Matcher | 03, 04 | planned-vs-actual reconciliation + patterns |
| 06 | Coach prompt | 02, 05, 07 | state-block assembly + harsh-but-fair system prompt |
| 07 | Garmin recovery | 04 | recovery ingest + readiness (off-Vercel cron) |
| 08 | Calendar | 03 | date-bug fix + availability + opt-in GCal |

## How to run a spec with Claude Code
```
Read CLAUDE.md, PLANNING.md, and specs/01-vdot-engine.md.
Before writing code, give me a short plan: files you'll touch/create, the test
approach, and any open questions. Wait for my approval, then implement.
Finish by running `npm run build` and the tests, and summarize what changed.
```

## Suggested commit boundaries
One commit per spec (or per logical sub-part of a big spec). Keep diffs reviewable.
The VDOT engine starter code in `lib/vdot.ts` is already validated against the athlete's
1:40:04 half (VDOT 45.1) — start there.
