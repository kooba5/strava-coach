/**
 * lib/vdot.ts
 * -----------------------------------------------------------------------------
 * Deterministic implementation of Dr. Jack Daniels' VDOT system.
 *
 * VDOT is a "pseudo-VO2max" derived from a race performance (Daniels & Gilbert).
 * From a VDOT value we derive training paces (E/M/T/I/R) and equivalent race
 * times across distances.
 *
 * WHY THIS LIVES IN CODE, NOT THE PROMPT:
 * LLMs compute paces unreliably. This engine produces exact numbers; Claude's
 * job is to interpret and coach, never to do the arithmetic.
 *
 * Primary references for the formulas:
 *   - Daniels & Gilbert oxygen-cost / %VO2max equations (Daniels' Running Formula)
 *   - Velocity v (m/min) from time t (min) over distance d (m)
 * -----------------------------------------------------------------------------
 */

// ----------------------------------------------------------------------------
// Core Daniels-Gilbert math
// ----------------------------------------------------------------------------

/** Oxygen cost (ml/kg/min) of running at velocity v (meters/min). */
function oxygenCost(velocityMPerMin: number): number {
  return -4.6 + 0.182258 * velocityMPerMin + 0.000104 * velocityMPerMin ** 2;
}

/** Fraction of VO2max sustainable for a race lasting t minutes. */
function percentVO2max(tMinutes: number): number {
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * tMinutes) +
    0.2989558 * Math.exp(-0.1932605 * tMinutes)
  );
}

/**
 * Calculate VDOT from a race/time-trial performance.
 * @param distanceMeters e.g. 21097.5 for a half marathon
 * @param timeSeconds    total elapsed seconds
 */
export function vdotFromPerformance(distanceMeters: number, timeSeconds: number): number {
  const tMin = timeSeconds / 60;
  const v = distanceMeters / tMin; // m/min
  const vdot = oxygenCost(v) / percentVO2max(tMin);
  return Math.round(vdot * 10) / 10;
}

/**
 * Predict the time (seconds) for a given distance at a given VDOT.
 * Inverts the relationship via bisection — robust and dependency-free.
 */
export function predictTime(distanceMeters: number, vdot: number): number {
  let lo = 1; // seconds
  let hi = 60 * 60 * 6; // 6 hours upper bound
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const guessVdot = vdotFromPerformance(distanceMeters, mid);
    // Higher VDOT => faster => less time. If our guess VDOT is too high, we
    // gave too little time, so increase time (move lo up).
    if (guessVdot > vdot) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

// ----------------------------------------------------------------------------
// Training paces
// ----------------------------------------------------------------------------

export interface TrainingPaces {
  /** seconds per km for each zone */
  easyLow: number; // slow end of easy range
  easyHigh: number; // fast end of easy range
  marathon: number;
  threshold: number;
  interval: number;
  repetition: number;
}

/**
 * Training paces (seconds per km) for a given VDOT.
 *
 * Each zone is run at a target %VO2max. We find the velocity that produces the
 * required oxygen cost at that intensity, then convert to sec/km.
 *
 * Intensity anchors (CALIBRATED, not guessed):
 * These %VO2max fractions were fitted so that the resulting paces reproduce
 * Daniels' published 3rd-ed table values at VDOT 40, 45, and 50 (validated to
 * within ~1 s/km at VDOT 45 across all five zones). The earlier guessed anchors
 * (0.66-0.74 easy band, 0.84 M, 0.88 T, 1.0 I) ran paces ~25-35 s/km too fast —
 * notably the old 0.74 "fast easy" was effectively marathon pace, the exact
 * "black hole" Daniels warns against. See ANCHORS below and lib/vdot.calib.md.
 *
 * Fitting method: for each zone, solve for the fraction reproducing the published
 * pace at VDOT 40/45/50, then average (fractions are near-constant per zone).
 */
export const ANCHORS = {
  easy: 0.66, // single easy anchor; band is applied separately below
  marathon: 0.7847,
  threshold: 0.8375,
  interval: 0.9261,
  repetition: 1.0092,
} as const;

// Easy is a BAND, not a point. Daniels' easy spans ~15-20 s/km. We center on the
// easy anchor and apply +/- half the band. Faster end never crosses into M pace.
const EASY_BAND_SEC_PER_KM = 18;

export function trainingPaces(vdot: number): TrainingPaces {
  const secPerKmAtIntensity = (frac: number): number => {
    // velocity (m/min) such that oxygenCost(v) = frac * vdot
    // Solve quadratic 0.000104 v^2 + 0.182258 v + (-4.6 - frac*vdot) = 0
    const a = 0.000104;
    const b = 0.182258;
    const c = -4.6 - frac * vdot;
    const v = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a); // m/min
    const metersPerSec = v / 60;
    return Math.round(1000 / metersPerSec); // sec per km
  };

  const easyCenter = secPerKmAtIntensity(ANCHORS.easy);

  // NOTE on naming: lower intensity => slower pace => LARGER sec/km.
  // easyLow = slow end of the easy band (bigger number),
  // easyHigh = fast end of the easy band (smaller number).
  return {
    easyLow: easyCenter + EASY_BAND_SEC_PER_KM / 2, // slowest easy
    easyHigh: easyCenter - EASY_BAND_SEC_PER_KM / 2, // fastest easy
    marathon: secPerKmAtIntensity(ANCHORS.marathon),
    threshold: secPerKmAtIntensity(ANCHORS.threshold),
    interval: secPerKmAtIntensity(ANCHORS.interval),
    repetition: secPerKmAtIntensity(ANCHORS.repetition),
  };
}

