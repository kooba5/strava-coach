import { describe, it, expect } from "vitest";
import { reconcileWeek, heatAdjustPace, type MatcherInput } from "./matcher";
import { trainingPaces } from "./vdot";
import type { PlannedSession, RecoveryDay } from "./schema";
import type { StravaActivity } from "./strava";

// ── Test fixtures ─────────────────────────────────────────────────────────

const VDOT = 45;
const paces = trainingPaces(VDOT);

// Convenience: build a minimal PlannedSession
function mkPlan(
  overrides: Partial<PlannedSession> & { id: string; type: string; date: string },
): PlannedSession {
  return {
    athleteId: "athlete_1",
    weekday: "Tuesday",
    title: "Test session",
    targetDistanceKm: 8,
    targetPaceSecPerKm: null,
    structureJson: null,
    notes: null,
    phase: "EARLY_QUALITY",
    ...overrides,
  } as PlannedSession;
}

// Convenience: build a minimal StravaActivity (run)
function mkActivity(
  overrides: Partial<StravaActivity> & { id: number; start_date: string },
): StravaActivity {
  return {
    name: "Morning Run",
    type: "Run",
    sport_type: "Run",
    distance: 8000,       // 8km
    moving_time: 2880,    // 360 s/km (easy pace)
    elapsed_time: 2900,
    total_elevation_gain: 50,
    average_speed: 2.78,
    max_speed: 3.5,
    ...overrides,
  } as StravaActivity;
}

// Convenience: build a RecoveryDay
function mkRecovery(date: string, readiness: "GREEN" | "AMBER" | "RED"): RecoveryDay {
  return {
    athleteId: "athlete_1",
    date,
    sleepHours: null,
    hrvMs: null,
    restingHr: null,
    bodyBattery: null,
    readiness,
  };
}

const TODAY = "2026-06-15";

// ── Acceptance tests (from spec) ──────────────────────────────────────────

describe("Acceptance: heat adjustment", () => {
  it("(A1) heat-degraded threshold run is NOT classified MODIFIED for pace alone", () => {
    // At 35°C, penalty = (20/5)*0.015 = 0.06
    // Target T pace at VDOT 45 ≈ 289 s/km
    // Athlete ran 360 s/km (raw) — looks too slow vs 289 target
    // Heat-adjusted: 360 / 1.06 ≈ 339.6 s/km — within 20% of 289 (ratio ≈ 1.175) → COMPLETED
    // Without heat adjustment: 360/289 = 1.246 > 1.20 → MODIFIED

    const plan = mkPlan({
      id: "t1",
      type: "THRESHOLD",
      date: "2026-06-10",
      targetDistanceKm: 5,
      targetPaceSecPerKm: paces.threshold, // ~289
    });

    const act = mkActivity({
      id: 101,
      start_date: "2026-06-10T07:00:00Z",
      distance: 5000,
      moving_time: Math.round(360 * 5), // 360 s/km × 5km
    });

    const temps = new Map([["101", 35]]);

    const result = reconcileWeek({
      planned: [plan],
      activities: [act],
      recovery: [],
      vdot: VDOT,
      today: TODAY,
      activityTemps: temps,
    });

    expect(result.sessions[0].classification).toBe("COMPLETED");
    expect(result.sessions[0].contextNote).toContain("heat-adjusted");
  });

  it("same run without heat context → MODIFIED (demonstrates heat saved it)", () => {
    // No temp provided: raw pace 360 s/km vs target ~289, ratio 1.246 > 1.20 → MODIFIED
    const plan = mkPlan({
      id: "t2",
      type: "THRESHOLD",
      date: "2026-06-10",
      targetDistanceKm: 5,
      targetPaceSecPerKm: paces.threshold,
    });

    const act = mkActivity({
      id: 102,
      start_date: "2026-06-10T07:00:00Z",
      distance: 5000,
      moving_time: Math.round(360 * 5),
    });

    const result = reconcileWeek({
      planned: [plan],
      activities: [act],
      recovery: [],
      vdot: VDOT,
      today: TODAY,
    });

    expect(result.sessions[0].classification).toBe("MODIFIED");
  });
});

