// Curriculum read queries (semesters, subjects, prerequisites, units, topics). Owner: BE.
import "server-only";
import { and, asc, count, eq, inArray, max } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { notes, semesters, subjectPrerequisites, subjects, topics, units } from "@/lib/db/schema";

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

export async function findUnitById(unitId: string) {
  const [unit] = await getDb().select().from(units).where(eq(units.id, unitId)).limit(1);
  return unit ?? null;
}

export async function findTopicById(topicId: string) {
  const [row] = await getDb()
    .select({
      id: topics.id,
      unitId: topics.unitId,
      title: topics.title,
      order: topics.order,
      createdAt: topics.createdAt,
      updatedAt: topics.updatedAt,
      subjectId: units.subjectId,
    })
    .from(topics)
    .innerJoin(units, eq(units.id, topics.unitId))
    .where(eq(topics.id, topicId))
    .limit(1);
  return row ?? null;
}

export async function insertUnit(subjectId: string, title: string) {
  const db = getDb();
  const [maxRow] = await db
    .select({ maxOrder: max(units.order) })
    .from(units)
    .where(eq(units.subjectId, subjectId));
  const nextOrder = maxRow?.maxOrder !== null && maxRow?.maxOrder !== undefined ? maxRow.maxOrder + 1 : 0;
  const [created] = await db
    .insert(units)
    .values({ subjectId, title, order: nextOrder })
    .returning();
  return created;
}

export async function renameUnit(unitId: string, title: string) {
  const [updated] = await getDb()
    .update(units)
    .set({ title, updatedAt: new Date() })
    .where(eq(units.id, unitId))
    .returning();
  return updated ?? null;
}

export async function deleteUnit(unitId: string) {
  await getDb().delete(units).where(eq(units.id, unitId));
}

export async function insertTopic(unitId: string, title: string) {
  const db = getDb();
  const [maxRow] = await db
    .select({ maxOrder: max(topics.order) })
    .from(topics)
    .where(eq(topics.unitId, unitId));
  const nextOrder = maxRow?.maxOrder !== null && maxRow?.maxOrder !== undefined ? maxRow.maxOrder + 1 : 0;
  const [created] = await db
    .insert(topics)
    .values({ unitId, title, order: nextOrder })
    .returning();
  return created;
}

export async function renameTopic(topicId: string, title: string) {
  const [updated] = await getDb()
    .update(topics)
    .set({ title, updatedAt: new Date() })
    .where(eq(topics.id, topicId))
    .returning();
  return updated ?? null;
}

export async function deleteTopic(topicId: string) {
  await getDb().delete(topics).where(eq(topics.id, topicId));
}

export async function listUnitIds(subjectId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ id: units.id })
    .from(units)
    .where(eq(units.subjectId, subjectId))
    .orderBy(asc(units.order));
  return rows.map((r) => r.id);
}

export async function listTopicIds(unitId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ id: topics.id })
    .from(topics)
    .where(eq(topics.unitId, unitId))
    .orderBy(asc(topics.order));
  return rows.map((r) => r.id);
}

export async function setUnitOrder(subjectId: string, orderedIds: string[]) {
  const db = getDb();
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(units)
        .set({ order: i, updatedAt: new Date() })
        .where(and(eq(units.id, orderedIds[i]), eq(units.subjectId, subjectId)));
    }
  });
  return db
    .select()
    .from(units)
    .where(eq(units.subjectId, subjectId))
    .orderBy(asc(units.order));
}

export async function setTopicOrder(unitId: string, orderedIds: string[]) {
  const db = getDb();
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(topics)
        .set({ order: i, updatedAt: new Date() })
        .where(and(eq(topics.id, orderedIds[i]), eq(topics.unitId, unitId)));
    }
  });
  return db
    .select()
    .from(topics)
    .where(eq(topics.unitId, unitId))
    .orderBy(asc(topics.order));
}

export async function countNotesInTopic(topicId: string): Promise<number> {
  const [res] = await getDb()
    .select({ count: count() })
    .from(notes)
    .where(eq(notes.topicId, topicId));
  return Number(res?.count ?? 0);
}

export async function countNotesInUnit(unitId: string): Promise<number> {
  const [res] = await getDb()
    .select({ count: count() })
    .from(notes)
    .innerJoin(topics, eq(topics.id, notes.topicId))
    .where(eq(topics.unitId, unitId));
  return Number(res?.count ?? 0);
}

