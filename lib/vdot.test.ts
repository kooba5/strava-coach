import { describe, it, expect } from "vitest";
import {
  vdotFromPerformance,
  predictTime,
  trainingPaces,
  heatAdjustTime,
  DISTANCES,
  HEAT_NEUTRAL_C,
} from "./vdot";

describe("VDOT engine", () => {
  it("computes VDOT ~45.1 from the athlete's 1:40:04 half", () => {
    const seconds = 1 * 3600 + 40 * 60 + 4;
    const vdot = vdotFromPerformance(DISTANCES.half, seconds);
    expect(vdot).toBeGreaterThan(44.9);
    expect(vdot).toBeLessThan(45.3);
  });

  it("predicts sub-40:00 (2400s) for a 10k at VDOT 52", () => {
    expect(predictTime(DISTANCES.tenK, 52)).toBeLessThan(2400);
  });

  it("easyLow is slower (larger sec/km) than easyHigh", () => {
    const p = trainingPaces(45);
    expect(p.easyLow).toBeGreaterThan(p.easyHigh);
  });

  it("does NOT adjust time at or below neutral temperature", () => {
    const t = 3000;
    expect(heatAdjustTime(t, HEAT_NEUTRAL_C)).toBe(t);
    expect(heatAdjustTime(t, HEAT_NEUTRAL_C - 5)).toBe(t);
  });

  it("reduces the fair-equivalent time in hot conditions", () => {
    const t = 3000;
    expect(heatAdjustTime(t, 28)).toBeLessThan(t);
  });

  // --- Calibration guards (added in session 2) ---
  // These pin the engine to Daniels' published tables so a future refactor of the
  // anchors can't silently reintroduce the ~25-35 s/km "too fast" bug.

  it("threshold pace at VDOT 45 matches Daniels (~4:49/km, +/-3s)", () => {
    const t = trainingPaces(45).threshold; // sec/km
    expect(t).toBeGreaterThanOrEqual(4 * 60 + 46);
    expect(t).toBeLessThanOrEqual(4 * 60 + 52);
  });

  it("fast end of easy never crosses into marathon pace (no black hole)", () => {
    const p = trainingPaces(45);
    expect(p.easyHigh).toBeGreaterThan(p.marathon); // easyHigh is slower => bigger
  });

  it("interval pace at VDOT 45 matches Daniels (~4:27/km, +/-4s)", () => {
    const i = trainingPaces(45).interval;
    expect(i).toBeGreaterThanOrEqual(4 * 60 + 23);
    expect(i).toBeLessThanOrEqual(4 * 60 + 31);
  });
});