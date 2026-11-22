import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { logger } from "@/lib/logger";
import * as schema from "./schema";

/**
 * One database handle for the app.
 * - Production / Vercel: Neon serverless Postgres over HTTP (DATABASE_URL).
 * - Local dev and e2e without DATABASE_URL: an embedded PGlite database in .data/,
 *   migrated automatically on first use.
 * PGlite exposes the same Drizzle query API, so it is typed as the Neon database.
 */
export type Db = NeonHttpDatabase<typeof schema>;

let dbPromise: Promise<Db> | null = null;

async function createLocalDb(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = process.env.PGLITE_DIR ?? ".data/pglite";
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  logger.warn("using local embedded database", { dataDir });
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  if (!dbPromise) {
    const url = process.env.DATABASE_URL;
    dbPromise = url
      ? Promise.resolve(drizzleNeon(neon(url), { schema }))
      : createLocalDb();
  }
  return dbPromise;
}

/** Tests inject their own (in-memory) database. */
export function setDbForTests(db: Db): void {
  dbPromise = Promise.resolve(db);
}

export { schema };
