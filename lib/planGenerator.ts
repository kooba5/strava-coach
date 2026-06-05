/**
 * lib/planGenerator.ts
 * ---------------------------------------------------------------------------
 * Generates a week of Daniels-based training sessions.
 *
 * Key invariants:
 * - Quality km are sized FROM weekly volume (not arbitrary constants).
 *   T = max(10% weekly, 20-min floor) capped at 8km.
 *   I = min(8% weekly, 10km).
 *   R = 5% weekly.
 * - Validator only TRIMS on absolute-ceiling breach; otherwise emits
 *   ADD_EASY_VOLUME. Never trims to hit a percentage target.
 * - Long run counts as EASY for distribution, not quality.
 * - Phases BASE and EARLY_QUALITY are goal-agnostic. Only VO2MAX, SPECIFIC,
 *   and TAPER branch on primaryGoalDistanceMeters.
 * - All dates computed server-side; the LLM never touches date math.
 */

import { trainingPaces, fmtPace } from "./vdot";

// ── Types ──────────────────────────────────────────────────────────────────

export type Phase =
  | "BASE"
  | "EARLY_QUALITY"
  | "VO2MAX"
  | "SPECIFIC"
  | "TAPER";

export type SessionType =
  | "EASY"
  | "LONG"
  | "THRESHOLD"
  | "INTERVAL"
  | "REPETITION"
  | "MARATHON"
  | "RACE"
  | "GYM"
  | "REST";

export interface WorkoutRep {
  reps: number;
  distanceMeters?: number;
  durationSeconds?: number;
  paceSecPerKm: number;
  recoverySeconds: number;
}

export interface PlannedSession {
  id: string;
  date: string;             // ISO "YYYY-MM-DD", server-computed
  weekday: string;          // "Monday" etc., server-computed
  type: SessionType;
  title: string;
  targetDistanceKm?: number;
  targetPaceSecPerKm?: number;
  targetPaceLabel?: string;
  structure?: WorkoutRep[];
  isTuneUpRace?: boolean;
  notes?: string;
}

export type ValidatorWarning =
  | { type: "ADD_EASY_VOLUME"; targetWeeklyKm: number; currentQualityPct: number }
  | { type: "TRIM"; sessionId: string; trimmedFromKm: number; trimmedToKm: number };

export interface WeekPlan {
  weekStartDate: string;
  sessions: PlannedSession[];
  weeklyKmTarget: number;
  validatorWarnings: ValidatorWarning[];
}

export interface PlanGeneratorInput {
  vdot: number;
  /** distanceMeters of the primary goal — 10000 or 21097.5 */
  primaryGoalDistanceMeters: number;
  phase: Phase;
  runningDaysPerWeek: 3 | 4;
  gymDaysPerWeek?: 0 | 1 | 2;
  weeklyKm: number;
  /** Start of the week (Monday). Dates are derived by offsetting this. */
  startDate: Date;
}

// ── Constants ──────────────────────────────────────────────────────────────

const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

/**
 * Phase III/IV specialisation by primary goal.
 * Phases I/II never consult this — goal-agnostic by design.
 */
const PEAK_PROFILE: Record<
  string,
  { phase3: SessionType; phase4: SessionType; longRunCapKm: number }
> = {
  "10000": {
    phase3: "INTERVAL",
    phase4: "INTERVAL",
    longRunCapKm: 16,
  },
  "21097.5": {
    phase3: "THRESHOLD",
    phase4: "THRESHOLD",
    longRunCapKm: 22,
  },
};

// Daniels distribution bands
const QUALITY_PCT_MAX = 0.15; // 15% upper bound for T+M and I+R separately

// Absolute ceilings — only threshold for trim, not percentage targets
const T_ABS_CAP_KM = 8;
const I_ABS_CAP_KM = 10;

// ── Date helpers ───────────────────────────────────────────────────────────

