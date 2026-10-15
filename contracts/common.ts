// C-00 — Shared primitives used by every contract. Owner: BE (FE reviews).
//
// Conventions (apply to every contract):
// - IDs are UUID strings.
// - Dates/times cross the boundary as ISO-8601 strings (`Timestamp`); calendar days as `YYYY-MM-DD` (`DateOnly`).
// - Percentages are numbers 0–100 (rounded to 1 decimal by the backend).
// - Gateway methods return data directly and throw `GatewayError` on failure.
// - Server actions never throw: they return `ActionResult<T>`.
import { z } from "zod";

// ---------- Scalars ----------

export const Id = z.uuid();
export type Id = z.infer<typeof Id>;

export const Timestamp = z.iso.datetime({ offset: true });
export type Timestamp = z.infer<typeof Timestamp>;

export const DateOnly = z.iso.date();
export type DateOnly = z.infer<typeof DateOnly>;

export const Percent = z.number().min(0).max(100);
export type Percent = z.infer<typeof Percent>;

export const SemesterNumber = z.number().int().min(1).max(8);
export type SemesterNumber = z.infer<typeof SemesterNumber>;

/** Single uppercase letter, e.g. "A". */
export const Section = z.string().regex(/^[A-Z]$/, "Section must be a single uppercase letter");
export type Section = z.infer<typeof Section>;

export const Role = z.enum(["student", "faculty"]);
export type Role = z.infer<typeof Role>;

// ---------- Progress status ----------

/** not_started = 0% · low = 1–39% · in_progress = 40–75% · mastered = >75% (AGENTS.md §6.7). */
export const ProgressStatus = z.enum(["not_started", "low", "in_progress", "mastered"]);
export type ProgressStatus = z.infer<typeof ProgressStatus>;

// ---------- Pagination ----------

export const PageQuery = z.object({
  cursor: z.string().nullish(),
  limit: z.number().int().min(1).max(100).default(20),
});
export type PageQuery = z.input<typeof PageQuery>;

export const paginated = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });
export type Paginated<T> = { items: T[]; nextCursor: string | null };

// ---------- Errors ----------

export const ErrorCode = z.enum([
  "UNAUTHENTICATED", // not signed in
  "FORBIDDEN", // signed in but not allowed (wrong role, other student's data, other section)
  "NOT_FOUND",
  "VALIDATION", // input failed Zod validation (see fieldErrors)
  "CONFLICT", // e.g. deleting a topic that still has notes
  "LOCKED", // future semester
  "RATE_LIMITED", // AI free-tier quota hit (see retryAfterSeconds)
  "AI_UNAVAILABLE", // AI provider error or not configured
  "NOT_IMPLEMENTED", // real backend for this feature not built yet — use MOCK_FEATURES
  "INTERNAL",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorPayload = z.object({
  code: ErrorCode,
  message: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  retryAfterSeconds: z.number().int().optional(),
});
export type ErrorPayload = z.infer<typeof ErrorPayload>;

/** Thrown by gateway implementations (real and mock). Actions and routes convert it to ErrorPayload. */
export class GatewayError extends Error {
  readonly code: ErrorCode;
  readonly fieldErrors?: Record<string, string[]>;
  readonly retryAfterSeconds?: number;

  constructor(
    code: ErrorCode,
    message: string,
    extra: { fieldErrors?: Record<string, string[]>; retryAfterSeconds?: number } = {},
  ) {
    super(message);
    this.name = "GatewayError";
    this.code = code;
    this.fieldErrors = extra.fieldErrors;
    this.retryAfterSeconds = extra.retryAfterSeconds;
  }

  toPayload(): ErrorPayload {
    return {
      code: this.code,
      message: this.message,
      ...(this.fieldErrors && { fieldErrors: this.fieldErrors }),
      ...(this.retryAfterSeconds !== undefined && { retryAfterSeconds: this.retryAfterSeconds }),
    };
  }
}

/** Return type of every server action. */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ErrorPayload };

// ---------- Small shared shapes ----------

export const PersonRef = z.object({ id: Id, name: z.string() });
export type PersonRef = z.infer<typeof PersonRef>;

/** Where something sits in the syllabus — used for breadcrumbs and labels. */
export const SyllabusLocation = z.object({
  semesterNumber: SemesterNumber,
  subjectId: Id,
  subjectName: z.string(),
  unitId: Id,
  unitTitle: z.string(),
  topicId: Id.nullable(),
  topicTitle: z.string().nullable(),
});
export type SyllabusLocation = z.infer<typeof SyllabusLocation>;

// ---------- Stub helper ----------

/**
 * Builds an API object whose every method throws NOT_IMPLEMENTED.
 * Used by the real gateway for features not built yet, and as the mock placeholder until FE fills mocks.
 */
export function unimplementedApi<T extends object>(feature: string, source: "real" | "mock"): T {
  return new Proxy({} as T, {
    get(_target, method) {
      if (typeof method !== "string" || method === "then") return undefined;
      return async () => {
        throw new GatewayError(
          "NOT_IMPLEMENTED",
          source === "real"
            ? `${feature}.${method} is not implemented in the backend yet. Add "${feature}" to MOCK_FEATURES.`
            : `${feature}.${method} has no mock yet (mocks/gateway.ts).`,
        );
      };
    },
  });
}
