// GET /api/cron/reminders — creates deadline reminder notifications (2 days before, same day). Owner: BE.
// Called by Vercel Cron with `Authorization: Bearer ${CRON_SECRET}`. Real logic lands in BE-8.7.
import { connection } from "next/server";
import { isMocked } from "@/lib/gateway";
import { errorResponse } from "@/lib/actions/result";

export async function GET(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return errorResponse({ code: "UNAUTHENTICATED", message: "Invalid cron secret." });
  }

  if (isMocked("notifications")) return Response.json({ ok: true, mocked: true, created: 0 });

  return errorResponse({ code: "NOT_IMPLEMENTED", message: "Deadline reminders are not built yet (BE-8.7)." });
}
