// Server environment variables, validated once. Owner: BE.
// Most values are optional so the app can run fully on mocks; use requireEnv() where a value is mandatory.
import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.url().optional(),
  NEON_AUTH_BASE_URL: z.url().optional(),
  NEON_AUTH_COOKIE_SECRET: z.string().min(32).optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
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
