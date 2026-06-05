/**
 * lib/db.ts
 * ---------------------------------------------------------------------------
 * Drizzle + libSQL (Turso) client singleton.
 *
 * Environment variables:
 *   TURSO_DATABASE_URL   — e.g. "libsql://your-db.turso.io"
 *                          Falls back to "file:local.db" for local dev.
 *   TURSO_AUTH_TOKEN     — required for Turso cloud; omit for local file.
 */

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

export type DB = typeof db;
