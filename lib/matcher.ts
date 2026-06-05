/**
 * lib/matcher.ts
 * ---------------------------------------------------------------------------
 * Reconciles planned sessions against actual Strava activities.
 * This is the accountability engine: it determines COMPLETED / MODIFIED /
 * SKIPPED / PENDING for every session in a week.
 *
 * Hard rules:
 * - Pace is ALWAYS heat-adjusted before judging intensity; a hot slow run
 *   must not be penalised for pace alone.
 * - A skip on a RED recovery day = legitimate; on GREEN = slugging.
 *   Both are surfaced so the coach can respond appropriately.
 * - Easy days run at quality pace are flagged (intensity creep) — equally
 *   important as skipping quality sessions per Daniels.
 *
 * Dependencies: lib/vdot.ts, lib/strava.ts, lib/schema.ts (types only — no DB
 * calls). Callers persist results via lib/queries.ts.
 */

import { trainingPaces, HEAT_NEUTRAL_C, HEAT_PENALTY_PER_5C } from "./vdot";
import { isRun } from "./strava";
import type { StravaActivity } from "./strava";
import type { PlannedSession, SessionResult, RecoveryDay } from "./schema";

// ── Types ──────────────────────────────────────────────────────────────────

export type Classification = "COMPLETED" | "MODIFIED" | "SKIPPED" | "PENDING";

export interface MatchedSession {
  planned: PlannedSession;
  /** Null when SKIPPED or PENDING (no matching activity). */
  result: SessionResult | null;
  classification: Classification;
  /** Human-readable context — e.g. "ran 13°C above neutral; pace heat-adjusted" */
  contextNote?: string;
}

export interface WeekPatterns {
  /** Consecutive quality sessions skipped at the tail of the week. */
  qualitySkipStreak: number;
  /** True if any easy/long day was run at marathon pace or faster. */
  intensityCreepFlag: boolean;
  /** Count of skipped running sessions that fell on GREEN recovery days. */
  skipsOnGreenDays: number;
  /** Count of skipped running sessions that fell on RED recovery days. */
  skipsOnRedDays: number;
}

export interface ReconciledWeek {
  sessions: MatchedSession[];
  patterns: WeekPatterns;
}

export interface MatcherInput {
  planned: PlannedSession[];
  activities: StravaActivity[];
  /** Recovery rows for the period; may be empty before Spec 07 (Garmin). */
  recovery: RecoveryDay[];
  vdot: number;
  /** ISO "YYYY-MM-DD" — determines PENDING (future) vs SKIPPED (past). */
  today: string;
  /**
   * Optional temperature map: String(stravaActivityId) → °C.
   * Populated by Garmin / weather integration (spec 07).
   */
  activityTemps?: Map<string, number>;
}

// ── Constants ──────────────────────────────────────────────────────────────

/** Distance must be ≥ this fraction of planned to avoid a MODIFIED flag. */
const DISTANCE_FLOOR = 0.85;

/**
 * For quality sessions: adjusted pace must be within this multiplier of the
 * target pace (e.g. 1.20 = up to 20% slower than target).
 * Catches "easy jog passed off as a threshold session".
 */
const QUALITY_PACE_TOLERANCE = 1.20;

const QUALITY_TYPES = new Set<string>([
  "THRESHOLD", "INTERVAL", "REPETITION", "MARATHON", "RACE",
]);
const RUNNING_TYPES = new Set<string>([
  "EASY", "LONG", "THRESHOLD", "INTERVAL", "REPETITION", "MARATHON", "RACE",
]);

// ── Date helpers ───────────────────────────────────────────────────────────

function isoDateOf(stravaDate: string): string {
  return stravaDate.slice(0, 10);
}

function daysDiff(iso1: string, iso2: string): number {
  const ms = Math.abs(
    new Date(iso1 + "T00:00:00Z").getTime() -
    new Date(iso2 + "T00:00:00Z").getTime(),
  );
  return ms / (24 * 3600 * 1000);
}

