// Assignment database queries (OFFLINE submission). Owner: BE.
import "server-only";
import { and, asc, count, desc, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  assignmentSections,
  assignments,
  assignmentStatus,
  semesters,
  studentProfiles,
  subjects,
  units,
  users,
} from "@/lib/db/schema";
import type {
  AssignmentStatus as ContractAssignmentStatus,
  StatusCounts,
} from "@/contracts/assignments";

export type AssignmentRecord = typeof assignments.$inferSelect;
export type AssignmentStatusRecord = typeof assignmentStatus.$inferSelect;

export interface StudentAssignmentRow {
  assignment: AssignmentRecord;
  subjectName: string;
  semesterNumber: number;
  branchId: string;
  unitTitle: string | null;
  createdBy: { id: string; name: string };
  sections: string[];
  status: ContractAssignmentStatus;
  marks: number | null;
  remark: string | null;
  markedAt: Date | null;
}

export interface FacultyAssignmentRow {
  assignment: AssignmentRecord;
  subjectName: string;
  semesterNumber: number;
  branchId: string;
  unitTitle: string | null;
  createdBy: { id: string; name: string };
  sections: string[];
  counts: StatusCounts;
}

/**
 * Lists assignments visible to a student for a specific semester,
 * filtered by optional subject and status.
 */
export async function listStudentAssignments(params: {
  studentId: string;
  studentSection: string;
  branchId: string;
  semesterNumber: number;
  subjectId?: string;
  status?: ContractAssignmentStatus;
}): Promise<StudentAssignmentRow[]> {
  const db = getDb();

  const statusCondition = params.status
    ? params.status === "pending"
      ? or(isNull(assignmentStatus.status), eq(assignmentStatus.status, "pending"))
      : eq(assignmentStatus.status, params.status)
    : undefined;

  const rows = await db
    .select({
      assignment: assignments,
      subjectName: subjects.name,
      semesterNumber: semesters.number,
      branchId: semesters.branchId,
      unitTitle: units.title,
      creatorId: users.id,
      creatorName: users.name,
      status: assignmentStatus.status,
      marks: assignmentStatus.marks,
      remark: assignmentStatus.remark,
      markedAt: assignmentStatus.markedAt,
    })
    .from(assignments)
    .innerJoin(assignmentSections, eq(assignmentSections.assignmentId, assignments.id))
    .innerJoin(subjects, eq(subjects.id, assignments.subjectId))
    .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
    .leftJoin(units, eq(units.id, assignments.unitId))
    .innerJoin(users, eq(users.id, assignments.createdBy))
    .leftJoin(
      assignmentStatus,
      and(
        eq(assignmentStatus.assignmentId, assignments.id),
        eq(assignmentStatus.studentId, params.studentId),
      ),
    )
    .where(
      and(
        eq(assignmentSections.section, params.studentSection),
        eq(semesters.branchId, params.branchId),
        eq(semesters.number, params.semesterNumber),
        params.subjectId ? eq(assignments.subjectId, params.subjectId) : undefined,
        statusCondition,
      ),
    )
    .orderBy(asc(assignments.dueAt));

  if (!rows.length) return [];

  const assignmentIds = [...new Set(rows.map((r) => r.assignment.id))];
  const sectionRows = await db
    .select({
      assignmentId: assignmentSections.assignmentId,
      section: assignmentSections.section,
    })
    .from(assignmentSections)
    .where(inArray(assignmentSections.assignmentId, assignmentIds));

  const sectionsByAssignment = new Map<string, string[]>();
  for (const s of sectionRows) {
    const list = sectionsByAssignment.get(s.assignmentId) ?? [];
    list.push(s.section);
    sectionsByAssignment.set(s.assignmentId, list);
  }

  return rows.map((r) => ({
    assignment: r.assignment,
    subjectName: r.subjectName,
    semesterNumber: r.semesterNumber,
    branchId: r.branchId,
    unitTitle: r.unitTitle,
    createdBy: { id: r.creatorId, name: r.creatorName },
    sections: sectionsByAssignment.get(r.assignment.id) ?? [params.studentSection],
    status: (r.status ?? "pending") as ContractAssignmentStatus,
    marks: r.marks ?? null,
    remark: r.remark ?? null,
    markedAt: r.markedAt ?? null,
  }));
}

