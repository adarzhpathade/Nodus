// Helpers shared by server actions and route handlers. Owner: BE.
// (Not a "use server" file — only the feature files in this folder are.)
import "server-only";
import { z } from "zod";
import { GatewayError, type ActionResult, type ErrorCode, type ErrorPayload } from "@/contracts/common";

export function toErrorPayload(error: unknown): ErrorPayload {
  if (error instanceof GatewayError) return error.toPayload();
  console.error("[nodus] unexpected error", error);
  return { code: "INTERNAL", message: "Something went wrong. Please try again." };
}

export function validationError(error: z.ZodError): ErrorPayload {
  const fieldErrors: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(z.flattenError(error).fieldErrors)) {
    if (Array.isArray(messages) && messages.length) fieldErrors[field] = messages;
  }
  return { code: "VALIDATION", message: "Please check the highlighted fields.", fieldErrors };
}

/** Validate input with the contract schema, run the gateway call, never throw. */
export async function runAction<S extends z.ZodType, T>(
  schema: S,
  input: unknown,
  fn: (data: z.output<S>) => Promise<T>,
): Promise<ActionResult<T>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: validationError(parsed.error) };
  try {
    return { ok: true, data: await fn(parsed.data) };
  } catch (error) {
    return { ok: false, error: toErrorPayload(error) };
  }
}

/** For actions with no input. */
export async function runQuery<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    return { ok: false, error: toErrorPayload(error) };
  }
}

const HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  CONFLICT: 409,
  LOCKED: 423,
  RATE_LIMITED: 429,
  AI_UNAVAILABLE: 503,
  NOT_IMPLEMENTED: 501,
  INTERNAL: 500,
};

/** JSON error response for route handlers: `{ error: ErrorPayload }`. */
export function errorResponse(payload: ErrorPayload): Response {
  const headers: HeadersInit = payload.retryAfterSeconds ? { "Retry-After": String(payload.retryAfterSeconds) } : {};
  return Response.json({ error: payload }, { status: HTTP_STATUS[payload.code], headers });
}
