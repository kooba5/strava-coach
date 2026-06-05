/**
 * lib/queries.ts
 * ---------------------------------------------------------------------------
 * Typed query helpers. Route handlers import from here; no raw SQL outside
 * this file.
 *
 * All date strings are ISO "YYYY-MM-DD" (server-computed, never LLM-derived).
 */

import { eq, and, between, desc, lte, gte } from "drizzle-orm";
import { db } from "./db";
import {
  athlete,
  plannedSession,
  sessionResult,
  recoveryDay,
  type AthleteInsert,
  type PlannedSessionInsert,
  type SessionResultInsert,
  type RecoveryDayInsert,
} from "./schema";

// ── Athlete ────────────────────────────────────────────────────────────────

export async function getAthlete(id: string) {
  return db.query.athlete.findFirst({ where: eq(athlete.id, id) });
}

export async function upsertAthlete(data: AthleteInsert) {
  return db
    .insert(athlete)
    .values(data)
    .onConflictDoUpdate({
      target: athlete.id,
      set: {
        vdot: data.vdot,
        vdotUpdatedAt: data.vdotUpdatedAt,
        prefs: data.prefs,
        goalsJson: data.goalsJson,
      },
    });
}

// ── Planned sessions ───────────────────────────────────────────────────────

/** All sessions for the 7-day week that starts on weekStartDate (inclusive). */
export async function getWeekSessions(athleteId: string, weekStartDate: string) {
  const weekEndDate = addDaysToIso(weekStartDate, 6);
  return db
    .select()
    .from(plannedSession)
    .where(
      and(
        eq(plannedSession.athleteId, athleteId),
        gte(plannedSession.date, weekStartDate),
        lte(plannedSession.date, weekEndDate),
      ),
    )
    .orderBy(plannedSession.date);
}

export async function insertPlannedSession(data: PlannedSessionInsert) {
  return db.insert(plannedSession).values(data);
}

export async function insertPlannedSessions(sessions: PlannedSessionInsert[]) {
  if (sessions.length === 0) return;
  return db.insert(plannedSession).values(sessions);
}

export async function deletePlannedSession(id: string) {
  return db.delete(plannedSession).where(eq(plannedSession.id, id));
}

// ── Session results ────────────────────────────────────────────────────────

export async function recordResult(data: SessionResultInsert) {
  return db.insert(sessionResult).values(data);
}

export async function getResultsForSession(plannedId: string) {
  return db
    .select()
    .from(sessionResult)
    .where(eq(sessionResult.plannedId, plannedId));
}

// ── Recovery ───────────────────────────────────────────────────────────────

export async function upsertRecoveryDay(data: RecoveryDayInsert) {
  return db
    .insert(recoveryDay)
    .values(data)
    .onConflictDoUpdate({
      target: [recoveryDay.athleteId, recoveryDay.date],
      set: {
        sleepHours: data.sleepHours,
        hrvMs: data.hrvMs,
        restingHr: data.restingHr,
        bodyBattery: data.bodyBattery,
        readiness: data.readiness,
      },
    });
}

/** Most-recent n recovery days for an athlete, descending by date. */
export async function getRecentRecovery(athleteId: string, n: number) {
  return db
    .select()
    .from(recoveryDay)
    .where(eq(recoveryDay.athleteId, athleteId))
    .orderBy(desc(recoveryDay.date))
    .limit(n);
}

// ── Internal helpers ───────────────────────────────────────────────────────

/** Add days to an ISO date string without importing date-fns. */
function addDaysToIso(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
