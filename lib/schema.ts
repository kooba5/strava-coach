/**
 * lib/schema.ts
 * ---------------------------------------------------------------------------
 * Drizzle ORM schema for the strava-coach v2 persistence layer.
 * DB: Turso (libSQL / SQLite) — local dev uses file:local.db.
 */

import { sqliteTable, text, real, integer, primaryKey } from "drizzle-orm/sqlite-core";

// ── athlete ────────────────────────────────────────────────────────────────
// Single-user for now but keyed by Strava athlete ID for future multi-user.

export const athlete = sqliteTable("athlete", {
  /** Strava athlete ID (string, from OAuth profile). */
  id: text("id").primaryKey(),
  vdot: real("vdot"),
  vdotUpdatedAt: text("vdot_updated_at"),
  /** JSON: { runningDaysPerWeek, gymDaysPerWeek, availableWeekdays, tone } */
  prefs: text("prefs"),
  /** JSON array of Goal objects (label, distanceMeters, targetTimeSeconds, treatment…) */
  goalsJson: text("goals_json"),
  createdAt: text("created_at"),
});

// ── plannedSession ─────────────────────────────────────────────────────────

export const plannedSession = sqliteTable("planned_session", {
  id: text("id").primaryKey(),
  athleteId: text("athlete_id").references(() => athlete.id).notNull(),
  /** ISO date "YYYY-MM-DD", server-computed (never LLM-derived). */
  date: text("date").notNull(),
  weekday: text("weekday"),
  /** EASY | LONG | THRESHOLD | INTERVAL | REPETITION | MARATHON | RACE | GYM | REST */
  type: text("type").notNull(),
  title: text("title").notNull(),
  targetDistanceKm: real("target_distance_km"),
  targetPaceSecPerKm: integer("target_pace_sec_per_km"),
  /** JSON array of WorkoutRep objects */
  structureJson: text("structure_json"),
  notes: text("notes"),
  /** BASE | EARLY_QUALITY | VO2MAX | SPECIFIC | TAPER */
  phase: text("phase"),
});

// ── sessionResult ──────────────────────────────────────────────────────────

export const sessionResult = sqliteTable("session_result", {
  id: text("id").primaryKey(),
  /** Nullable — unplanned runs won't have a matching planned session. */
  plannedId: text("planned_id").references(() => plannedSession.id),
  stravaActivityId: text("strava_activity_id"),
  /** COMPLETED | MODIFIED | SKIPPED | UNPLANNED */
  status: text("status").notNull(),
  actualDistanceKm: real("actual_distance_km"),
  actualPaceSecPerKm: integer("actual_pace_sec_per_km"),
  actualAvgHr: integer("actual_avg_hr"),
  tempCelsius: real("temp_celsius"),
  /** Why skipped/modified — captured in chat or app UI. */
  athleteNote: text("athlete_note"),
  createdAt: text("created_at").notNull(),
});

// ── recoveryDay ────────────────────────────────────────────────────────────
// One row per athlete per calendar day. Sourced from Garmin (spec 07).

export const recoveryDay = sqliteTable(
  "recovery_day",
  {
    athleteId: text("athlete_id")
      .references(() => athlete.id)
      .notNull(),
    date: text("date").notNull(),
    sleepHours: real("sleep_hours"),
    hrvMs: real("hrv_ms"),
    restingHr: integer("resting_hr"),
    bodyBattery: integer("body_battery"),
    /** GREEN | AMBER | RED — derived from HRV + sleep + body battery. */
    readiness: text("readiness"),
  },
  (table) => [primaryKey({ columns: [table.athleteId, table.date] })],
);

// ── Inferred types ─────────────────────────────────────────────────────────
// Convenience exports so callers can type insert/select data without
// importing table objects from this file directly.

export type Athlete       = typeof athlete.$inferSelect;
export type AthleteInsert = typeof athlete.$inferInsert;

export type PlannedSession       = typeof plannedSession.$inferSelect;
export type PlannedSessionInsert = typeof plannedSession.$inferInsert;

export type SessionResult       = typeof sessionResult.$inferSelect;
export type SessionResultInsert = typeof sessionResult.$inferInsert;

export type RecoveryDay       = typeof recoveryDay.$inferSelect;
export type RecoveryDayInsert = typeof recoveryDay.$inferInsert;
