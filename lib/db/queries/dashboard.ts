// Dashboard database queries (student + faculty). Owner: BE.
import "server-only";
import { and, asc, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  activityLog,
  aiMessages,
  assignmentSections,
  assignments,
  assignmentStatus,
  notes,
  quizAttempts,
  quizzes,
  semesters,
  studentProfiles,
  subjects,
  topics,
  units,
} from "@/lib/db/schema";

export interface StudentSemesterNotesCount {
  total: number;
  thisWeek: number;
}

/**
 * Counts student notes within the topics of a semester, both total
 * and created within the last 7 days.
 */
export async function getStudentNotesCountForSemester(
  studentId: string,
  topicIds: string[],
): Promise<StudentSemesterNotesCount> {
  if (topicIds.length === 0) {
    return { total: 0, thisWeek: 0 };
  }

  const db = getDb();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [row] = await db
    .select({
      total: count(notes.id),
      thisWeek: count(sql`CASE WHEN ${notes.createdAt} >= ${weekAgo} THEN 1 END`),
    })
    .from(notes)
    .where(and(eq(notes.ownerId, studentId), inArray(notes.topicId, topicIds)));

  return {
    total: Number(row?.total ?? 0),
    thisWeek: Number(row?.thisWeek ?? 0),
  };
}

export interface StudentQuizAttemptItem {
  score: number;
  attemptedAt: Date;
  subjectId: string;
  subjectName: string;
}

/**
 * Fetches all quiz attempts for a student in a specific semester,
 * ordered by attemptedAt ascending.
 */