describe("Acceptance: recovery-correlated skips", () => {
  it("(A2) skip on RED recovery day → skipsOnRedDays += 1", () => {
    const plan = mkPlan({
      id: "q1",
      type: "THRESHOLD",
      date: "2026-06-12",
      targetDistanceKm: 4,
    });

    const result = reconcileWeek({
      planned: [plan],
      activities: [],
      recovery: [mkRecovery("2026-06-12", "RED")],
      vdot: VDOT,
      today: TODAY,
    });

    expect(result.sessions[0].classification).toBe("SKIPPED");
    expect(result.patterns.skipsOnRedDays).toBe(1);
    expect(result.patterns.skipsOnGreenDays).toBe(0);
  });

  it("skip on GREEN recovery day → skipsOnGreenDays += 1 (slugging)", () => {
    const plan = mkPlan({
      id: "q2",
      type: "THRESHOLD",
      date: "2026-06-12",
      targetDistanceKm: 4,
    });

    const result = reconcileWeek({
      planned: [plan],
      activities: [],
      recovery: [mkRecovery("2026-06-12", "GREEN")],
      vdot: VDOT,
      today: TODAY,
    });

    expect(result.sessions[0].classification).toBe("SKIPPED");
    expect(result.patterns.skipsOnGreenDays).toBe(1);
    expect(result.patterns.skipsOnRedDays).toBe(0);
  });
});

// ── Classification logic ──────────────────────────────────────────────────

describe("COMPLETED classification", () => {
  it("run within 15% of planned distance at appropriate pace → COMPLETED", () => {
    const plan = mkPlan({
      id: "e1",
      type: "EASY",
      date: "2026-06-10",
      targetDistanceKm: 8,
    });

    // 7.5km = 93.75% of 8km — within 85% floor ✓; pace 360s/km = easy ✓
    const act = mkActivity({
      id: 201,
      start_date: "2026-06-10T07:00:00Z",
      distance: 7500,
      moving_time: Math.round(360 * 7.5),
    });

    const result = reconcileWeek({
      planned: [plan],
      activities: [act],
      recovery: [],
      vdot: VDOT,
      today: TODAY,
    });

    expect(result.sessions[0].classification).toBe("COMPLETED");
  });

  it("threshold session with pace close to target → COMPLETED", () => {
    const targetPace = paces.threshold; // ~289
    const plan = mkPlan({
      id: "t3",
      type: "THRESHOLD",
      date: "2026-06-11",
      targetDistanceKm: 4,
      targetPaceSecPerKm: targetPace,
    });

    // Ran at target pace exactly
    const act = mkActivity({
      id: 202,
      start_date: "2026-06-11T07:00:00Z",
      distance: 4000,
      moving_time: Math.round(targetPace * 4),
    });

    const result = reconcileWeek({
      planned: [plan],
      activities: [act],
      recovery: [],
      vdot: VDOT,
      today: TODAY,
    });

    expect(result.sessions[0].classification).toBe("COMPLETED");
  });
});

describe("MODIFIED classification", () => {
  it("distance < 85% of planned → MODIFIED", () => {
    const plan = mkPlan({
      id: "e2",
      type: "EASY",
      date: "2026-06-10",
      targetDistanceKm: 10,
    });

    // 8km = 80% of 10km — below 85% floor
    const act = mkActivity({
      id: 301,
      start_date: "2026-06-10T07:00:00Z",
      distance: 8000,
      moving_time: Math.round(360 * 8),
    });

    const result = reconcileWeek({
      planned: [plan],
      activities: [act],
      recovery: [],
      vdot: VDOT,
      today: TODAY,
    });

    expect(result.sessions[0].classification).toBe("MODIFIED");
    expect(result.sessions[0].contextNote).toContain("8.0km vs 10.0km");
  });

  it("easy run at marathon pace or faster → MODIFIED (intensity creep)", () => {
    const plan = mkPlan({
      id: "e3",
      type: "EASY",
      date: "2026-06-10",
      targetDistanceKm: 8,
    });

    // Ran at marathon pace (paces.marathon ≈ 305 s/km) — below the creep threshold
    const creepPace = Math.round(paces.marathon * 0.95); // clearly faster than marathon pace
    const act = mkActivity({
      id: 302,
      start_date: "2026-06-10T07:00:00Z",
      distance: 8000,
      moving_time: creepPace * 8,
    });

    const result = reconcileWeek({
      planned: [plan],
      activities: [act],
      recovery: [],
      vdot: VDOT,
      today: TODAY,
    });

    expect(result.sessions[0].classification).toBe("MODIFIED");
    expect(result.sessions[0].contextNote).toContain("intensity creep");
  });

  it("quality session run at easy pace (>20% off target) → MODIFIED", () => {
    const plan = mkPlan({
      id: "t4",
      type: "THRESHOLD",
      date: "2026-06-11",
      targetDistanceKm: 4,
      targetPaceSecPerKm: paces.threshold, // ~289
    });

    // Ran at 380 s/km — very slow, 380/289 = 1.315 > 1.20 → quality dodged
    const act = mkActivity({
      id: 303,
      start_date: "2026-06-11T07:00:00Z",
      distance: 4000,
      moving_time: 380 * 4,
    });

    const result = reconcileWeek({
      planned: [plan],
      activities: [act],
      recovery: [],
      vdot: VDOT,
      today: TODAY,
    });

    expect(result.sessions[0].classification).toBe("MODIFIED");
    expect(result.sessions[0].contextNote).toContain("quality converted to jog");
  });
});

