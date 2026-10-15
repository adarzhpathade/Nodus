import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Backend internals that frontend code must never import (see AGENTS.md §5.3).
const backendOnly = [
  { group: ["@/lib/db", "@/lib/db/*"], message: "FE must not import the database. Use @/lib/gateway or @/lib/actions." },
  { group: ["@/lib/ai", "@/lib/ai/*"], message: "FE must not import AI internals. Use @/lib/gateway, @/lib/actions or /api routes." },
  { group: ["@/lib/progress", "@/lib/progress/*"], message: "FE must not import progress logic. Read progress from the gateway." },
  { group: ["@/lib/server-gateway", "@/lib/server-gateway/*"], message: "FE must use @/lib/gateway, never the real implementation directly." },
  {
    // FE may use the browser auth client (sign-in / sign-up / sign-out) — nothing else in lib/auth.
    regex: "^@/lib/auth(?!/client$)(/.*)?$",
    message: "FE must not import auth internals. Use @/lib/auth/client, @/lib/actions or the gateway.",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["components/**", "hooks/**", "stores/**", "mocks/**", "app/**"],
    ignores: ["app/api/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: backendOnly }],
    },
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "lib/db/migrations/**",
  ]),
]);

export default eslintConfig;
