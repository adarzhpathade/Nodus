// Drizzle over node-postgres, using Neon's pooled connection (DATABASE_URL).
// On Vercel Fluid compute, attachDatabasePool lets idle connections close cleanly before a function suspends.
// Lazy, so the app still runs on mocks without a database. Owner: BE.
import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { requireEnv } from "@/lib/env";
import * as schema from "./schema";

function createDb() {
  const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });
  attachDatabasePool(pool);
  return drizzle({ client: pool, schema });
}

let client: ReturnType<typeof createDb> | undefined;

export function getDb() {
  client ??= createDb();
  return client;
}
