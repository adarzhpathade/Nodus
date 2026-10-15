// Server environment variables, validated once. Owner: BE.
// Most values are optional so the app can run fully on mocks; use requireEnv() where a value is mandatory.
import "server-only";
import { z } from "zod";

const optional = z.string().trim().optional().transform((value) => value || undefined);

const schema = z.object({
  // Postgres (pooled for the app, unpooled for migrations)
  DATABASE_URL: optional,
  DATABASE_URL_UNPOOLED: optional,
  // Neon Auth
  NEON_AUTH_BASE_URL: optional,
  NEON_AUTH_COOKIE_SECRET: optional.refine((v) => v === undefined || v.length >= 32, {
    message: "NEON_AUTH_COOKIE_SECRET must be at least 32 characters",
  }),
  // Neon Object Storage (AWS-standard names, read automatically by the S3 client)
  AWS_ACCESS_KEY_ID: optional,
  AWS_SECRET_ACCESS_KEY: optional,
  AWS_ENDPOINT_URL_S3: optional,
  AWS_REGION: optional,
  // AI
  GOOGLE_GENERATIVE_AI_API_KEY: optional,
  GROQ_API_KEY: optional,
  // App
  CRON_SECRET: optional,
  HEALTHCHECK_SECRET: optional,
  MOCK_FEATURES: z.string().default(""),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
});

export const env = schema.parse(process.env);

export function requireEnv<K extends keyof typeof env>(key: K): NonNullable<(typeof env)[K]> {
  const value = env[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${key}. See .env.example.`);
  }
  return value as NonNullable<(typeof env)[K]>;
}
