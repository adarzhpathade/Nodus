// Real AssignmentsApi (C-08). Implements BE-8.1 … BE-8.5. Owner: BE.
import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { GatewayError } from "@/contracts/common";
import {
  Assignment,
  AssignmentsApi,
  BulkMarkInput,
  CreateAssignmentInput,
  FacultyAssignmentSummary,
  ListAssignmentsQuery,
  ListMyAssignmentsQuery,
  MarkingRow,
  MarkingSheet,
  MarkStudentInput,
  SectionTracker,
  StatusCounts,
  StudentAssignment,
  TrackerStudentRow,
  UpdateAssignmentInput,
  AssignmentIdInput,
} from "@/contracts/assignments";
import { assertSemesterOpen, requireFaculty, requireFacultyTeaches, requireStudent } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { assignmentStatus, studentProfiles, users } from "@/lib/db/schema";
import { findSubject, findUnitById } from "@/lib/db/queries/curriculum";
import { findUserWithProfile } from "@/lib/db/queries/users";
import { calculateSubjectProgress, calculateUnitProgress } from "@/lib/progress";
import { getSectionProgressRawData } from "@/lib/db/queries/progress";
import {
  bulkUpsertMarkingStatusRecord,
  deleteAssignmentRecord,
  findAssignmentById,
  findStudentAssignment,
  getMarkingSheetData,
  insertAssignment,
  listFacultyAssignments,
  listStudentAssignments,
  updateAssignmentRecord,
  upsertMarkingStatusRecord,
  type FacultyAssignmentRow,
  type StudentAssignmentRow,
} from "@/lib/db/queries/assignments";
import {
  notifyBulkStatusMarked,
  notifyNewAssignment,
  notifyStatusMarked,
} from "@/lib/db/queries/notifications";

function toStudentAssignment(row: StudentAssignmentRow): StudentAssignment {
  return {
    id: row.assignment.id,
    subjectId: row.assignment.subjectId,
    subjectName: row.subjectName,
    unitId: row.assignment.unitId,
    unitTitle: row.unitTitle,
    title: row.assignment.title,
    description: row.assignment.description,
    dueAt: row.assignment.dueAt.toISOString(),
    sections: row.sections,
    maxMarks: row.assignment.maxMarks,
    createdBy: {
      id: row.createdBy.id,
      name: row.createdBy.name,
    },
    createdAt: row.assignment.createdAt.toISOString(),
    status: row.status,
    marks: row.marks,
    remark: row.remark,
    markedAt: row.markedAt ? row.markedAt.toISOString() : null,
  };
}

function toFacultyAssignmentSummary(row: FacultyAssignmentRow): FacultyAssignmentSummary {
  return {
    id: row.assignment.id,
    subjectId: row.assignment.subjectId,
    subjectName: row.subjectName,
    unitId: row.assignment.unitId,
    unitTitle: row.unitTitle,
    title: row.assignment.title,
    description: row.assignment.description,
    dueAt: row.assignment.dueAt.toISOString(),
    sections: row.sections,
    maxMarks: row.assignment.maxMarks,
    createdBy: {
      id: row.createdBy.id,
      name: row.createdBy.name,
    },
    createdAt: row.assignment.createdAt.toISOString(),
    counts: row.counts,
  };
}

function addStatusCounts(a: StatusCounts, b: StatusCounts): StatusCounts {
  return {
    submitted: a.submitted + b.submitted,
    late: a.late + b.late,
    notSubmitted: a.notSubmitted + b.notSubmitted,
    pending: a.pending + b.pending,
    total: a.total + b.total,
  };
}

