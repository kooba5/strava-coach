# Spec 07 — Garmin Recovery Layer (GarminDB)

## Goal
Bring sleep, HRV, and resting HR into the app so the coach can distinguish "you're
losing fitness" from "you're under-recovered," and so skips on bad-recovery days are
correctly treated as smart, not lazy.

## Reality of GarminDB (verified)
- GarminDB (tcgoetz) is a set of **Python CLI scripts** that download from Garmin
  Connect into **serverless SQLite databases**. It must be *run* (`garmindb_cli.py`),
  it is not a live API.
- There is a community fork **`GarminDB_with_hrv`** specifically adding HRV — use it if
  base GarminDB's HRV coverage is insufficient.
- Garmin activities sync to Strava natively, but **sleep/HRV do NOT** — they only live
  in Garmin. So this layer is genuinely additive, not redundant with Strava.

## Architecture (keeps Vercel clean — no Python on Vercel)
```
[Scheduler: cron on a small VPS / Raspberry Pi / GitHub Action]
   -> runs garmindb_cli.py --download --import (daily, e.g. 6am)
   -> produces/updates SQLite DBs (~/.GarminDb/*.db)
[Tiny sync script (Python or Node reading the SQLite file)]
   -> reads recent sleep / HRV / RHR rows
   -> POSTs normalized JSON to the app's authenticated /api/recovery/ingest endpoint
[Next.js app]
   -> /api/recovery/ingest validates a shared secret, upserts into recoveryDay table
   -> coach reads getRecentRecovery(7)
```

Why not run it on Vercel: Vercel is serverless, can't host a persistent Python cron job
or a browser-driven scraper reliably. A $5 VPS or a Pi that's always on is the right home.
A scheduled **GitHub Action** is a zero-cost alternative if you store Garmin creds as
encrypted secrets (accept the tradeoff of creds in CI).

## Readiness derivation
Compute a daily `readiness` (GREEN / AMBER / RED) from a baseline:
- Track rolling 30-day baselines for HRV and RHR.
- RED if HRV is well below baseline AND/OR RHR elevated AND/OR sleep < threshold.
- GREEN if metrics are at/above baseline.
- AMBER otherwise.
Expose the thresholds as config; calibrate to the athlete over time.

## Endpoint
`POST /api/recovery/ingest`
- Auth: `Authorization: Bearer {RECOVERY_INGEST_SECRET}` (new env var).
- Body: `[{ date, sleepHours, hrvMs, restingHr, bodyBattery }]`
- Upserts into `recoveryDay`, recomputes `readiness`.

## Tasks for Claude Code
1. Build `/api/recovery/ingest` with secret auth + validation + upsert.
2. Build `lib/readiness.ts` (baseline tracking + GREEN/AMBER/RED).
3. Wire `getRecentRecovery(7)` + today's readiness into the coach state block (spec 06).
4. Write the standalone sync script (separate from the Next app) + a README for the
   VPS/Pi/GitHub-Action cron setup. Keep Garmin credentials OUT of the Next app entirely.

## Acceptance
- App never touches Garmin credentials or runs Python.
- Coach affirms skips on RED days and challenges skips on GREEN days (spec 05/06).
- Missing recovery data degrades gracefully (coach just notes it's flying blind on recovery).
```
