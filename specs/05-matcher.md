# Spec 05 — Planned-vs-Actual Matcher

## Goal
Reconcile incoming Strava activities against scheduled sessions so the coach knows
what was actually done. This is the engine behind accountability.

## Inputs
- planned sessions for the week (from DB)
- Strava activities for the same window (existing `lib/strava.ts`)
- recovery data for context (from DB, spec 07)

## Matching algorithm
For each planned RUN session:
1. Find Strava activities on the same date (+/- 1 day tolerance for late-night/early runs).
2. Score candidate matches by closeness of distance and session type.
3. Classify:
   - **COMPLETED**: an activity matches the planned distance within ~15% AND the
     intensity is consistent with the prescribed type (e.g. a threshold session should
     show a sustained segment near T pace; an easy run should NOT be run at T pace).
   - **MODIFIED**: an activity exists but distance/intensity diverges materially
     (ran much shorter, or turned a quality session into an easy jog, or vice versa —
     running easy days too hard is ALSO a flag per Daniels).
   - **SKIPPED**: no matching activity and the date has passed.
   - **UNPLANNED**: an activity with no corresponding planned session.

## Heat / context normalization
Before judging pace on a session, pull temp (from Strava if present, else Garmin/weather)
and apply `heatAdjustTime`-style logic so a hot, slow run isn't misclassified as MODIFIED.

## Pattern detection (feeds the harsh-coach logic)
Maintain rolling counters the coach can reference:
- consecutive quality sessions skipped
- ratio of easy days run too hard (intensity creep)
- count of MODIFIED-down on quality sessions in the last 2-3 weeks
- whether skips correlate with RED recovery days (legit) or GREEN days (slugging)

## Output
```ts
interface ReconciledWeek {
  sessions: Array<{
    planned: PlannedSession;
    result: SessionResult | null;
    classification: "COMPLETED" | "MODIFIED" | "SKIPPED" | "PENDING";
    contextNote?: string;   // "ran 9°C hotter than ideal; pace fair"
  }>;
  patterns: {
    qualitySkipStreak: number;
    intensityCreepFlag: boolean;
    skipsOnGreenDays: number;
    skipsOnRedDays: number;
  };
}
```

## Acceptance
- A heat-degraded run is NOT classified MODIFIED for pace alone.
- A skip on a RED recovery day is flagged as legitimate; on a GREEN day as slugging.
- Output is compact enough to inject into the coach prompt.