export const assignmentsApi: AssignmentsApi = {
  // ---------- Student (BE-8.4) ----------

  async listMyAssignments(query: ListMyAssignmentsQuery): Promise<StudentAssignment[]> {
    const student = await requireStudent();
    const parsed = ListMyAssignmentsQuery.parse(query);
    assertSemesterOpen(student, parsed.semesterNumber);

    if (parsed.subjectId) {
      const subject = await findSubject(parsed.subjectId);
      if (!subject || subject.branchId !== student.profile.branch.id) {
        throw new GatewayError("NOT_FOUND", "Subject not found.");
      }
      assertSemesterOpen(student, subject.semesterNumber);
    }

    const rows = await listStudentAssignments({
      studentId: student.user.id,
      studentSection: student.profile.section,
      branchId: student.profile.branch.id,
      semesterNumber: parsed.semesterNumber,
      subjectId: parsed.subjectId,
      status: parsed.status,
    });

    return rows.map(toStudentAssignment);
  },

  async getMyAssignment(assignmentId: string): Promise<StudentAssignment> {
    const student = await requireStudent();
    const found = await findStudentAssignment(assignmentId, student.user.id);

    if (!found || !found.sections.includes(student.profile.section)) {
      throw new GatewayError("NOT_FOUND", "Assignment not found.");
    }

    if (found.branchId !== student.profile.branch.id) {
      throw new GatewayError("NOT_FOUND", "Assignment not found.");
    }

    assertSemesterOpen(student, found.semesterNumber);

    return toStudentAssignment(found);
  },

  // ---------- Faculty (BE-8.1) ----------

  async listAssignments(query: ListAssignmentsQuery): Promise<FacultyAssignmentSummary[]> {
    const faculty = await requireFaculty();
    const parsed = ListAssignmentsQuery.parse(query);
    await requireFacultyTeaches(parsed.subjectId, parsed.section);

    const subject = await findSubject(parsed.subjectId);
    if (!subject) throw new GatewayError("NOT_FOUND", "Subject not found.");

    const teachingSections = faculty.teaching
      .filter((t) => t.subjectId === parsed.subjectId)
      .map((t) => t.section);

    const sections = parsed.section ? [parsed.section] : teachingSections;

    const rows = await listFacultyAssignments({
      subjectId: parsed.subjectId,
      sections,
      branchId: subject.branchId,
      semesterNumber: subject.semesterNumber,
    });

    return rows.map(toFacultyAssignmentSummary);
  },

  async createAssignment(input: CreateAssignmentInput): Promise<Assignment> {
    const parsed = CreateAssignmentInput.parse(input);
    const faculty = await requireFacultyTeaches(parsed.subjectId);

    for (const sec of parsed.sections) {
      await requireFacultyTeaches(parsed.subjectId, sec);
    }

    const subject = await findSubject(parsed.subjectId);
    if (!subject) throw new GatewayError("NOT_FOUND", "Subject not found.");

    let unitTitle: string | null = null;
    if (parsed.unitId) {
      const unit = await findUnitById(parsed.unitId);
      if (!unit || unit.subjectId !== parsed.subjectId) {
        throw new GatewayError("VALIDATION", "That unit belongs to another subject.");
      }
      unitTitle = unit.title;
    }

    const created = await insertAssignment({
      subjectId: parsed.subjectId,
      unitId: parsed.unitId ?? null,
      title: parsed.title,
      description: parsed.description ?? "",
      dueAt: new Date(parsed.dueAt),
      maxMarks: parsed.maxMarks ?? null,
      createdBy: faculty.user.id,
      sections: parsed.sections,
    });

    await notifyNewAssignment({
      assignmentId: created.id,
      assignmentTitle: created.title,
      subjectName: subject.name,
      branchId: subject.branchId,
      semesterNumber: subject.semesterNumber,
      sections: parsed.sections,
    });

    return {
      id: created.id,
      subjectId: created.subjectId,
      subjectName: subject.name,
      unitId: created.unitId,
      unitTitle,
      title: created.title,
      description: created.description,
      dueAt: created.dueAt.toISOString(),
      sections: created.sections,
      maxMarks: created.maxMarks,
      createdBy: {
        id: faculty.user.id,
        name: faculty.user.name,
      },
      createdAt: created.createdAt.toISOString(),
    };
  },

  async updateAssignment(input: UpdateAssignmentInput): Promise<Assignment> {
    const parsed = UpdateAssignmentInput.parse(input);

    const existing = await findAssignmentById(parsed.assignmentId);
    if (!existing) throw new GatewayError("NOT_FOUND", "Assignment not found.");
    await requireFacultyTeaches(existing.subjectId);

    for (const sec of existing.sections) {
      await requireFacultyTeaches(existing.subjectId, sec);
    }

    if (parsed.sections) {
      for (const sec of parsed.sections) {
        await requireFacultyTeaches(existing.subjectId, sec);
      }
    }

    if (parsed.unitId) {
      const unit = await findUnitById(parsed.unitId);
      if (!unit || unit.subjectId !== existing.subjectId) {
        throw new GatewayError("VALIDATION", "That unit belongs to another subject.");
      }
    }

    const updated = await updateAssignmentRecord(parsed.assignmentId, {
      title: parsed.title,
      description: parsed.description,
      dueAt: parsed.dueAt ? new Date(parsed.dueAt) : undefined,
      maxMarks: parsed.maxMarks,
      unitId: parsed.unitId,
      sections: parsed.sections,
    });

    if (!updated) throw new GatewayError("NOT_FOUND", "Assignment not found.");

    return {
      id: updated.id,
      subjectId: updated.subjectId,
      subjectName: updated.subjectName,
      unitId: updated.unitId,
      unitTitle: updated.unitTitle,
      title: updated.title,
      description: updated.description,
      dueAt: updated.dueAt.toISOString(),
      sections: updated.sections,
      maxMarks: updated.maxMarks,
      createdBy: {
        id: updated.createdBy.id,
        name: updated.createdBy.name,
      },
      createdAt: updated.createdAt.toISOString(),
    };
  },

  async deleteAssignment(input: AssignmentIdInput): Promise<void> {
    const parsed = AssignmentIdInput.parse(input);

    const existing = await findAssignmentById(parsed.assignmentId);
    if (!existing) throw new GatewayError("NOT_FOUND", "Assignment not found.");
    await requireFacultyTeaches(existing.subjectId);

    for (const sec of existing.sections) {
      await requireFacultyTeaches(existing.subjectId, sec);
    }

    await deleteAssignmentRecord(parsed.assignmentId);
  },

  // ---------- Marking (BE-8.2, BE-8.3) ----------

  async getMarkingSheet(input: { assignmentId: string; section: string }): Promise<MarkingSheet> {
    await requireFaculty();
    const assignment = await findAssignmentById(input.assignmentId);
    if (!assignment) throw new GatewayError("NOT_FOUND", "Assignment not found.");

    await requireFacultyTeaches(assignment.subjectId, input.section);
    if (!assignment.sections.includes(input.section)) {
      throw new GatewayError("VALIDATION", "This assignment isn't set for that section.");
    }

    const data = await getMarkingSheetData({
      assignmentId: input.assignmentId,
      section: input.section,
      branchId: assignment.branchId,
      semesterNumber: assignment.semesterNumber,
    });

    const rows: MarkingRow[] = data.students.map((student) => {
      const statusRow = data.statuses.get(student.studentId);
      return {
        studentId: student.studentId,
        name: student.name,
        section: student.section,
        status: (statusRow?.status ?? "pending") as MarkingRow["status"],
        marks: statusRow?.marks ?? null,
        remark: statusRow?.remark ?? null,
        markedAt: statusRow?.markedAt ? statusRow.markedAt.toISOString() : null,
      };
    });

    return {
      assignment: {
        id: assignment.id,
        subjectId: assignment.subjectId,
        subjectName: assignment.subjectName,
        unitId: assignment.unitId,
        unitTitle: assignment.unitTitle,
        title: assignment.title,
        description: assignment.description,
        dueAt: assignment.dueAt.toISOString(),
        sections: assignment.sections,
        maxMarks: assignment.maxMarks,
        createdBy: {
          id: assignment.createdBy.id,
          name: assignment.createdBy.name,
        },
        createdAt: assignment.createdAt.toISOString(),
      },
      section: input.section,
      rows,
      counts: data.counts,
    };
  },

  async markStudent(input: MarkStudentInput): Promise<MarkingRow> {
    const faculty = await requireFaculty();
    const parsed = MarkStudentInput.parse(input);

    const assignment = await findAssignmentById(parsed.assignmentId);
    if (!assignment) throw new GatewayError("NOT_FOUND", "Assignment not found.");
    await requireFacultyTeaches(assignment.subjectId);

    const student = await findUserWithProfile(parsed.studentId);
    if (
      !student ||
      !student.profile ||
      !assignment.sections.includes(student.profile.section)
    ) {
      throw new GatewayError("VALIDATION", "That student isn't in a section this assignment targets.");
    }

    await requireFacultyTeaches(assignment.subjectId, student.profile.section);

    if (
      parsed.marks != null &&
      assignment.maxMarks != null &&
      parsed.marks > assignment.maxMarks
    ) {
      throw new GatewayError("VALIDATION", `Marks can't exceed ${assignment.maxMarks}.`, {
        fieldErrors: { marks: ["Too high"] },
      });
    }

    const updated = await upsertMarkingStatusRecord({
      assignmentId: parsed.assignmentId,
      studentId: parsed.studentId,
      status: parsed.status,
      marks: parsed.marks,
      remark: parsed.remark,
      markedBy: faculty.user.id,
    });

    if (parsed.status !== "pending") {
      await notifyStatusMarked({
        studentId: parsed.studentId,
        assignmentId: parsed.assignmentId,
        assignmentTitle: assignment.title,
        subjectName: assignment.subjectName,
        status: parsed.status,
        marks: parsed.marks,
        maxMarks: assignment.maxMarks,
        remark: parsed.remark,
      });
    }

    return {
      studentId: updated.studentId,
      name: student.user.name,
      section: student.profile.section,
      status: updated.status,
      marks: updated.marks,
      remark: updated.remark,
      markedAt: updated.markedAt ? updated.markedAt.toISOString() : null,
    };
  },

  async bulkMark(input: BulkMarkInput): Promise<MarkingRow[]> {
    const faculty = await requireFaculty();
    const parsed = BulkMarkInput.parse(input);

    const assignment = await findAssignmentById(parsed.assignmentId);
    if (!assignment) throw new GatewayError("NOT_FOUND", "Assignment not found.");
    await requireFacultyTeaches(assignment.subjectId);

    const studentMap = new Map<string, { name: string; section: string }>();

    for (const studentId of parsed.studentIds) {
      const student = await findUserWithProfile(studentId);
      if (
        !student ||
        !student.profile ||
        !assignment.sections.includes(student.profile.section)
      ) {
        throw new GatewayError(
          "VALIDATION",
          "That student isn't in a section this assignment targets.",
        );
      }
      await requireFacultyTeaches(assignment.subjectId, student.profile.section);
      studentMap.set(studentId, {
        name: student.user.name,
        section: student.profile.section,
      });
    }

    const results = await bulkUpsertMarkingStatusRecord({
      assignmentId: parsed.assignmentId,
      studentIds: parsed.studentIds,
      status: parsed.status,
      markedBy: faculty.user.id,
    });

    if (parsed.status !== "pending") {
      await notifyBulkStatusMarked({
        studentIds: parsed.studentIds,
        assignmentId: parsed.assignmentId,
        assignmentTitle: assignment.title,
        subjectName: assignment.subjectName,
        status: parsed.status,
      });
    }

    return results.map((r) => ({
      studentId: r.studentId,
      name: studentMap.get(r.studentId)!.name,
      section: studentMap.get(r.studentId)!.section,
      status: r.status,
      marks: r.marks,
      remark: r.remark,
      markedAt: r.markedAt ? r.markedAt.toISOString() : null,
    }));
  },

  // ---------- Section Tracker (BE-8.5) ----------

  async getSectionTracker(input: { subjectId: string; section: string }): Promise<SectionTracker> {
    await requireFaculty();
    await requireFacultyTeaches(input.subjectId, input.section);

    const subject = await findSubject(input.subjectId);
    if (!subject) throw new GatewayError("NOT_FOUND", "Subject not found.");

    const assignmentRows = await listFacultyAssignments({
      subjectId: input.subjectId,
      sections: [input.section],
      branchId: subject.branchId,
      semesterNumber: subject.semesterNumber,
    });

    const assignments = assignmentRows.map(toFacultyAssignmentSummary);

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
          eq(studentProfiles.branchId, subject.branchId),
          eq(studentProfiles.currentSemester, subject.semesterNumber),
          eq(studentProfiles.section, input.section),
        ),
      )
      .orderBy(asc(users.name));

    const studentIds = students.map((s) => s.studentId);

    // Get all assignment statuses for these assignments & students
    const assignmentIds = assignments.map((a) => a.id);
    const statusMap = new Map<string, string>(); // `${assignmentId}:${studentId}` -> status

    if (assignmentIds.length > 0 && studentIds.length > 0) {
      const statusRows = await db
        .select({
          assignmentId: assignmentStatus.assignmentId,
          studentId: assignmentStatus.studentId,
          status: assignmentStatus.status,
        })
        .from(assignmentStatus)
        .where(
          and(
            inArray(assignmentStatus.assignmentId, assignmentIds),
            inArray(assignmentStatus.studentId, studentIds),
          ),
        );

      for (const s of statusRows) {
        statusMap.set(`${s.assignmentId}:${s.studentId}`, s.status);
      }
    }

    const rawProgress = await getSectionProgressRawData(input.subjectId, input.section);

    const progressMap = new Map<string, number>();
    for (const student of students) {
      if (!rawProgress || rawProgress.units.length === 0) {
        progressMap.set(student.studentId, 0);
        continue;
      }

      const stNotes = rawProgress.noteCountsByStudentAndTopic.get(student.studentId);
      const stBestScores = rawProgress.bestTopicScoresByStudent.get(student.studentId);
      const stUnitScores = rawProgress.unitScoresByStudentAndUnit.get(student.studentId);

      const unitProgresses = rawProgress.units.map((unit) => {
        const quizScores = stUnitScores?.get(unit.id) ?? [];
        return calculateUnitProgress({
          unitId: unit.id,
          topics: unit.topics.map((t) => ({
            topicId: t.id,
            title: t.title,
            order: t.order,
            noteCount: stNotes?.get(t.id) ?? 0,
            bestQuizScore: stBestScores?.get(t.id) ?? null,
          })),
          quizScores,
        });
      });

      const subjectProg = calculateSubjectProgress({
        subjectId: input.subjectId,
        units: unitProgresses.map((u, i) => ({
          id: u.unitId,
          title: rawProgress.units[i]?.title ?? "",
          percent: u.percent,
          status: u.status,
        })),
      });

      progressMap.set(student.studentId, subjectProg.percent);
    }

    const studentRows: TrackerStudentRow[] = students.map((student) => {
      let submitted = 0;
      let late = 0;
      let notSubmitted = 0;
      let pending = 0;

      for (const a of assignments) {
        const st = statusMap.get(`${a.id}:${student.studentId}`);
        if (st === "submitted") submitted++;
        else if (st === "late") late++;
        else if (st === "not_submitted") notSubmitted++;
        else pending++;
      }

      return {
        studentId: student.studentId,
        name: student.name,
        counts: {
          submitted,
          late,
          notSubmitted,
          pending,
          total: assignments.length,
        },
        progressPercent: progressMap.get(student.studentId) ?? 0,
      };
    });

    const emptyCounts: StatusCounts = {
      submitted: 0,
      late: 0,
      notSubmitted: 0,
      pending: 0,
      total: 0,
    };
    const totalCounts = assignments.reduce(
      (total, a) => addStatusCounts(total, a.counts),
      emptyCounts,
    );

    return {
      subjectId: input.subjectId,
      section: input.section,
      assignments,
      students: studentRows,
      counts: totalCounts,
    };
  },
};