/**
 * Finds a single assignment with student marking information.
 */
export async function findStudentAssignment(
  assignmentId: string,
  studentId: string,
): Promise<StudentAssignmentRow | null> {
  const db = getDb();

  const [row] = await db
    .select({
      assignment: assignments,
      subjectName: subjects.name,
      semesterNumber: semesters.number,
      branchId: semesters.branchId,
      unitTitle: units.title,
      creatorId: users.id,
      creatorName: users.name,
      status: assignmentStatus.status,
      marks: assignmentStatus.marks,
      remark: assignmentStatus.remark,
      markedAt: assignmentStatus.markedAt,
    })
    .from(assignments)
    .innerJoin(subjects, eq(subjects.id, assignments.subjectId))
    .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
    .leftJoin(units, eq(units.id, assignments.unitId))
    .innerJoin(users, eq(users.id, assignments.createdBy))
    .leftJoin(
      assignmentStatus,
      and(
        eq(assignmentStatus.assignmentId, assignments.id),
        eq(assignmentStatus.studentId, studentId),
      ),
    )
    .where(eq(assignments.id, assignmentId))
    .limit(1);

  if (!row) return null;

  const sectionRows = await db
    .select({ section: assignmentSections.section })
    .from(assignmentSections)
    .where(eq(assignmentSections.assignmentId, assignmentId));

  return {
    assignment: row.assignment,
    subjectName: row.subjectName,
    semesterNumber: row.semesterNumber,
    branchId: row.branchId,
    unitTitle: row.unitTitle,
    createdBy: { id: row.creatorId, name: row.creatorName },
    sections: sectionRows.map((s) => s.section),
    status: (row.status ?? "pending") as ContractAssignmentStatus,
    marks: row.marks ?? null,
    remark: row.remark ?? null,
    markedAt: row.markedAt ?? null,
  };
}

/**
 * Finds an assignment with all its details and target sections.
 */
export async function findAssignmentById(assignmentId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      assignment: assignments,
      subjectName: subjects.name,
      semesterNumber: semesters.number,
      branchId: semesters.branchId,
      unitTitle: units.title,
      creatorId: users.id,
      creatorName: users.name,
    })
    .from(assignments)
    .innerJoin(subjects, eq(subjects.id, assignments.subjectId))
    .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
    .leftJoin(units, eq(units.id, assignments.unitId))
    .innerJoin(users, eq(users.id, assignments.createdBy))
    .where(eq(assignments.id, assignmentId))
    .limit(1);

  if (!row) return null;

  const sectionRows = await db
    .select({ section: assignmentSections.section })
    .from(assignmentSections)
    .where(eq(assignmentSections.assignmentId, assignmentId));

  return {
    ...row.assignment,
    subjectName: row.subjectName,
    semesterNumber: row.semesterNumber,
    branchId: row.branchId,
    unitTitle: row.unitTitle,
    createdBy: { id: row.creatorId, name: row.creatorName },
    sections: sectionRows.map((s) => s.section),
  };
}

/**
 * Lists assignments for faculty view for a subject and target sections,
 * computing StatusCounts for each assignment.
 */
