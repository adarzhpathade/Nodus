// Database queries supporting Graph View (prerequisites, deadlines). Owner: BE.
import "server-only";
import { inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { subjectPrerequisites } from "@/lib/db/schema";

export interface PrerequisiteEdgeRecord {
  subjectId: string;
  prerequisiteSubjectId: string;
}

/**
 * Returns prerequisite pairs for a given list of subject IDs.
 */
export async function listPrerequisitesForSubjects(
  subjectIds: string[],
): Promise<PrerequisiteEdgeRecord[]> {
  if (subjectIds.length === 0) return [];

  const rows = await getDb()
    .select({
      subjectId: subjectPrerequisites.subjectId,
      prerequisiteSubjectId: subjectPrerequisites.prerequisiteSubjectId,
    })
    .from(subjectPrerequisites)
    .where(inArray(subjectPrerequisites.subjectId, subjectIds));

  return rows;
}
