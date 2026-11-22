/**
 * Applies SQL migrations in ./drizzle to the Neon database in DATABASE_URL.
 * Runs before `next build` on Vercel; it is a no-op when DATABASE_URL is unset
 * (local dev uses the embedded database, which migrates itself).
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("migrate: DATABASE_URL not set, skipping");
    return;
  }
  await migrate(drizzle(neon(url)), { migrationsFolder: "drizzle" });
  console.log("migrate: done");
}

main().catch((error: unknown) => {
  console.error("migrate: failed", error);
  process.exit(1);
});
