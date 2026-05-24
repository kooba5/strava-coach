# Spec 04 — Persistence

## Goal
Persist the athlete profile, the training plan, planned sessions, completion records,
and recovery data. This is what gives the coach memory across sessions.

## Recommendation
Use **Turso (libSQL / SQLite)** or **Vercel Postgres**. SQLite/libSQL is the simplest
and pairs nicely with GarminDB (also SQLite). Use **Drizzle ORM** for type-safe schema
+ migrations.

This supersedes the old "no database required" note in the README — update the README.

## Schema (Drizzle-style sketch)
```ts
// athlete: single-user for now, but keyed by strava athlete id
athlete {
  id            text primary key        // strava athlete id
  vdot          real
  vdotUpdatedAt text
  prefs         text  // JSON: runningDays, gymDays, availableWeekdays, tone, etc.
  goalsJson     text  // JSON array of goals + treatments
  createdAt     text
}

plannedSession {
  id             text primary key
  athleteId      text references athlete(id)
  date           text   // ISO, server-computed
  weekday        text
  type           text   // EASY|LONG|THRESHOLD|INTERVAL|REPETITION|MARATHON|GYM|REST
  title          text
  targetDistanceKm   real
  targetPaceSecPerKm integer
  structureJson  text
  notes          text
  phase          text
}

sessionResult {
  id              text primary key
  plannedId       text references plannedSession(id)  // nullable: unplanned runs
  stravaActivityId text
  status          text   // COMPLETED | MODIFIED | SKIPPED | UNPLANNED
  actualDistanceKm real
  actualPaceSecPerKm integer
  actualAvgHr     integer
  tempCelsius     real
  athleteNote     text   // why skipped/modified, captured in chat
  createdAt       text
}

recoveryDay {
  athleteId   text references athlete(id)
  date        text
  sleepHours  real
  hrvMs       real
  restingHr   integer
  bodyBattery integer
  readiness   text   // GREEN | AMBER | RED (derived)
  primary key (athleteId, date)
}
```

## Tasks for Claude Code
1. Set up Drizzle + chosen DB driver; add `lib/db.ts`.
2. Write the schema above + an initial migration.
3. Add typed query helpers: `getAthlete`, `upsertAthlete`, `getWeekSessions(date)`,
   `recordResult`, `upsertRecoveryDay`, `getRecentRecovery(n)`.
4. Seed script that creates the athlete with VDOT 45 + the goals from spec 02.

## Acceptance
- Migrations run clean locally and on Vercel.
- All reads/writes are typed; no raw string SQL in route handlers.
- README updated to reflect the DB requirement + env vars.
