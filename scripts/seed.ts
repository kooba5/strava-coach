/**
 * scripts/seed.ts
 * ---------------------------------------------------------------------------
 * Seeds the database with the seed athlete (VDOT 45) and goals from spec 02.
 *
 * Usage:
 *   npm run db:seed
 *
 * Idempotent — uses upsertAthlete so it's safe to run multiple times.
 */

import { runMigrations } from "../lib/migrate";
import { upsertAthlete } from "../lib/queries";
import { SEED_GOALS } from "../lib/goalFeasibility";

const SEED_ATHLETE_ID = "seed_athlete";

async function main() {
  console.log("Running migrations…");
  await runMigrations();

  console.log("Seeding athlete…");
  await upsertAthlete({
    id: SEED_ATHLETE_ID,
    vdot: 45,
    vdotUpdatedAt: new Date().toISOString(),
    prefs: JSON.stringify({
      runningDaysPerWeek: 4,
      gymDaysPerWeek: 2,
      tone: "harsh",
    }),
    goalsJson: JSON.stringify(SEED_GOALS),
    createdAt: new Date().toISOString(),
  });

  console.log(`✓ Athlete '${SEED_ATHLETE_ID}' seeded at VDOT 45 with ${SEED_GOALS.length} goals.`);
  console.log("  Goals:", SEED_GOALS.map((g) => g.label).join(", "));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