export async function listFacultyAssignments(params: {
  subjectId: string;
  sections: string[];
  branchId: string;
  semesterNumber: number;
}): Promise<FacultyAssignmentRow[]> {
  const db = getDb();

  // Find assignments for this subject that target any of the faculty sections
  const matchedRows = await db
    .select({
      assignment: assignments,
      subjectName: subjects.name,
      unitTitle: units.title,
      creatorId: users.id,
      creatorName: users.name,
    })
    .from(assignments)
    .innerJoin(assignmentSections, eq(assignmentSections.assignmentId, assignments.id))
    .innerJoin(subjects, eq(subjects.id, assignments.subjectId))
    .leftJoin(units, eq(units.id, assignments.unitId))
    .innerJoin(users, eq(users.id, assignments.createdBy))
    .where(
      and(
        eq(assignments.subjectId, params.subjectId),
        inArray(assignmentSections.section, params.sections),
      ),
    )
    .orderBy(desc(assignments.dueAt));

  if (!matchedRows.length) return [];

  // Deduplicate assignments
  const seenIds = new Set<string>();
  const uniqueAssignments: typeof matchedRows = [];
  for (const r of matchedRows) {
    if (!seenIds.has(r.assignment.id)) {
      seenIds.add(r.assignment.id);
      uniqueAssignments.push(r);
    }
  }

  const assignmentIds = uniqueAssignments.map((r) => r.assignment.id);

  // Get all target sections for each assignment
  const allSectionRows = await db
    .select({
      assignmentId: assignmentSections.assignmentId,
      section: assignmentSections.section,
    })
    .from(assignmentSections)
    .where(inArray(assignmentSections.assignmentId, assignmentIds));

  const sectionsByAssignment = new Map<string, string[]>();
  for (const s of allSectionRows) {
    const list = sectionsByAssignment.get(s.assignmentId) ?? [];
    list.push(s.section);
    sectionsByAssignment.set(s.assignmentId, list);
  }

  // Count total students per section in this branch and semester
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

  const sectionTotalMap = new Map<string, number>();
  for (const row of studentCountRows) {
    sectionTotalMap.set(row.section, Number(row.total));
  }

  // Count marked statuses per assignment and section
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
        inArray(assignmentStatus.assignmentId, assignmentIds),
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

  // Group status counts by assignmentId -> section -> status -> count
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

  return uniqueAssignments.map((r) => {
    const allSections = sectionsByAssignment.get(r.assignment.id) ?? [];
    // Only count students in sections that the assignment targets AND the query includes
    const evalSections = allSections.filter((s) => params.sections.includes(s));

    let submitted = 0;
    let late = 0;
    let notSubmitted = 0;
    let total = 0;

    for (const sec of evalSections) {
      total += sectionTotalMap.get(sec) ?? 0;
      const secStatuses = statusMap.get(r.assignment.id)?.get(sec);
      if (secStatuses) {
        submitted += secStatuses.get("submitted") ?? 0;
        late += secStatuses.get("late") ?? 0;
        notSubmitted += secStatuses.get("not_submitted") ?? 0;
      }
    }

    const marked = submitted + late + notSubmitted;
    const pending = Math.max(0, total - marked);

    return {
      assignment: r.assignment,
      subjectName: r.subjectName,
      semesterNumber: params.semesterNumber,
      branchId: params.branchId,
      unitTitle: r.unitTitle,
      createdBy: { id: r.creatorId, name: r.creatorName },
      sections: allSections,
      counts: {
        submitted,
        late,
        notSubmitted,
        pending,
        total,
      },
    };
  });
}

/**
 * Creates an assignment and associates target sections.
 */
export async function insertAssignment(params: {
  subjectId: string;
  unitId: string | null;
  title: string;
  description: string;
  dueAt: Date;
  maxMarks: number | null;
  createdBy: string;
  sections: string[];
}): Promise<AssignmentRecord & { sections: string[] }> {
  const db = getDb();
  return await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(assignments)
      .values({
        subjectId: params.subjectId,
        unitId: params.unitId,
        title: params.title,
        description: params.description,
        dueAt: params.dueAt,
        maxMarks: params.maxMarks,
        createdBy: params.createdBy,
      })
      .returning();

    if (params.sections.length > 0) {
      await tx.insert(assignmentSections).values(
        params.sections.map((section) => ({
          assignmentId: created.id,
          section,
        })),
      );
    }

    return { ...created, sections: params.sections };
  });
}

/**
 * Updates an assignment record and optionally replaces its target sections.
 */
export async function updateAssignmentRecord(
  assignmentId: string,
  params: {
    title?: string;
    description?: string;
    dueAt?: Date;
    maxMarks?: number | null;
    unitId?: string | null;
    sections?: string[];
  },
) {
  const db = getDb();
  await db.transaction(async (tx) => {
    const updateValues: Record<string, unknown> = {};
    if (params.title !== undefined) updateValues.title = params.title;
    if (params.description !== undefined) updateValues.description = params.description;
    if (params.dueAt !== undefined) updateValues.dueAt = params.dueAt;
    if (params.maxMarks !== undefined) updateValues.maxMarks = params.maxMarks;
    if (params.unitId !== undefined) updateValues.unitId = params.unitId;

    if (Object.keys(updateValues).length > 0) {
      await tx
        .update(assignments)
        .set(updateValues)
        .where(eq(assignments.id, assignmentId));
    }

    if (params.sections !== undefined) {
      await tx
        .delete(assignmentSections)
        .where(eq(assignmentSections.assignmentId, assignmentId));
      if (params.sections.length > 0) {
        await tx.insert(assignmentSections).values(
          params.sections.map((section) => ({
            assignmentId,
            section,
          })),
        );
      }
    }
  });

  return findAssignmentById(assignmentId);
}

