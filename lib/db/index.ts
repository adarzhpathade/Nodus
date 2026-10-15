// Drizzle client for Neon (lazy, so the app still runs on mocks without a database). Owner: BE.
import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { requireEnv } from "@/lib/env";
import * as schema from "./schema";

let client: ReturnType<typeof createDb> | undefined;

function createDb() {
  return drizzle(neon(requireEnv("DATABASE_URL")), { schema });
}

export function getDb() {
  client ??= createDb();
  return client;
}
