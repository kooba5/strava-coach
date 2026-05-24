import { describe, it, expect } from "vitest";
import {
  assessFeasibility,
  assessAllGoals,
  isUnlocked,
  SEED_GOALS,
  Goal,
  AthleteState,
} from "./goalFeasibility";
import { vdotFromPerformance } from "./vdot";

const BASE_ATHLETE: AthleteState = {
  currentVdot: 45,
  runningDaysPerWeek: 4,
  weeklyKm: 32,
  longestRecentRunKm: 14,
};

const TODAY = new Date("2026-05-24");

describe("Goal Feasibility Module", () => {
  it("requiredVdot for sub-40 10k is in range [51.5, 52.5]", () => {
    const sub40 = SEED_GOALS[0];
    const v = vdotFromPerformance(sub40.distanceMeters, sub40.targetTimeSeconds);
    expect(v).toBeGreaterThanOrEqual(51.5);
    expect(v).toBeLessThanOrEqual(52.5);
  });

  it("requiredVdot for sub-1:35 half is in range [47.0, 49.0]", () => {
    const half135 = SEED_GOALS[1];
    const v = vdotFromPerformance(half135.distanceMeters, half135.targetTimeSeconds);
    expect(v).toBeGreaterThanOrEqual(47.0);
    expect(v).toBeLessThanOrEqual(49.0);
  });

  it("gap <= 0 short-circuits to ON_TRACK", () => {
    const athlete: AthleteState = { ...BASE_ATHLETE, currentVdot: 55 };
    const verdict = assessFeasibility(SEED_GOALS[0], athlete, 20);
    expect(verdict.verdict).toBe("ON_TRACK");
    expect(verdict.gap).toBeLessThanOrEqual(0);
  });

  it("athlete at VDOT 45 → sub-40 10k is UNREALISTIC with 5-month runway", () => {
    const verdicts = assessAllGoals(BASE_ATHLETE, TODAY);
    const sub40 = verdicts.find((v) => v.goal.label === "Sub-40 10k")!;
    expect(sub40.verdict).toBe("UNREALISTIC");
  });

  it("athlete at VDOT 45 → sub-1:35 half is UNLIKELY with 5-month runway", () => {
    const verdicts = assessAllGoals(BASE_ATHLETE, TODAY);
    const half135 = verdicts.find((v) => v.goal.label === "Sub-1:35 half")!;
    expect(half135.verdict).toBe("UNLIKELY");
  });

  it("very short runway (2 weeks) → sub-40 10k is UNREALISTIC", () => {
    const verdict = assessFeasibility(SEED_GOALS[0], BASE_ATHLETE, 2);
    expect(verdict.verdict).toBe("UNREALISTIC");
  });

  it("isUnlocked returns false for gated goal when VDOT < 50", () => {
    const gated = SEED_GOALS[2];
    const athlete: AthleteState = { ...BASE_ATHLETE, currentVdot: 49, longestRecentRunKm: 20 };
    expect(isUnlocked(gated, athlete)).toBe(false);
  });

  it("isUnlocked returns false for gated goal when VDOT >= 50 but long run < 18 km", () => {
    const gated = SEED_GOALS[2];
    const athlete: AthleteState = { ...BASE_ATHLETE, currentVdot: 50, longestRecentRunKm: 17 };
    expect(isUnlocked(gated, athlete)).toBe(false);
  });

  it("isUnlocked returns true for gated goal when both conditions met", () => {
    const gated = SEED_GOALS[2];
    const athlete: AthleteState = { ...BASE_ATHLETE, currentVdot: 50, longestRecentRunKm: 18 };
    expect(isUnlocked(gated, athlete)).toBe(true);
  });

  it("isUnlocked always returns true for primary and stretch goals", () => {
    expect(isUnlocked(SEED_GOALS[0], BASE_ATHLETE)).toBe(true); // primary
    expect(isUnlocked(SEED_GOALS[1], BASE_ATHLETE)).toBe(true); // stretch
  });

  it("every verdict has a non-empty rationale string", () => {
    const verdicts = assessAllGoals(BASE_ATHLETE, TODAY);
    for (const v of verdicts) {
      expect(v.rationale.length).toBeGreaterThan(0);
    }
  });
});
