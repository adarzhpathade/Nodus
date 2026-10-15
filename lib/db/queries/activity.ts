// Activity log helper queries (BE-4.8). Owner: BE.
import "server-only";
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