// ----------------------------------------------------------------------------
// Heat adjustment
// ----------------------------------------------------------------------------

/** Neutral temperature (C) below which no heat penalty applies. Tunable. */
export const HEAT_NEUTRAL_C = 15;
/** Fractional pace penalty per 5C above neutral. Tunable from athlete data. */
export const HEAT_PENALTY_PER_5C = 0.015;

/**
 * Adjust an observed time for heat so it can be fairly compared / fed to VDOT.
 *
 * Heuristic: above a neutral threshold (~15C), endurance pace degrades roughly
 * 1.5% per 5C. We REMOVE that penalty to estimate the equivalent fair-weather
 * time, so a hot, slow run isn't misread as a fitness drop.
 *
 * This is intentionally conservative; tune with the athlete's own data later.
 *
 * @returns the estimated fair-weather equivalent time in seconds
 */
export function heatAdjustTime(timeSeconds: number, tempCelsius: number): number {
  if (tempCelsius <= HEAT_NEUTRAL_C) return timeSeconds;
  const degreesOver = tempCelsius - HEAT_NEUTRAL_C;
  const penaltyFraction = (degreesOver / 5) * HEAT_PENALTY_PER_5C;
  // observed = fair * (1 + penalty)  =>  fair = observed / (1 + penalty)
  return Math.round(timeSeconds / (1 + penaltyFraction));
}

// ----------------------------------------------------------------------------
// Formatting helpers
// ----------------------------------------------------------------------------

/** Format seconds-per-km as "m:ss". */
export function fmtPace(secPerKm: number): string {
  let m = Math.floor(secPerKm / 60);
  let s = Math.round(secPerKm % 60);
  if (s === 60) {
    // rounding carry: 4:00/km was rendering as "3:60"
    m += 1;
    s = 0;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Format a duration in seconds as "h:mm:ss" or "mm:ss". */
export function fmtTime(totalSeconds: number): string {
  // round first, then decompose, so a value like 3599.7s doesn't yield ":60"
  const rounded = Math.round(totalSeconds);
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Common race distances in meters
export const DISTANCES = {
  fiveK: 5000,
  tenK: 10000,
  half: 21097.5,
  marathon: 42195,
} as const;

// ----------------------------------------------------------------------------
// Convenience: full athlete snapshot from one performance
// ----------------------------------------------------------------------------

export interface VdotSnapshot {
  vdot: number;
  paces: TrainingPaces;
  predictions: {
    fiveK: number;
    tenK: number;
    half: number;
    marathon: number;
  };
}

export function snapshotFromPerformance(
  distanceMeters: number,
  timeSeconds: number,
  tempCelsius?: number,
): VdotSnapshot {
  const fairTime =
    tempCelsius != null ? heatAdjustTime(timeSeconds, tempCelsius) : timeSeconds;
  const vdot = vdotFromPerformance(distanceMeters, fairTime);
  return {
    vdot,
    paces: trainingPaces(vdot),
    predictions: {
      fiveK: predictTime(DISTANCES.fiveK, vdot),
      tenK: predictTime(DISTANCES.tenK, vdot),
      half: predictTime(DISTANCES.half, vdot),
      marathon: predictTime(DISTANCES.marathon, vdot),
    },
  };
}
