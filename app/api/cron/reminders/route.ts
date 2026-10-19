// GET /api/cron/reminders — creates deadline reminder notifications (2 days before, same day). Owner: BE.
// Called by Vercel Cron with `Authorization: Bearer ${CRON_SECRET}`. Real logic lands in BE-8.7.
import { connection } from "next/server";
import { isMocked } from "@/lib/gateway";
import { errorResponse, toErrorPayload } from "@/lib/actions/result";
import { createDeadlineReminders } from "@/lib/db/queries/notifications";

export async function GET(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return errorResponse({ code: "UNAUTHENTICATED", message: "Invalid cron secret." });
  }

  if (isMocked("notifications")) return Response.json({ ok: true, mocked: true, created: 0 });

  try {
    const result = await createDeadlineReminders();
    return Response.json({ ok: true, created: result.created });
  } catch (error) {
    console.error("[nodus] cron reminders failed:", error);
    return errorResponse(toErrorPayload(error));
  }
}