export async function getStudentSemesterQuizAttempts(
  studentId: string,
  branchId: string,
  semesterNumber: number,
): Promise<StudentQuizAttemptItem[]> {
  const db = getDb();

  const rows = await db
    .select({
      score: quizAttempts.score,
      attemptedAt: quizAttempts.attemptedAt,
      subjectId: subjects.id,
      subjectName: subjects.name,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
    .innerJoin(units, eq(units.id, quizzes.unitId))
    .innerJoin(subjects, eq(subjects.id, units.subjectId))
    .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
    .where(
      and(
        eq(quizAttempts.studentId, studentId),
        eq(semesters.branchId, branchId),
        eq(semesters.number, semesterNumber),
      ),
    )
    .orderBy(asc(quizAttempts.attemptedAt));

  return rows;
}

/**
 * Fetches timestamps of activity log entries for a student since a given date.
 */
export async function getStudentActivityTimestamps(
  studentId: string,
  since: Date,
): Promise<Date[]> {
  const db = getDb();

  const rows = await db
    .select({
      createdAt: activityLog.createdAt,
    })
    .from(activityLog)
    .where(and(eq(activityLog.studentId, studentId), gte(activityLog.createdAt, since)));

  return rows.map((r) => r.createdAt);
}

export interface FacultySectionSubmissions {
  submitted: number;
  late: number;
  notSubmitted: number;
  pending: number;
}

export interface FacultyDashboardSubmissionsData {
  activeAssignmentsCount: number;
  submissionsBySection: Map<string, FacultySectionSubmissions>;
}

/**
 * Computes assignment submission totals and active assignment counts
 * across faculty-taught sections for a subject.
 */
export async function getFacultyDashboardSubmissionsData(params: {
  subjectId: string;
  sections: string[];
  branchId: string;
  semesterNumber: number;
}): Promise<FacultyDashboardSubmissionsData> {
  const db = getDb();
  const now = new Date();

  // Find assignments for this subject targeting any of the taught sections
  const matchedAssignments = await db
    .select({
      id: assignments.id,
      dueAt: assignments.dueAt,
    })
    .from(assignments)
    .innerJoin(assignmentSections, eq(assignmentSections.assignmentId, assignments.id))
    .where(
      and(
        eq(assignments.subjectId, params.subjectId),
        inArray(assignmentSections.section, params.sections),
      ),
    );

  // Deduplicate assignments
  const seenIds = new Set<string>();
  const uniqueAssignments: typeof matchedAssignments = [];
  for (const a of matchedAssignments) {
    if (!seenIds.has(a.id)) {
      seenIds.add(a.id);
      uniqueAssignments.push(a);
    }
  }

  const activeAssignmentsCount = uniqueAssignments.filter((a) => a.dueAt > now).length;
  const pastDueAssignments = uniqueAssignments.filter((a) => a.dueAt <= now);
  const pastDueIds = pastDueAssignments.map((a) => a.id);

  const submissionsBySection = new Map<string, FacultySectionSubmissions>();
  for (const sec of params.sections) {
    submissionsBySection.set(sec, { submitted: 0, late: 0, notSubmitted: 0, pending: 0 });
  }

  if (pastDueIds.length === 0) {
    return {
      activeAssignmentsCount,
      submissionsBySection,
    };
  }

  // Get target sections for past-due assignments
  const sectionTargetRows = await db
    .select({
      assignmentId: assignmentSections.assignmentId,
      section: assignmentSections.section,
    })
    .from(assignmentSections)
    .where(inArray(assignmentSections.assignmentId, pastDueIds));

  const sectionsByAssignment = new Map<string, Set<string>>();
  for (const row of sectionTargetRows) {
    let set = sectionsByAssignment.get(row.assignmentId);
    if (!set) {
      set = new Set();
      sectionsByAssignment.set(row.assignmentId, set);
    }
    set.add(row.section);
  }

  // Total students per section
  const studentCountRows = await db
    .select({
      section: studentProfiles.section,
      total: count(),
    })
    .from(studentProfiles)
    .where(
      and(
        eq(studentProfiles.branchId, params.branchId),
        eq(studentProfiles.currentSemester, params.semesterNumber),
        inArray(studentProfiles.section, params.sections),
      ),
    )
    .groupBy(studentProfiles.section);

  const studentCountMap = new Map<string, number>();
  for (const r of studentCountRows) {
    studentCountMap.set(r.section, Number(r.total));
  }

  // Marked status counts per assignment and section
  const statusCountsRows = await db
    .select({
      assignmentId: assignmentStatus.assignmentId,
      section: studentProfiles.section,
      status: assignmentStatus.status,
      count: count(),
    })
    .from(assignmentStatus)
    .innerJoin(studentProfiles, eq(studentProfiles.userId, assignmentStatus.studentId))
    .where(
      and(
        inArray(assignmentStatus.assignmentId, pastDueIds),
        eq(studentProfiles.branchId, params.branchId),
        eq(studentProfiles.currentSemester, params.semesterNumber),
        inArray(studentProfiles.section, params.sections),
      ),
    )
    .groupBy(
      assignmentStatus.assignmentId,
      studentProfiles.section,
      assignmentStatus.status,
    );

  // assignmentId -> section -> status -> count
  const statusMap = new Map<string, Map<string, Map<string, number>>>();
  for (const row of statusCountsRows) {
    let forAssignment = statusMap.get(row.assignmentId);
    if (!forAssignment) {
      forAssignment = new Map();
      statusMap.set(row.assignmentId, forAssignment);
    }
    let forSection = forAssignment.get(row.section);
    if (!forSection) {
      forSection = new Map();
      forAssignment.set(row.section, forSection);
    }
    forSection.set(row.status, Number(row.count));
  }

  // Accumulate per section across past-due assignments
  for (const assignment of pastDueAssignments) {
    const targetSections = sectionsByAssignment.get(assignment.id) ?? new Set<string>();

    for (const sec of params.sections) {
      if (!targetSections.has(sec)) continue;

      const totals = submissionsBySection.get(sec)!;
      const sectionStatuses = statusMap.get(assignment.id)?.get(sec);
      const sub = sectionStatuses?.get("submitted") ?? 0;
      const late = sectionStatuses?.get("late") ?? 0;
      const notSub = sectionStatuses?.get("not_submitted") ?? 0;
      const marked = sub + late + notSub;

      const totalStudents = studentCountMap.get(sec) ?? 0;
      const pending = Math.max(0, totalStudents - marked);

      totals.submitted += sub;
      totals.late += late;
      totals.notSubmitted += notSub;
      totals.pending += pending;
    }
  }

  return {
    activeAssignmentsCount,
    submissionsBySection,
  };
}

export interface AiTopicCountItem {
  topicId: string;
  title: string;
  questionCount: number;
}

/**
 * Top most-asked AI topics for a subject. Aggregated counts only;
 * question content and student identity are never queried (AGENTS.md §9.7, BE-9.3).
 */
export async function getTopAiTopicsForSubject(
  subjectId: string,
  limit = 6,
): Promise<AiTopicCountItem[]> {
  const db = getDb();

  const rows = await db
    .select({
      topicId: topics.id,
      title: topics.title,
      questionCount: count(aiMessages.id),
    })
    .from(topics)
    .innerJoin(units, eq(units.id, topics.unitId))
    .leftJoin(aiMessages, eq(aiMessages.topicId, topics.id))
    .where(eq(units.subjectId, subjectId))
    .groupBy(topics.id, topics.title)
    .orderBy(desc(count(aiMessages.id)), asc(topics.title))
    .limit(limit);

  return rows.map((r) => ({
    topicId: r.topicId,
    title: r.title,
    questionCount: Number(r.questionCount),
  }));
}
