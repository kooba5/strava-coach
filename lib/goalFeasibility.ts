import { vdotFromPerformance } from "./vdot";

export interface Goal {
  label: string;
  distanceMeters: number;
  targetTimeSeconds: number;
  targetDate: string; // "YYYY-MM-DD"
  treatment: "primary" | "stretch" | "gated";
}

export interface AthleteState {
  currentVdot: number;
  runningDaysPerWeek: number;
  weeklyKm: number;
  longestRecentRunKm: number; // longest run in last ~6 weeks; gates sub-1:30 unlock
}

export interface FeasibilityVerdict {
  goal: Goal;
  requiredVdot: number;
  currentVdot: number;
  gap: number;
  projectedGain: number;
  verdict: "ON_TRACK" | "STRETCH" | "UNLIKELY" | "UNREALISTIC";
  unlocked: boolean;
  rationale: string;
}

export const SEED_GOALS: Goal[] = [
  {
    label: "Sub-40 10k",
    distanceMeters: 10000,
    targetTimeSeconds: 2399, // 39:59
    targetDate: "2026-10-15",
    treatment: "primary",
  },
  {
    label: "Sub-1:35 half",
    distanceMeters: 21097.5,
    targetTimeSeconds: 5699, // 1:34:59
    targetDate: "2026-10-15",
    treatment: "stretch",
  },
  {
    label: "Sub-1:30 half",
    distanceMeters: 21097.5,
    targetTimeSeconds: 5399, // 1:29:59
    targetDate: "2026-11-15",
    treatment: "gated",
  },
];

// Endurance gate: longestRecentRunKm is the distance-only proxy for now.
// Spec 07 (Garmin recovery) will add HR-drift validation once that data is available.
export function isUnlocked(goal: Goal, athleteState: AthleteState): boolean {
  if (goal.treatment !== "gated") return true;
  return (
    athleteState.currentVdot >= 50 && athleteState.longestRecentRunKm >= 18
  );
}

function computeProjectedGain(
  currentVdot: number,
  runningDaysPerWeek: number,
  weeklyKm: number,
  weeksUntilTarget: number
): number {
  const months = weeksUntilTarget / 4.33;
  // Rate declines as athlete approaches their ceiling — diminishing returns past VDOT ~50
  const baseRate = Math.max(0.3, 0.95 - 0.0075 * currentVdot);
  const frequencyFactor =
    runningDaysPerWeek <= 3 ? 0.8 : runningDaysPerWeek === 4 ? 0.875 : 1.0;
  const volumeFactor =
    weeklyKm < 30 ? 0.85 : weeklyKm <= 40 ? 0.925 : 1.0;
  return months * baseRate * frequencyFactor * volumeFactor;
}

export function assessFeasibility(
  goal: Goal,
  athleteState: AthleteState,
  weeksUntilTarget: number
): FeasibilityVerdict {
  const requiredVdot = vdotFromPerformance(
    goal.distanceMeters,
    goal.targetTimeSeconds
  );
  const gap = requiredVdot - athleteState.currentVdot;
  const projectedGain = computeProjectedGain(
    athleteState.currentVdot,
    athleteState.runningDaysPerWeek,
    athleteState.weeklyKm,
    weeksUntilTarget
  );
  const unlocked = isUnlocked(goal, athleteState);

  let verdict: FeasibilityVerdict["verdict"];
  if (gap <= 0) {
    verdict = "ON_TRACK";
  } else if (gap <= projectedGain * 0.7) {
    verdict = "ON_TRACK";
  } else if (gap <= projectedGain * 1.0) {
    verdict = "STRETCH";
  } else if (gap <= projectedGain * 1.3) {
    verdict = "UNLIKELY";
  } else {
    verdict = "UNREALISTIC";
  }

  const monthsStr = (weeksUntilTarget / 4.33).toFixed(1);
  const rationale = `Gap of ${gap.toFixed(1)} VDOT points; ${monthsStr} months of runway projects ~${projectedGain.toFixed(1)} points gained at your training load — ${verdict} (${goal.label}).`;

  return {
    goal,
    requiredVdot: Math.round(requiredVdot * 10) / 10,
    currentVdot: athleteState.currentVdot,
    gap: Math.round(gap * 10) / 10,
    projectedGain: Math.round(projectedGain * 10) / 10,
    verdict,
    unlocked,
    rationale,
  };
}

export function assessAllGoals(
  athleteState: AthleteState,
  today: Date = new Date()
): FeasibilityVerdict[] {
  return SEED_GOALS.map((goal) => {
    const targetMs = new Date(goal.targetDate).getTime();
    const weeksUntilTarget = Math.max(
      0,
      (targetMs - today.getTime()) / (7 * 24 * 3600 * 1000)
    );
    return assessFeasibility(goal, athleteState, weeksUntilTarget);
  });
}