// ── Intensity helpers ──────────────────────────────────────────────────────

function paceSecPerKm(activity: StravaActivity): number {
  if (activity.distance === 0) return 0;
  return activity.moving_time / (activity.distance / 1000);
}

/**
 * Heat-adjust an observed pace to its fair-weather equivalent.
 * If temp > HEAT_NEUTRAL_C, the athlete was penalised by heat.
 * We remove that penalty so the pace reflects true fitness effort.
 *   observed = fair × (1 + penalty)  →  fair = observed / (1 + penalty)
 * Lower sec/km = faster. Fair-weather pace is lower (faster) than hot-day pace.
 */
export function heatAdjustPace(rawPaceSecPerKm: number, tempCelsius: number): number {
  if (tempCelsius <= HEAT_NEUTRAL_C) return rawPaceSecPerKm;
  const degreesOver = tempCelsius - HEAT_NEUTRAL_C;
  const penalty = (degreesOver / 5) * HEAT_PENALTY_PER_5C;
  return rawPaceSecPerKm / (1 + penalty);
}

// ── Per-session classification ─────────────────────────────────────────────

function classifyRunSession(
  planned: PlannedSession,
  activity: StravaActivity,
  paces: ReturnType<typeof trainingPaces>,
  tempCelsius?: number,
): { classification: "COMPLETED" | "MODIFIED"; contextNote?: string } {
  const actualKm = activity.distance / 1000;
  const plannedKm = planned.targetDistanceKm ?? 0;
  const rawPace = paceSecPerKm(activity);
  const adjustedPace =
    tempCelsius != null ? heatAdjustPace(rawPace, tempCelsius) : rawPace;

  const wasHeatAdjusted = tempCelsius != null && tempCelsius > HEAT_NEUTRAL_C;
  const heatNote = wasHeatAdjusted
    ? `ran ${(tempCelsius! - HEAT_NEUTRAL_C).toFixed(0)}°C above neutral; pace heat-adjusted`
    : undefined;

  const distOk = plannedKm === 0 || actualKm / plannedKm >= DISTANCE_FLOOR;

  if (QUALITY_TYPES.has(planned.type)) {
    // Quality session — check distance AND whether meaningful effort was made.
    const target = planned.targetPaceSecPerKm;
    const qualityOk =
      target == null || adjustedPace <= target * QUALITY_PACE_TOLERANCE;

    if (distOk && qualityOk) {
      return { classification: "COMPLETED", contextNote: heatNote };
    }

    const reasons: string[] = [];
    if (!distOk) {
      reasons.push(
        `ran ${actualKm.toFixed(1)}km vs ${plannedKm.toFixed(1)}km planned`,
      );
    }
    if (!qualityOk) {
      reasons.push(
        `quality converted to jog: ${Math.round(adjustedPace)}s/km vs target ${target}s/km`,
      );
    }
    if (heatNote) reasons.push(heatNote);
    return { classification: "MODIFIED", contextNote: reasons.join("; ") };
  } else {
    // Easy / Long session — check distance and intensity creep.
    // Creep = ran at marathon pace or faster (entered the "black hole").
    const creep = adjustedPace < paces.marathon;

    if (distOk && !creep) {
      return { classification: "COMPLETED", contextNote: heatNote };
    }

    const reasons: string[] = [];
    if (creep) {
      reasons.push(
        `intensity creep: ${Math.round(adjustedPace)}s/km on easy day` +
        ` (marathon pace = ${Math.round(paces.marathon)}s/km)`,
      );
    }
    if (!distOk) {
      reasons.push(
        `ran ${actualKm.toFixed(1)}km vs ${plannedKm.toFixed(1)}km planned`,
      );
    }
    if (heatNote) reasons.push(heatNote);
    return { classification: "MODIFIED", contextNote: reasons.join("; ") };
  }
}

// ── SessionResult builder ──────────────────────────────────────────────────