/**
 * Deletes an assignment record by ID. Foreign keys cascade.
 */
export async function deleteAssignmentRecord(assignmentId: string): Promise<void> {
  await getDb().delete(assignments).where(eq(assignments.id, assignmentId));
}

/**
 * Fetches students in a section and their marking status for an assignment.
 */
export async function getMarkingSheetData(params: {
  assignmentId: string;
  section: string;
  branchId: string;
  semesterNumber: number;
}) {
  const db = getDb();

  const students = await db
    .select({
      studentId: users.id,
      name: users.name,
      section: studentProfiles.section,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(users.id, studentProfiles.userId))
    .where(
      and(
        eq(studentProfiles.branchId, params.branchId),
        eq(studentProfiles.currentSemester, params.semesterNumber),
        eq(studentProfiles.section, params.section),
      ),
    )
    .orderBy(asc(users.name));

  if (!students.length) {
    return {
      students: [],
      statuses: new Map<string, AssignmentStatusRecord>(),
      counts: { submitted: 0, late: 0, notSubmitted: 0, pending: 0, total: 0 },
    };
  }

  const studentIds = students.map((s) => s.studentId);
  const statusRows = await db
    .select()
    .from(assignmentStatus)
    .where(
      and(
        eq(assignmentStatus.assignmentId, params.assignmentId),
        inArray(assignmentStatus.studentId, studentIds),
      ),
    );

  const statusMap = new Map<string, AssignmentStatusRecord>();
  let submitted = 0;
  let late = 0;
  let notSubmitted = 0;

  for (const s of statusRows) {
    statusMap.set(s.studentId, s);
    if (s.status === "submitted") submitted++;
    else if (s.status === "late") late++;
    else if (s.status === "not_submitted") notSubmitted++;
  }

  const total = students.length;
  const marked = submitted + late + notSubmitted;
  const pending = Math.max(0, total - marked);

  return {
    students,
    statuses: statusMap,
    counts: {
      submitted,
      late,
      notSubmitted,
      pending,
      total,
    },
  };
}

/**
 * Upserts or clears (if pending) a student's marking status row.
 */
export async function upsertMarkingStatusRecord(params: {
  assignmentId: string;
  studentId: string;
  status: ContractAssignmentStatus;
  marks?: number | null;
  remark?: string | null;
  markedBy: string;
}): Promise<{
  studentId: string;
  status: ContractAssignmentStatus;
  marks: number | null;
  remark: string | null;
  markedAt: Date | null;
}> {
  const db = getDb();

  if (params.status === "pending") {
    await db
      .delete(assignmentStatus)
      .where(
        and(
          eq(assignmentStatus.assignmentId, params.assignmentId),
          eq(assignmentStatus.studentId, params.studentId),
        ),
      );
    return {
      studentId: params.studentId,
      status: "pending",
      marks: null,
      remark: null,
      markedAt: null,
    };
  }

  const markedAt = new Date();
  const [row] = await db
    .insert(assignmentStatus)
    .values({
      assignmentId: params.assignmentId,
      studentId: params.studentId,
      status: params.status,
      marks: params.marks ?? null,
      remark: params.remark ?? null,
      markedBy: params.markedBy,
      markedAt,
    })
    .onConflictDoUpdate({
      target: [assignmentStatus.assignmentId, assignmentStatus.studentId],
      set: {
        status: params.status,
        ...(params.marks !== undefined && { marks: params.marks }),
        ...(params.remark !== undefined && { remark: params.remark }),
        markedBy: params.markedBy,
        markedAt,
      },
    })
    .returning();

  return {
    studentId: row.studentId,
    status: row.status as ContractAssignmentStatus,
    marks: row.marks ?? null,
    remark: row.remark ?? null,
    markedAt: row.markedAt,
  };
}

/**
 * Bulk updates marking status in a single transaction.
 */
export async function bulkUpsertMarkingStatusRecord(params: {
  assignmentId: string;
  studentIds: string[];
  status: ContractAssignmentStatus;
  markedBy: string;
}): Promise<
  {
    studentId: string;
    status: ContractAssignmentStatus;
    marks: number | null;
    remark: string | null;
    markedAt: Date | null;
  }[]
> {
  const db = getDb();

  return await db.transaction(async (tx) => {
    if (params.status === "pending") {
      await tx
        .delete(assignmentStatus)
        .where(
          and(
            eq(assignmentStatus.assignmentId, params.assignmentId),
            inArray(assignmentStatus.studentId, params.studentIds),
          ),
        );
      return params.studentIds.map((studentId) => ({
        studentId,
        status: "pending" as ContractAssignmentStatus,
        marks: null,
        remark: null,
        markedAt: null,
      }));
    }

    const markedAt = new Date();
    const results: {
      studentId: string;
      status: ContractAssignmentStatus;
      marks: number | null;
      remark: string | null;
      markedAt: Date | null;
    }[] = [];

    for (const studentId of params.studentIds) {
      const [row] = await tx
        .insert(assignmentStatus)
        .values({
          assignmentId: params.assignmentId,
          studentId,
          status: params.status,
          markedBy: params.markedBy,
          markedAt,
        })
        .onConflictDoUpdate({
          target: [assignmentStatus.assignmentId, assignmentStatus.studentId],
          set: {
            status: params.status,
            markedBy: params.markedBy,
            markedAt,
          },
        })
        .returning();

      results.push({
        studentId: row.studentId,
        status: row.status as ContractAssignmentStatus,
        marks: row.marks ?? null,
        remark: row.remark ?? null,
        markedAt: row.markedAt,
      });
    }

    return results;
  });
}

export interface UpcomingAssignmentSummary {
  id: string;
  title: string;
  subjectName: string;
  unitId: string | null;
  dueAt: string;
  status: ContractAssignmentStatus;
}

/**
 * Finds the nearest upcoming assignment for a student by unit or subject,
 * with optional fallback to the most recent past assignment.
 */
export async function findNextUpcomingAssignmentForStudent(params: {
  studentId: string;
  studentSection: string;
  unitId?: string;
  subjectId?: string;
  fallbackToRecent?: boolean;
}): Promise<UpcomingAssignmentSummary | null> {
  const db = getDb();
  const now = new Date();

  const conditions = [
    eq(assignmentSections.section, params.studentSection),
  ];
  if (params.unitId) {
    conditions.push(eq(assignments.unitId, params.unitId));
  } else if (params.subjectId) {
    conditions.push(eq(assignments.subjectId, params.subjectId));
  }

  // Nearest upcoming assignment (dueAt >= now, soonest first)
  const [upcomingRow] = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      subjectName: subjects.name,
      unitId: assignments.unitId,
      dueAt: assignments.dueAt,
      status: assignmentStatus.status,
    })
    .from(assignments)
    .innerJoin(assignmentSections, eq(assignmentSections.assignmentId, assignments.id))
    .innerJoin(subjects, eq(subjects.id, assignments.subjectId))
    .leftJoin(
      assignmentStatus,
      and(
        eq(assignmentStatus.assignmentId, assignments.id),
        eq(assignmentStatus.studentId, params.studentId),
      ),
    )
    .where(and(...conditions, gte(assignments.dueAt, now)))
    .orderBy(asc(assignments.dueAt))
    .limit(1);

  if (upcomingRow) {
    return {
      id: upcomingRow.id,
      title: upcomingRow.title,
      subjectName: upcomingRow.subjectName,
      unitId: upcomingRow.unitId,
      dueAt: upcomingRow.dueAt.toISOString(),
      status: (upcomingRow.status ?? "pending") as ContractAssignmentStatus,
    };
  }

  if (!params.fallbackToRecent) {
    return null;
  }

  // Fallback to most recent past assignment (dueAt < now, most recent first)
  const [pastRow] = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      subjectName: subjects.name,
      unitId: assignments.unitId,
      dueAt: assignments.dueAt,
      status: assignmentStatus.status,
    })
    .from(assignments)
    .innerJoin(assignmentSections, eq(assignmentSections.assignmentId, assignments.id))
    .innerJoin(subjects, eq(subjects.id, assignments.subjectId))
    .leftJoin(
      assignmentStatus,
      and(
        eq(assignmentStatus.assignmentId, assignments.id),
        eq(assignmentStatus.studentId, params.studentId),
      ),
    )
    .where(and(...conditions))
    .orderBy(desc(assignments.dueAt))
    .limit(1);

  if (pastRow) {
    return {
      id: pastRow.id,
      title: pastRow.title,
      subjectName: pastRow.subjectName,
      unitId: pastRow.unitId,
      dueAt: pastRow.dueAt.toISOString(),
      status: (pastRow.status ?? "pending") as ContractAssignmentStatus,
    };
  }

  return null;
}