// ── SKIPPED vs PENDING ────────────────────────────────────────────────────

describe("SKIPPED vs PENDING", () => {
  it("no activity, date in the past → SKIPPED", () => {
    const plan = mkPlan({
      id: "e4",
      type: "EASY",
      date: "2026-06-10", // past (today = 2026-06-15)
    });

    const result = reconcileWeek({
      planned: [plan],
      activities: [],
      recovery: [],
      vdot: VDOT,
      today: TODAY,
    });

    expect(result.sessions[0].classification).toBe("SKIPPED");
    expect(result.sessions[0].result).toBeNull();
  });

  it("no activity, date in the future → PENDING", () => {
    const plan = mkPlan({
      id: "e5",
      type: "EASY",
      date: "2026-06-20", // future
    });

    const result = reconcileWeek({
      planned: [plan],
      activities: [],
      recovery: [],
      vdot: VDOT,
      today: TODAY,
    });

    expect(result.sessions[0].classification).toBe("PENDING");
    expect(result.sessions[0].result).toBeNull();
  });
});

// ── Date tolerance ────────────────────────────────────────────────────────

describe("Date matching", () => {
  it("activity 1 day after planned date is still matched", () => {
    const plan = mkPlan({
      id: "e6",
      type: "EASY",
      date: "2026-06-10",
      targetDistanceKm: 8,
    });

    // Activity on 2026-06-11 (next day — late-night / cross-midnight run)
    const act = mkActivity({
      id: 401,
      start_date: "2026-06-11T01:00:00Z",
      distance: 8000,
      moving_time: 2880,
    });

    const result = reconcileWeek({
      planned: [plan],
      activities: [act],
      recovery: [],
      vdot: VDOT,
      today: TODAY,
    });

    expect(result.sessions[0].classification).not.toBe("SKIPPED");
  });

  it("activity 2 days away is NOT matched", () => {
    const plan = mkPlan({
      id: "e7",
      type: "EASY",
      date: "2026-06-10",
      targetDistanceKm: 8,
    });

    const act = mkActivity({
      id: 402,
      start_date: "2026-06-12T07:00:00Z",
      distance: 8000,
      moving_time: 2880,
    });

    const result = reconcileWeek({
      planned: [plan],
      activities: [act],
      recovery: [],
      vdot: VDOT,
      today: TODAY,
    });

    expect(result.sessions[0].classification).toBe("SKIPPED");
  });
});

// ── Pattern detection ─────────────────────────────────────────────────────

