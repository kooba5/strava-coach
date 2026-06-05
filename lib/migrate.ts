/**
 * lib/migrate.ts
 * ---------------------------------------------------------------------------
 * Runs pending Drizzle migrations against the configured database.
 * Call once on app startup (e.g. in a route handler or init script).
 *
 * Usage:
 *   import { runMigrations } from "@/lib/migrate";
 *   await runMigrations();
 */

import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./db";

export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: "./drizzle" });
}
