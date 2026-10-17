// Raw database queries for progress calculation. Owner: BE.
// Strictly scopes student queries to the authenticated student (never leaks other students' notes).
// Faculty queries fetch aggregated counts only, never note content (AGENTS.md §6.4).
import "server-only";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  notes,
  quizAttempts,
  quizzes,
  semesters,
  studentProfiles,
  subjects,
  topics,
  units,
  users,
} from "@/lib/db/schema";
import { findSubject, findUnitWithSubject } from "./curriculum";

export interface TopicRawItem {
  id: string;
  unitId: string;
  title: string;
  order: number;
}

export interface UnitRawItem {
  id: string;
  subjectId: string;
  title: string;
  order: number;
  topics: TopicRawItem[];
}

export interface SubjectRawItem {
  id: string;
  code: string;
  name: string;
  order: number;
  units: UnitRawItem[];
}

export interface StudentSemesterProgressRawData {
  semesterId: string;
  semesterNumber: number;
  subjects: SubjectRawItem[];
  noteCountsByTopic: Map<string, number>;
  bestQuizScoreByTopic: Map<string, number>;
  quizScoresByUnit: Map<string, number[]>;
}

/**
 * Fetches note counts per topic for a specific student.
 * Always scoped to studentId — never reads any note content or other students' notes.
 */
export async function getStudentNoteCountsByTopic(
  studentId: string,
  topicIds: string[],
): Promise<Map<string, number>> {
  if (topicIds.length === 0) return new Map();

  const rows = await getDb()
    .select({
      topicId: notes.topicId,
      noteCount: count(notes.id),
    })
    .from(notes)
    .where(and(eq(notes.ownerId, studentId), inArray(notes.topicId, topicIds)))
    .groupBy(notes.topicId);

  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.topicId, Number(r.noteCount));
  }
  return map;
}

/**
 * Fetches quiz scores for a specific student across a set of units.
 * Returns unit scores array and best score per topic.
 */