describe("Pattern detection", () => {
  it("qualitySkipStreak counts consecutive trailing quality skips", () => {
    const planned = [
      mkPlan({ id: "p1", type: "THRESHOLD", date: "2026-06-09" }),
      mkPlan({ id: "p2", type: "THRESHOLD", date: "2026-06-11" }),
      mkPlan({ id: "p3", type: "THRESHOLD", date: "2026-06-13" }),
    ];

    // Only first quality session completed; last two skipped
    const act = mkActivity({
      id: 501,
      start_date: "2026-06-09T07:00:00Z",
      distance: 4000,
      moving_time: paces.threshold * 4,
    });

    const result = reconcileWeek({
      planned,
      activities: [act],
      recovery: [],
      vdot: VDOT,
      today: TODAY,
    });

    expect(result.patterns.qualitySkipStreak).toBe(2);
  });

  it("qualitySkipStreak resets to 0 when last quality session was completed", () => {
    const planned = [
      mkPlan({ id: "p4", type: "THRESHOLD", date: "2026-06-09" }),
      mkPlan({ id: "p5", type: "THRESHOLD", date: "2026-06-13" }),
    ];

    // Both completed
    const acts = [
      mkActivity({ id: 502, start_date: "2026-06-09T07:00:00Z", distance: 4000, moving_time: paces.threshold * 4 }),
      mkActivity({ id: 503, start_date: "2026-06-13T07:00:00Z", distance: 4000, moving_time: paces.threshold * 4 }),
    ];

    const result = reconcileWeek({
      planned,
      activities: acts,
      recovery: [],
      vdot: VDOT,
      today: TODAY,
    });

    expect(result.patterns.qualitySkipStreak).toBe(0);
  });

  it("intensityCreepFlag is true when easy session runs at marathon pace", () => {
    const plan = mkPlan({
      id: "p6",
      type: "EASY",
      date: "2026-06-10",
      targetDistanceKm: 8,
    });

    const creepPace = Math.round(paces.marathon * 0.95);
    const act = mkActivity({
      id: 504,
      start_date: "2026-06-10T07:00:00Z",
      distance: 8000,
      moving_time: creepPace * 8,
    });

    const result = reconcileWeek({
      planned: [plan],
      activities: [act],
      recovery: [],
      vdot: VDOT,
      today: TODAY,
    });

    expect(result.patterns.intensityCreepFlag).toBe(true);
  });

  it("intensityCreepFlag is false when easy sessions are truly easy", () => {
    const plan = mkPlan({
      id: "p7",
      type: "EASY",
      date: "2026-06-10",
      targetDistanceKm: 8,
    });

    // Running at 360 s/km (well slower than marathon ~305)
    const act = mkActivity({
      id: 505,
      start_date: "2026-06-10T07:00:00Z",
      distance: 8000,
      moving_time: 360 * 8,
    });

    const result = reconcileWeek({
      planned: [plan],
      activities: [act],
      recovery: [],
      vdot: VDOT,
      today: TODAY,
    });

    expect(result.patterns.intensityCreepFlag).toBe(false);
  });
});

// ── Result shape ──────────────────────────────────────────────────────────

describe("Result shape", () => {
  it("COMPLETED session has a populated result object", () => {
    const plan = mkPlan({
      id: "r1",
      type: "EASY",
      date: "2026-06-10",
      targetDistanceKm: 8,
    });

    const act = mkActivity({
      id: 601,
      start_date: "2026-06-10T07:00:00Z",
      distance: 8000,
      moving_time: 2880,
    });

    const result = reconcileWeek({
      planned: [plan],
      activities: [act],
      recovery: [],
      vdot: VDOT,
      today: TODAY,
    });

    const s = result.sessions[0];
    expect(s.result).not.toBeNull();
    expect(s.result!.plannedId).toBe("r1");
    expect(s.result!.stravaActivityId).toBe("601");
    expect(s.result!.status).toBe("COMPLETED");
    expect(s.result!.actualDistanceKm).toBeCloseTo(8, 1);
  });

  it("SKIPPED session has result = null", () => {
    const plan = mkPlan({ id: "r2", type: "EASY", date: "2026-06-10" });

    const result = reconcileWeek({
      planned: [plan],
      activities: [],
      recovery: [],
      vdot: VDOT,
      today: TODAY,
    });

    expect(result.sessions[0].result).toBeNull();
  });
});

// ── heatAdjustPace unit tests ─────────────────────────────────────────────

describe("heatAdjustPace", () => {
  it("returns original pace at or below neutral temperature", () => {
    expect(heatAdjustPace(300, 15)).toBe(300);
    expect(heatAdjustPace(300, 10)).toBe(300);
  });

  it("returns a faster (lower) pace above neutral", () => {
    // At 35°C: penalty = 0.06, adjusted = 300/1.06 ≈ 283
    const adjusted = heatAdjustPace(300, 35);
    expect(adjusted).toBeLessThan(300);
    expect(adjusted).toBeCloseTo(300 / 1.06, 0);
  });
});