function shiftDate(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ── Quality session sizing ─────────────────────────────────────────────────

/** km equivalent of 20min of threshold work — the effective floor. */
function tFloorKm(thresholdSecPerKm: number): number {
  return (20 * 60) / thresholdSecPerKm;
}

function sizeT(weeklyKm: number, thresholdSecPerKm: number): number {
  return Math.min(
    Math.max(weeklyKm * 0.10, tFloorKm(thresholdSecPerKm)),
    T_ABS_CAP_KM,
  );
}

function sizeI(weeklyKm: number): number {
  return Math.min(weeklyKm * 0.08, I_ABS_CAP_KM);
}

function sizeR(weeklyKm: number): number {
  return weeklyKm * 0.05;
}

// ── Phase → quality session type ───────────────────────────────────────────

/**
 * Returns null for BASE (no quality slot).
 * EARLY_QUALITY and goal-agnostic phases always return THRESHOLD.
 * VO2MAX/SPECIFIC read PEAK_PROFILE.
 */
function qualityTypeForPhase(phase: Phase, goalKey: string): SessionType | null {
  switch (phase) {
    case "BASE":
      return null;
    case "EARLY_QUALITY":
      return "THRESHOLD";
    case "VO2MAX":
      return PEAK_PROFILE[goalKey]?.phase3 ?? "INTERVAL";
    case "SPECIFIC":
      return PEAK_PROFILE[goalKey]?.phase4 ?? "INTERVAL";
    case "TAPER":
      return "THRESHOLD";
  }
}

// ── Session builders ───────────────────────────────────────────────────────

type Paces = ReturnType<typeof trainingPaces>;

function mkEasy(date: Date, km: number, paces: Paces): PlannedSession {
  const d = isoDate(date);
  return {
    id: `EASY_${d}`,
    date: d,
    weekday: WEEKDAY_NAMES[date.getDay()],
    type: "EASY",
    title: `Easy run ${km.toFixed(1)}km @ ${fmtPace(paces.easyHigh)}–${fmtPace(paces.easyLow)}/km`,
    targetDistanceKm: Math.round(km * 10) / 10,
  };
}

function mkLong(date: Date, km: number, paces: Paces): PlannedSession {
  const d = isoDate(date);
  return {
    id: `LONG_${d}`,
    date: d,
    weekday: WEEKDAY_NAMES[date.getDay()],
    type: "LONG",
    title: `Long run ${km.toFixed(1)}km @ ${fmtPace(paces.easyHigh)}–${fmtPace(paces.easyLow)}/km`,
    targetDistanceKm: Math.round(km * 10) / 10,
  };
}

function mkThreshold(date: Date, km: number, paces: Paces): PlannedSession {
  const d = isoDate(date);
  const pl = fmtPace(paces.threshold);
  // Describe as ~10min reps; minimum 1 rep
  const repKm = (10 * 60) / paces.threshold;
  const reps = Math.max(1, Math.round(km / repKm));
  const perRepKm = km / reps;
  const roundedKm = Math.round(km * 10) / 10;
  const structure: WorkoutRep[] = [{
    reps,
    distanceMeters: Math.round(perRepKm * 1000),
    paceSecPerKm: paces.threshold,
    recoverySeconds: 60,
  }];
  return {
    id: `THRESHOLD_${d}`,
    date: d,
    weekday: WEEKDAY_NAMES[date.getDay()],
    type: "THRESHOLD",
    title: reps === 1
      ? `${roundedKm}km @ ${pl}/km (threshold continuous)`
      : `${reps} × ${Math.round(perRepKm * 1000)}m @ ${pl}/km, 60s jog`,
    targetDistanceKm: roundedKm,
    targetPaceSecPerKm: paces.threshold,
    targetPaceLabel: `${pl}/km`,
    structure,
  };
}

function mkInterval(date: Date, km: number, paces: Paces): PlannedSession {
  const d = isoDate(date);
  const pl = fmtPace(paces.interval);
  // 1000m reps; minimum 3
  const reps = Math.max(3, Math.round(km));
  const structure: WorkoutRep[] = [{
    reps,
    distanceMeters: 1000,
    paceSecPerKm: paces.interval,
    recoverySeconds: 150, // 2:30 jog
  }];
  return {
    id: `INTERVAL_${d}`,
    date: d,
    weekday: WEEKDAY_NAMES[date.getDay()],
    type: "INTERVAL",
    title: `${reps} × 1000m @ ${pl}/km, 2:30 jog`,
    targetDistanceKm: Math.round(km * 10) / 10,
    targetPaceSecPerKm: paces.interval,
    targetPaceLabel: `${pl}/km`,
    structure,
  };
}

function mkRepetition(date: Date, km: number, paces: Paces): PlannedSession {
  const d = isoDate(date);
  const pl = fmtPace(paces.repetition);
  // 200m reps; minimum 4
  const reps = Math.max(4, Math.round((km * 1000) / 200));
  const structure: WorkoutRep[] = [{
    reps,
    distanceMeters: 200,
    paceSecPerKm: paces.repetition,
    recoverySeconds: 180,
  }];
  return {
    id: `REPETITION_${d}`,
    date: d,
    weekday: WEEKDAY_NAMES[date.getDay()],
    type: "REPETITION",
    title: `${reps} × 200m @ ${pl}/km, walk back`,
    targetDistanceKm: Math.round(km * 10) / 10,
    targetPaceSecPerKm: paces.repetition,
    targetPaceLabel: `${pl}/km`,
    structure,
  };
}

function mkGym(date: Date): PlannedSession {
  const d = isoDate(date);
  return {
    id: `GYM_${d}`,
    date: d,
    weekday: WEEKDAY_NAMES[date.getDay()],
    type: "GYM",
    title: "Full-body strength, 45–60min",
  };
}

function mkQuality(date: Date, type: SessionType, km: number, paces: Paces): PlannedSession {
  switch (type) {
    case "THRESHOLD":  return mkThreshold(date, km, paces);
    case "INTERVAL":   return mkInterval(date, km, paces);
    case "REPETITION": return mkRepetition(date, km, paces);
    default:           return mkEasy(date, km, paces);
  }
}

// ── Slot layout ────────────────────────────────────────────────────────────

type SlotKind = "LONG" | "QUALITY" | "EASY" | "GYM";

/**
 * Day offsets from startDate (Monday = 0) for each session.
 *
 * Gym placement rules:
 *   - Never the day before QUALITY or LONG.
 *   - 4-day: quality=Tue(1), long=Sat(5) → no gym Mon(0) or Fri(4).
 *     Gym slots: Wed(2), Sun(6).
 *   - 3-day: quality=Wed(2), long=Sat(5) → no gym Tue(1) or Fri(4).
 *     Gym slots: Thu(3), Sun(6).
 */
function buildSlots(
  runningDaysPerWeek: 3 | 4,
  gymDaysPerWeek: 0 | 1 | 2,
  hasQuality: boolean,
): Array<{ offset: number; kind: SlotKind }> {
  const slots: Array<{ offset: number; kind: SlotKind }> = [];

  if (runningDaysPerWeek === 4) {
    slots.push({ offset: 0, kind: "EASY" });
    slots.push({ offset: 1, kind: hasQuality ? "QUALITY" : "EASY" });
    slots.push({ offset: 3, kind: "EASY" });
    slots.push({ offset: 5, kind: "LONG" });
    if (gymDaysPerWeek >= 1) slots.push({ offset: 2, kind: "GYM" });
    if (gymDaysPerWeek >= 2) slots.push({ offset: 6, kind: "GYM" });
  } else {
    slots.push({ offset: 0, kind: "EASY" });
    slots.push({ offset: 2, kind: hasQuality ? "QUALITY" : "EASY" });
    slots.push({ offset: 5, kind: "LONG" });
    if (gymDaysPerWeek >= 1) slots.push({ offset: 3, kind: "GYM" });
    if (gymDaysPerWeek >= 2) slots.push({ offset: 6, kind: "GYM" });
  }

  return slots.sort((a, b) => a.offset - b.offset);
}

// ── Validator ──────────────────────────────────────────────────────────────

/**
 * Checks Daniels distribution (70-80% easy, ≤15% T+M, ≤15% I+R).
 *
 * TRIM: only when a session exceeds the absolute ceiling (T>8km, I>10km).
 *       Applied in-place to targetDistanceKm.
 * ADD_EASY_VOLUME: when quality% > 15% but absolute km are within caps.
 *       Advisory only — never modifies sessions.
 *
 * Long run counts as easy volume (not quality), so it suppresses warnings
 * naturally as volume grows.
 */
function validateAndMutate(sessions: PlannedSession[]): ValidatorWarning[] {
  const warnings: ValidatorWarning[] = [];

  let tmKm = 0;
  let irKm = 0;
  let totalRunKm = 0;

  for (const s of sessions) {
    const km = s.targetDistanceKm ?? 0;
    if (s.type === "THRESHOLD" || s.type === "MARATHON") tmKm += km;
    else if (s.type === "INTERVAL" || s.type === "REPETITION") irKm += km;
    if (s.type !== "GYM" && s.type !== "REST") totalRunKm += km;
  }

  if (totalRunKm === 0) return warnings;

  if (tmKm > 0) {
    if (tmKm > T_ABS_CAP_KM) {
      const s = sessions.find(x => x.type === "THRESHOLD" || x.type === "MARATHON")!;
      warnings.push({ type: "TRIM", sessionId: s.id, trimmedFromKm: tmKm, trimmedToKm: T_ABS_CAP_KM });
      s.targetDistanceKm = T_ABS_CAP_KM;
    } else if (tmKm / totalRunKm > QUALITY_PCT_MAX) {
      warnings.push({
        type: "ADD_EASY_VOLUME",
        targetWeeklyKm: Math.ceil(tmKm / QUALITY_PCT_MAX),
        currentQualityPct: Math.round((tmKm / totalRunKm) * 1000) / 10,
      });
    }
  }

  if (irKm > 0) {
    if (irKm > I_ABS_CAP_KM) {
      const s = sessions.find(x => x.type === "INTERVAL" || x.type === "REPETITION")!;
      warnings.push({ type: "TRIM", sessionId: s.id, trimmedFromKm: irKm, trimmedToKm: I_ABS_CAP_KM });
      s.targetDistanceKm = I_ABS_CAP_KM;
    } else if (irKm / totalRunKm > QUALITY_PCT_MAX) {
      warnings.push({
        type: "ADD_EASY_VOLUME",
        targetWeeklyKm: Math.ceil(irKm / QUALITY_PCT_MAX),
        currentQualityPct: Math.round((irKm / totalRunKm) * 1000) / 10,
      });
    }
  }

  return warnings;
}

// ── Main export ────────────────────────────────────────────────────────────

export function generateWeek(input: PlanGeneratorInput): WeekPlan {
  const {
    vdot,
    primaryGoalDistanceMeters,
    phase,
    runningDaysPerWeek,
    gymDaysPerWeek = 0,
    weeklyKm,
    startDate,
  } = input;

  const paces = trainingPaces(vdot);

  // Only VO2MAX/SPECIFIC/TAPER specialise on the primary goal.
  const isSpecializedPhase =
    phase === "VO2MAX" || phase === "SPECIFIC" || phase === "TAPER";
  const goalKey = primaryGoalDistanceMeters === 10000 ? "10000" : "21097.5";
  const profile = PEAK_PROFILE[goalKey];

  const qType = qualityTypeForPhase(phase, goalKey);
  const hasQuality = qType !== null;

  // Long run (counts as easy for distribution)
  const longRunCapKm = isSpecializedPhase ? profile.longRunCapKm : 22;
  const longRunKm =
    Math.min(Math.round(weeklyKm * 0.28 * 10) / 10, longRunCapKm);

  // Quality session km
  let qualityKm = 0;
  if (qType === "THRESHOLD") qualityKm = sizeT(weeklyKm, paces.threshold);
  else if (qType === "INTERVAL") qualityKm = sizeI(weeklyKm);
  else if (qType === "REPETITION") qualityKm = sizeR(weeklyKm);

  // Easy sessions get the remainder
  const numEasy = runningDaysPerWeek - 1 - (hasQuality ? 1 : 0);
  const easyPool = weeklyKm - qualityKm - longRunKm;
  const easyKm =
    numEasy > 0 ? Math.max(1, Math.round((easyPool / numEasy) * 10) / 10) : 0;

  // Assemble sessions from slots
  const slots = buildSlots(runningDaysPerWeek, gymDaysPerWeek, hasQuality);
  const sessions: PlannedSession[] = slots.map(({ offset, kind }) => {
    const date = shiftDate(startDate, offset);
    switch (kind) {
      case "LONG":    return mkLong(date, longRunKm, paces);
      case "QUALITY": return mkQuality(date, qType!, qualityKm, paces);
      case "EASY":    return mkEasy(date, easyKm, paces);
      case "GYM":     return mkGym(date);
    }
  });

  const validatorWarnings = validateAndMutate(sessions);

  return {
    weekStartDate: isoDate(startDate),
    sessions,
    weeklyKmTarget: weeklyKm,
    validatorWarnings,
  };
}

/**
 * Generates a rolling 4-week block. Week 4 is a recovery week (~25% volume
 * reduction). Re-generate when VDOT changes, phase changes, or prefs change.
 */
export function generate4WeekBlock(input: PlanGeneratorInput): WeekPlan[] {
  const weeks: WeekPlan[] = [];
  for (let i = 0; i < 4; i++) {
    const weekStart = shiftDate(input.startDate, i * 7);
    const km = i === 3
      ? Math.round(input.weeklyKm * 0.75 * 10) / 10  // down week
      : input.weeklyKm;
    weeks.push(generateWeek({ ...input, startDate: weekStart, weeklyKm: km }));
  }
  return weeks;
}