export async function getStudentQuizDataForUnits(
  studentId: string,
  unitIds: string[],
): Promise<{
  unitScoresByUnit: Map<string, number[]>;
  bestQuizScoreByTopic: Map<string, number>;
}> {
  if (unitIds.length === 0) {
    return {
      unitScoresByUnit: new Map(),
      bestQuizScoreByTopic: new Map(),
    };
  }

  const rows = await getDb()
    .select({
      score: quizAttempts.score,
      unitId: quizzes.unitId,
      topicId: quizzes.topicId,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
    .where(and(eq(quizAttempts.studentId, studentId), inArray(quizzes.unitId, unitIds)));

  const unitScoresByUnit = new Map<string, number[]>();
  const topicScores = new Map<string, number[]>();

  for (const r of rows) {
    const uList = unitScoresByUnit.get(r.unitId) ?? [];
    uList.push(r.score);
    unitScoresByUnit.set(r.unitId, uList);

    if (r.topicId) {
      const tList = topicScores.get(r.topicId) ?? [];
      tList.push(r.score);
      topicScores.set(r.topicId, tList);
    }
  }

  const bestQuizScoreByTopic = new Map<string, number>();
  for (const [topicId, scores] of topicScores.entries()) {
    if (scores.length > 0) {
      bestQuizScoreByTopic.set(topicId, Math.max(...scores));
    }
  }

  return { unitScoresByUnit, bestQuizScoreByTopic };
}

/**
 * Fetches all curriculum nodes (subjects, units, topics) and student inputs (notes, quizzes)
 * for a student in a specific semester.
 */
export async function getStudentSemesterProgressRawData(
  studentId: string,
  branchId: string,
  semesterNumber: number,
): Promise<StudentSemesterProgressRawData | null> {
  const db = getDb();

  const [semester] = await db
    .select()
    .from(semesters)
    .where(and(eq(semesters.branchId, branchId), eq(semesters.number, semesterNumber)))
    .limit(1);

  if (!semester) return null;

  const subjectRows = await db
    .select({
      id: subjects.id,
      code: subjects.code,
      name: subjects.name,
      order: subjects.order,
    })
    .from(subjects)
    .where(eq(subjects.semesterId, semester.id))
    .orderBy(asc(subjects.order));

  const subjectIds = subjectRows.map((s) => s.id);
  const unitRows =
    subjectIds.length > 0
      ? await db
          .select({
            id: units.id,
            subjectId: units.subjectId,
            title: units.title,
            order: units.order,
          })
          .from(units)
          .where(inArray(units.subjectId, subjectIds))
          .orderBy(asc(units.order))
      : [];

  const unitIds = unitRows.map((u) => u.id);
  const topicRows =
    unitIds.length > 0
      ? await db
          .select({
            id: topics.id,
            unitId: topics.unitId,
            title: topics.title,
            order: topics.order,
          })
          .from(topics)
          .where(inArray(topics.unitId, unitIds))
          .orderBy(asc(topics.order))
      : [];

  const allTopicIds = topicRows.map((t) => t.id);

  // Fetch student notes count (strictly scoped to studentId)
  const noteCountsByTopic = await getStudentNoteCountsByTopic(studentId, allTopicIds);

  // Fetch student quiz attempts
  const { unitScoresByUnit, bestQuizScoreByTopic } = await getStudentQuizDataForUnits(
    studentId,
    unitIds,
  );

  // Assemble hierarchy
  const subjectsWithUnits: SubjectRawItem[] = subjectRows.map((s) => {
    const sUnits = unitRows.filter((u) => u.subjectId === s.id);
    const unitsWithTopics: UnitRawItem[] = sUnits.map((u) => ({
      id: u.id,
      subjectId: u.subjectId,
      title: u.title,
      order: u.order,
      topics: topicRows.filter((t) => t.unitId === u.id),
    }));
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      order: s.order,
      units: unitsWithTopics,
    };
  });

  return {
    semesterId: semester.id,
    semesterNumber: semester.number,
    subjects: subjectsWithUnits,
    noteCountsByTopic,
    bestQuizScoreByTopic,
    quizScoresByUnit: unitScoresByUnit,
  };
}

export interface StudentUnitProgressRawData {
  unit: {
    id: string;
    subjectId: string;
    title: string;
    order: number;
  };
  subject: {
    id: string;
    name: string;
    code: string;
    semesterNumber: number;
    branchId: string;
  };
  topics: TopicRawItem[];
  noteCountsByTopic: Map<string, number>;
  bestQuizScoreByTopic: Map<string, number>;
  quizScores: number[];
}

/**
 * Fetches raw inputs for a single unit for a student.
 */
export async function getStudentUnitProgressRawData(
  studentId: string,
  unitId: string,
): Promise<StudentUnitProgressRawData | null> {
  const unitInfo = await findUnitWithSubject(unitId);
  if (!unitInfo) return null;

  const topicIds = unitInfo.topics.map((t) => t.id);
  const noteCountsByTopic = await getStudentNoteCountsByTopic(studentId, topicIds);
  const { unitScoresByUnit, bestQuizScoreByTopic } = await getStudentQuizDataForUnits(studentId, [
    unitId,
  ]);

  return {
    unit: {
      id: unitInfo.unit.id,
      subjectId: unitInfo.unit.subjectId,
      title: unitInfo.unit.title,
      order: unitInfo.unit.order,
    },
    subject: {
      id: unitInfo.subject.id,
      name: unitInfo.subject.name,
      code: unitInfo.subject.code,
      semesterNumber: unitInfo.subject.semesterNumber,
      branchId: unitInfo.subject.branchId,
    },
    topics: unitInfo.topics.map((t) => ({
      id: t.id,
      unitId: t.unitId,
      title: t.title,
      order: t.order,
    })),
    noteCountsByTopic,
    bestQuizScoreByTopic,
    quizScores: unitScoresByUnit.get(unitId) ?? [],
  };
}

export interface StudentRosterItem {
  id: string;
  name: string;
  section: string;
}

export interface SectionProgressRawData {
  subject: {
    id: string;
    name: string;
    code: string;
    semesterNumber: number;
    branchId: string;
  };
  units: UnitRawItem[];
  roster: StudentRosterItem[];
  // studentId -> topicId -> noteCount
  noteCountsByStudentAndTopic: Map<string, Map<string, number>>;
  // studentId -> topicId -> bestScore
  bestTopicScoresByStudent: Map<string, Map<string, number>>;
  // studentId -> unitId -> scores[]
  unitScoresByStudentAndUnit: Map<string, Map<string, number[]>>;
}

/**
 * Fetches raw aggregated data for all students in a section for a subject.
 * Note content is NEVER selected; only note counts are retrieved.
 */
export async function getSectionProgressRawData(
  subjectId: string,
  section: string,
): Promise<SectionProgressRawData | null> {
  const subject = await findSubject(subjectId);
  if (!subject) return null;

  const db = getDb();

  // Find units and topics
  const unitRows = await db
    .select({
      id: units.id,
      subjectId: units.subjectId,
      title: units.title,
      order: units.order,
    })
    .from(units)
    .where(eq(units.subjectId, subjectId))
    .orderBy(asc(units.order));

  const unitIds = unitRows.map((u) => u.id);
  const topicRows =
    unitIds.length > 0
      ? await db
          .select({
            id: topics.id,
            unitId: topics.unitId,
            title: topics.title,
            order: topics.order,
          })
          .from(topics)
          .where(inArray(topics.unitId, unitIds))
          .orderBy(asc(topics.order))
      : [];

  const allTopicIds = topicRows.map((t) => t.id);

  // Roster: students in this section and branch
  const rosterRows = await db
    .select({
      id: users.id,
      name: users.name,
      section: studentProfiles.section,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(users.id, studentProfiles.userId))
    .where(
      and(
        eq(studentProfiles.branchId, subject.branchId),
        eq(studentProfiles.currentSemester, subject.semesterNumber),
        eq(studentProfiles.section, section),
      ),
    );

  const studentIds = rosterRows.map((r) => r.id);

  const noteCountsByStudentAndTopic = new Map<string, Map<string, number>>();
  const bestTopicScoresByStudent = new Map<string, Map<string, number>>();
  const unitScoresByStudentAndUnit = new Map<string, Map<string, number[]>>();

  if (studentIds.length > 0 && allTopicIds.length > 0) {
    // Aggregated note counts only
    const noteCountRows = await db
      .select({
        studentId: notes.ownerId,
        topicId: notes.topicId,
        cnt: count(notes.id),
      })
      .from(notes)
      .where(and(inArray(notes.ownerId, studentIds), inArray(notes.topicId, allTopicIds)))
      .groupBy(notes.ownerId, notes.topicId);

    for (const r of noteCountRows) {
      let stMap = noteCountsByStudentAndTopic.get(r.studentId);
      if (!stMap) {
        stMap = new Map();
        noteCountsByStudentAndTopic.set(r.studentId, stMap);
      }
      stMap.set(r.topicId, Number(r.cnt));
    }
  }

  if (studentIds.length > 0 && unitIds.length > 0) {
    // Quiz attempts for students in this section
    const quizRows = await db
      .select({
        studentId: quizAttempts.studentId,
        score: quizAttempts.score,
        unitId: quizzes.unitId,
        topicId: quizzes.topicId,
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
      .where(and(inArray(quizAttempts.studentId, studentIds), inArray(quizzes.unitId, unitIds)));

    for (const q of quizRows) {
      // Unit scores
      let uMap = unitScoresByStudentAndUnit.get(q.studentId);
      if (!uMap) {
        uMap = new Map();
        unitScoresByStudentAndUnit.set(q.studentId, uMap);
      }
      const uScores = uMap.get(q.unitId) ?? [];
      uScores.push(q.score);
      uMap.set(q.unitId, uScores);

      // Topic scores
      if (q.topicId) {
        let tMap = bestTopicScoresByStudent.get(q.studentId);
        if (!tMap) {
          tMap = new Map();
          bestTopicScoresByStudent.set(q.studentId, tMap);
        }
        const currentBest = tMap.get(q.topicId);
        if (currentBest === undefined || q.score > currentBest) {
          tMap.set(q.topicId, q.score);
        }
      }
    }
  }

  const unitsWithTopics: UnitRawItem[] = unitRows.map((u) => ({
    id: u.id,
    subjectId: u.subjectId,
    title: u.title,
    order: u.order,
    topics: topicRows.filter((t) => t.unitId === u.id),
  }));

  return {
    subject,
    units: unitsWithTopics,
    roster: rosterRows,
    noteCountsByStudentAndTopic,
    bestTopicScoresByStudent,
    unitScoresByStudentAndUnit,
  };
}
