// Activity log helper queries (BE-4.8). Owner: BE.
import "server-only";
import { and, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { activityLog, type activityTypeEnum } from "@/lib/db/schema";

export type ActivityType = (typeof activityTypeEnum.enumValues)[number];

export interface LogActivityInput {
  studentId: string;
  type: ActivityType;
  refId?: string | null;
}

/**
 * Inserts one row per study action into the activity log (AGENTS.md §7).
 * Powers the activity heatmap and streaks.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  await getDb().insert(activityLog).values({
    studentId: input.studentId,
    type: input.type,
    refId: input.refId ?? null,
  });
}

/**
 * Inserts an activity log entry only if no identical action for this refId
 * was logged within the given time window in milliseconds.
 */
export async function logActivityThrottled(
  input: LogActivityInput,
  windowMs: number,
): Promise<void> {
  if (input.refId) {
    const since = new Date(Date.now() - windowMs);
    const [existing] = await getDb()
      .select({ id: activityLog.id })
      .from(activityLog)
      .where(
        and(
          eq(activityLog.studentId, input.studentId),
          eq(activityLog.type, input.type),
          eq(activityLog.refId, input.refId),
          gte(activityLog.createdAt, since),
        ),
      )
      .limit(1);

    if (existing) return;
  }
  await logActivity(input);
}
