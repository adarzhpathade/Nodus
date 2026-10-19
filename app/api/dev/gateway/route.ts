// DEV ONLY — call any gateway method over HTTP to see exactly what pages will receive. Owner: BE.
// POST /api/dev/gateway  { "feature": "curriculum", "method": "listSubjects", "args": [3] }
// Uses the caller's session cookies and MOCK_FEATURES, so results match what a page would get.
// Returns 404 in production.
import { connection } from "next/server";
import { z } from "zod";
import { FEATURES } from "@/contracts/gateway";
import { getGateway } from "@/lib/gateway";
import { errorResponse, toErrorPayload, validationError } from "@/lib/actions/result";

const Body = z.object({
  feature: z.enum(FEATURES),
  method: z.string().min(1),
  args: z.array(z.unknown()).default([]),
});

export async function POST(request: Request) {
  await connection();
  if (process.env.NODE_ENV === "production") {
    return errorResponse({ code: "NOT_FOUND", message: "Not found." });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse(validationError(parsed.error));
  const { feature, method, args } = parsed.data;

  const api = getGateway()[feature] as unknown as Record<string, unknown>;
  const fn = api[method];
  if (typeof fn !== "function") {
    return errorResponse({ code: "NOT_FOUND", message: `${feature}.${method} is not a gateway method.` });
  }

  try {
    const data = await (fn as (...a: unknown[]) => Promise<unknown>).apply(api, args);
    return Response.json({ ok: true, data: data ?? null });
  } catch (error) {
    return errorResponse(toErrorPayload(error));
  }
}