export interface FacultyUnitAssignmentWithPending {
  id: string;
  title: string;
  subjectName: string;
  unitId: string | null;
  dueAt: string;
  pendingCount: number;
}

/**
 * Finds the unit assignment for faculty side panel targeting a specific section,
 * returning assignment summary along with the pending marking count.
 */
export async function findUnitAssignmentWithPendingForFaculty(params: {
  unitId: string;
  section: string;
}): Promise<FacultyUnitAssignmentWithPending | null> {
  const db = getDb();
  const now = new Date();

  // Try upcoming first
  const [upcomingRow] = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      subjectName: subjects.name,
      unitId: assignments.unitId,
      dueAt: assignments.dueAt,
      semesterNumber: semesters.number,
      branchId: semesters.branchId,
    })
    .from(assignments)
    .innerJoin(assignmentSections, eq(assignmentSections.assignmentId, assignments.id))
    .innerJoin(subjects, eq(subjects.id, assignments.subjectId))
    .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
    .where(
      and(
        eq(assignments.unitId, params.unitId),
        eq(assignmentSections.section, params.section),
        gte(assignments.dueAt, now),
      ),
    )
    .orderBy(asc(assignments.dueAt))
    .limit(1);

  let targetRow = upcomingRow;
  if (!targetRow) {
    const [pastRow] = await db
      .select({
        id: assignments.id,
        title: assignments.title,
        subjectName: subjects.name,
        unitId: assignments.unitId,
        dueAt: assignments.dueAt,
        semesterNumber: semesters.number,
        branchId: semesters.branchId,
      })
      .from(assignments)
      .innerJoin(assignmentSections, eq(assignmentSections.assignmentId, assignments.id))
      .innerJoin(subjects, eq(subjects.id, assignments.subjectId))
      .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
      .where(
        and(
          eq(assignments.unitId, params.unitId),
          eq(assignmentSections.section, params.section),
        ),
      )
      .orderBy(desc(assignments.dueAt))
      .limit(1);

    targetRow = pastRow;
  }

  if (!targetRow) return null;

  // Calculate pending count for this section
  const [studentTotalRow] = await db
    .select({ total: count() })
    .from(studentProfiles)
    .where(
      and(
        eq(studentProfiles.branchId, targetRow.branchId),
        eq(studentProfiles.currentSemester, targetRow.semesterNumber),
        eq(studentProfiles.section, params.section),
      ),
    );
  const totalStudents = Number(studentTotalRow?.total ?? 0);

  const [markedCountRow] = await db
    .select({ total: count() })
    .from(assignmentStatus)
    .innerJoin(studentProfiles, eq(studentProfiles.userId, assignmentStatus.studentId))
    .where(
      and(
        eq(assignmentStatus.assignmentId, targetRow.id),
        eq(studentProfiles.section, params.section),
        inArray(assignmentStatus.status, ["submitted", "late", "not_submitted"]),
      ),
    );
  const markedStudents = Number(markedCountRow?.total ?? 0);
  const pendingCount = Math.max(0, totalStudents - markedStudents);

  return {
    id: targetRow.id,
    title: targetRow.title,
    subjectName: targetRow.subjectName,
    unitId: targetRow.unitId,
    dueAt: targetRow.dueAt.toISOString(),
    pendingCount,
  };
}

