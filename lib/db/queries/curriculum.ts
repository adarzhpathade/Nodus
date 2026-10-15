// Curriculum read queries (semesters, subjects, prerequisites, units, topics). Owner: BE.
import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { semesters, subjectPrerequisites, subjects, topics, units } from "@/lib/db/schema";

export async function listSemestersForBranch(branchId: string) {
  return getDb().select().from(semesters).where(eq(semesters.branchId, branchId)).orderBy(asc(semesters.number));
}

const subjectColumns = {
  id: subjects.id,
  code: subjects.code,
  name: subjects.name,
  order: subjects.order,
  semesterNumber: semesters.number,
  branchId: semesters.branchId,
};

export type SubjectRecord = { id: string; code: string; name: string; order: number; semesterNumber: number; branchId: string };

export async function listSubjectsForSemester(branchId: string, semesterNumber: number): Promise<SubjectRecord[]> {
  return getDb()
    .select(subjectColumns)
    .from(subjects)
    .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
    .where(and(eq(semesters.branchId, branchId), eq(semesters.number, semesterNumber)))
    .orderBy(asc(subjects.order));
}

export async function findSubject(subjectId: string): Promise<SubjectRecord | null> {
  const [row] = await getDb()
    .select(subjectColumns)
    .from(subjects)
    .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
    .where(eq(subjects.id, subjectId))
    .limit(1);
  return row ?? null;
}

/** Prerequisite edges whose dependent subject is in the given semester (prerequisites may be earlier). */
export async function listPrerequisitesForSemester(branchId: string, semesterNumber: number) {
  const subjectIds = (await listSubjectsForSemester(branchId, semesterNumber)).map((s) => s.id);
  if (!subjectIds.length) return [];
  return getDb().select().from(subjectPrerequisites).where(inArray(subjectPrerequisites.subjectId, subjectIds));
}

export async function listUnitsWithTopics(subjectId: string) {
  const db = getDb();
  const unitRows = await db.select().from(units).where(eq(units.subjectId, subjectId)).orderBy(asc(units.order));
  if (!unitRows.length) return [];
  const topicRows = await db
    .select()
    .from(topics)
    .where(inArray(topics.unitId, unitRows.map((u) => u.id)))
    .orderBy(asc(topics.order));
  return unitRows.map((unit) => ({ unit, topics: topicRows.filter((t) => t.unitId === unit.id) }));
}

export async function findUnitWithSubject(unitId: string) {
  const db = getDb();
  const [unit] = await db.select().from(units).where(eq(units.id, unitId)).limit(1);
  if (!unit) return null;
  const subject = await findSubject(unit.subjectId);
  if (!subject) return null;
  const topicRows = await db.select().from(topics).where(eq(topics.unitId, unitId)).orderBy(asc(topics.order));
  return { unit, subject, topics: topicRows };
}
