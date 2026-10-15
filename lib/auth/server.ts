// Neon Auth (Managed Better Auth) server instance. Owner: BE.
// Lazy so the app still boots on mocks when auth env vars are missing.
import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { env, requireEnv } from "@/lib/env";

function createAuth() {
  return createNeonAuth({
    baseUrl: requireEnv("NEON_AUTH_BASE_URL"),
    cookies: { secret: requireEnv("NEON_AUTH_COOKIE_SECRET") },
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  instance ??= createAuth();
  return instance;
}

export function isAuthConfigured(): boolean {
  return Boolean(env.NEON_AUTH_BASE_URL && env.NEON_AUTH_COOKIE_SECRET);
}

/** Pages that require a signed-in user. Login, signup, /api/auth and static assets stay public. */
export const LOGIN_URL = "/login";
