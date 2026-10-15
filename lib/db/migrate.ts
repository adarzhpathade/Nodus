// Applies pending migrations over the DIRECT connection and prints the real Postgres error on failure
// (drizzle-kit migrate hides errors behind its spinner). Run: `npm run db:migrate`. Owner: BE.
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED;
  if (!url) throw new Error("DATABASE_URL_UNPOOLED is not set (run `neon env pull`).");

  const pool = new Pool({ connectionString: url });
  try {
    console.log(`Migrating branch "${process.env.NEON_BRANCH ?? "unknown"}"…`);
    await migrate(drizzle({ client: pool }), { migrationsFolder: "lib/db/migrations" });
    console.log("✓ Migrations applied");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  console.error("✗ Migration failed:", error instanceof Error ? error.message.split("\n")[0] : error, cause && `\n  cause: ${cause}`);
  process.exit(1);
});