function buildResult(
  planned: PlannedSession,
  activity: StravaActivity,
  status: "COMPLETED" | "MODIFIED",
  tempCelsius?: number,
): SessionResult {
  return {
    id: `result_${planned.id}`,
    plannedId: planned.id,
    stravaActivityId: String(activity.id),
    status,
    actualDistanceKm: activity.distance / 1000,
    actualPaceSecPerKm: Math.round(paceSecPerKm(activity)),
    actualAvgHr: activity.average_heartrate
      ? Math.round(activity.average_heartrate)
      : null,
    tempCelsius: tempCelsius ?? null,
    athleteNote: null,
    createdAt: new Date().toISOString(),
  };
}

// ── Pattern detection ──────────────────────────────────────────────────────

function detectPatterns(
  sessions: MatchedSession[],
  recovery: RecoveryDay[],
): WeekPatterns {
  const recoveryByDate = new Map(recovery.map((r) => [r.date, r.readiness]));

  // Quality skip streak: trailing consecutive SKIPPED quality sessions
  const qualitySessions = sessions.filter((s) =>
    QUALITY_TYPES.has(s.planned.type),
  );
  let qualitySkipStreak = 0;
  for (let i = qualitySessions.length - 1; i >= 0; i--) {
    if (qualitySessions[i].classification === "SKIPPED") qualitySkipStreak++;
    else break;
  }

  // Intensity creep: any easy/long session flagged as MODIFIED with creep
  const intensityCreepFlag = sessions.some(
    (s) =>
      (s.planned.type === "EASY" || s.planned.type === "LONG") &&
      s.classification === "MODIFIED" &&
      s.contextNote?.includes("intensity creep"),
  );

  // Skips on green / red recovery days
  const runSkips = sessions.filter(
    (s) => RUNNING_TYPES.has(s.planned.type) && s.classification === "SKIPPED",
  );
  let skipsOnGreenDays = 0;
  let skipsOnRedDays = 0;
  for (const s of runSkips) {
    const readiness = recoveryByDate.get(s.planned.date);
    if (readiness === "GREEN") skipsOnGreenDays++;
    else if (readiness === "RED") skipsOnRedDays++;
  }

  return { qualitySkipStreak, intensityCreepFlag, skipsOnGreenDays, skipsOnRedDays };
}

// ── Main export ────────────────────────────────────────────────────────────

export function reconcileWeek(input: MatcherInput): ReconciledWeek {
  const { planned, activities, recovery, vdot, today, activityTemps } = input;
  const paces = trainingPaces(vdot);

  const runActivities = activities.filter(isRun);
  const matchedIds = new Set<number>();

  const sessions: MatchedSession[] = planned.map((plan) => {
    // GYM / REST — not matched against Strava runs
    if (!RUNNING_TYPES.has(plan.type)) {
      return {
        planned: plan,
        result: null,
        classification: plan.date > today ? "PENDING" : "COMPLETED",
      } satisfies MatchedSession;
    }

    // Candidate activities: same date ±1 day, not already claimed
    const candidates = runActivities.filter(
      (a) =>
        !matchedIds.has(a.id) &&
        daysDiff(plan.date, isoDateOf(a.start_date)) <= 1,
    );

    if (candidates.length === 0) {
      const classification: Classification =
        plan.date > today ? "PENDING" : "SKIPPED";
      return { planned: plan, result: null, classification };
    }

    // Pick best candidate by closest distance to planned
    const plannedKm = plan.targetDistanceKm ?? 0;
    const best = candidates.slice().sort((a, b) => {
      const da = Math.abs(a.distance / 1000 - plannedKm);
      const db = Math.abs(b.distance / 1000 - plannedKm);
      return da - db;
    })[0];

    matchedIds.add(best.id);

    const tempC = activityTemps?.get(String(best.id));
    const { classification, contextNote } = classifyRunSession(
      plan,
      best,
      paces,
      tempC,
    );
    const result = buildResult(plan, best, classification, tempC);

    return { planned: plan, result, classification, contextNote };
  });

  const patterns = detectPatterns(sessions, recovery);
  return { sessions, patterns };
}
