// End-to-end check of every Neon service. Owner: BE.
// Open in development. In production it requires the `x-health-secret` header to match HEALTHCHECK_SECRET.
import { randomUUID } from "node:crypto";
import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { getAuth } from "@/lib/auth/server";
import { getStorage } from "@/lib/storage";

type Check = { ok: boolean; detail: string };

async function run(fn: () => Promise<string>): Promise<Check> {
  try {
    return { ok: true, detail: await fn() };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

function allowed(request: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const secret = process.env.HEALTHCHECK_SECRET;
  return Boolean(secret) && request.headers.get("x-health-secret") === secret;
}

export async function GET(request: Request) {
  await connection(); // always run at request time, never prerender
  if (!allowed(request)) return new Response("Not found", { status: 404 });

  const postgres = await run(async () => {
    const db = getDb();
    const version = await db.execute<{ version: string }>(sql`select version()`);
    const vector = await db.execute<{ extversion: string }>(
      sql`select extversion from pg_extension where extname = 'vector'`,
    );
    const pgvector = vector.rows[0]?.extversion;
    if (!pgvector) throw new Error("pgvector extension is not enabled (run npm run db:migrate)");
    return `${version.rows[0]?.version.split(" ").slice(0, 2).join(" ")} · pgvector ${pgvector}`;
  });

  const auth = await run(async () => {
    const { data, error } = await getAuth().getSession();
    if (error) throw new Error(error.message ?? "getSession failed");
    return data?.user ? `signed in as ${data.user.email}` : "reachable · no session on this request";
  });

  const storage = await run(async () => {
    const files = getStorage();
    const key = `healthcheck/${randomUUID()}.txt`;
    const body = `nodus healthcheck ${new Date().toISOString()}`;
    await files.upload(key, body, { contentType: "text/plain" });
    try {
      const url = await files.url(key, { expiresIn: 60 });
      const fetched = await fetch(url).then((r) => r.text());
      if (fetched !== body) throw new Error("presigned download returned different content");
    } finally {
      await files.delete(key);
    }
    if (await files.exists(key)) throw new Error("object still exists after delete");
    return "upload → presigned download → delete OK";
  });

  const checks = { postgres, auth, storage };
  const ok = Object.values(checks).every((check) => check.ok);
  return Response.json({ ok, checks }, { status: ok ? 200 : 503 });
}
