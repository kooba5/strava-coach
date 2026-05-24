# VDOT Pace Calibration Note

## Problem (found in build session 1)
The original `trainingPaces` used guessed %VO2max intensity anchors
(easy band 0.66-0.74, M 0.84, T 0.88, I 1.0, R = interval/1.05). These produced
paces ~25-35 s/km FASTER than Daniels' published 3rd-edition tables across all
zones at VDOT 40/45/50.

Critically: race PREDICTIONS were accurate (1:40:04 half -> predicted 1:39:57),
which proved the oxygen-cost inversion was correct and the error was purely in the
anchor fractions — a calibration bug, not a formula bug.

The worst offender was the 0.74 "fast easy" anchor, which produced ~5:19/km at
VDOT 45 — effectively marathon pace. Running easy days that fast is the "black hole"
Daniels explicitly warns against, and for a 3-4 day/week athlete with no easy-volume
buffer it's a direct route to the overtraining the app is meant to prevent.

## Fix
Fitted each zone's fraction to reproduce the published table pace at VDOT 40, 45,
and 50, then averaged (fractions are near-constant per zone). Result validated to
within ~1 s/km at VDOT 45.

### Fitted anchors (now in `ANCHORS` in lib/vdot.ts)
| Zone | Old (guessed) | New (fitted) |
|---|---|---|
| Easy | 0.66-0.74 band | 0.66 center, +/- 9 s/km band |
| Marathon | 0.84 | 0.7847 |
| Threshold | 0.88 | 0.8375 |
| Interval | 1.0 | 0.9261 |
| Repetition | interval/1.05 | 0.9261 -> own anchor 1.0092 |

### Calibrated output (matches Daniels tables)
| VDOT | Easy | M | T | I | R |
|---|---|---|---|---|---|
| 40 | 6:15-6:33 | 5:35 | 5:18 | 4:53 | 4:34 |
| 45 | 5:41-5:59 | 5:05 | 4:49 | 4:27 | 4:09 |
| 50 | 5:13-5:31 | 4:40 | 4:26 | 4:05 | 3:48 |

## Reference targets used (published Daniels, metric, approx)
VDOT 45: E ~5:50, M ~5:05, T ~4:50, I ~4:27, R ~4:09.

## Remaining notes
- Fitted fractions drift slightly across VDOT (e.g. easy 0.674->0.660->0.647). The
  average is within day-to-day tolerance; a VDOT-dependent fraction would be false
  precision. Revisit only if a wider VDOT range (e.g. 35 or 60) shows >5 s/km error.
- Easy is intentionally a BAND (EASY_BAND_SEC_PER_KM = 18), per Daniels' teaching that
  zones span a range. Run the slow end when fatigued/hot, the fast end when fresh.
- Heat adjustment constants (HEAT_NEUTRAL_C, HEAT_PENALTY_PER_5C) remain separately
  tunable from real athlete hot-vs-cool paired efforts.
