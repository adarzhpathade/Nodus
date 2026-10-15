import type {
  Assignment,
  AssignmentsApi,
  AssignmentStatus,
  MarkingRow,
  StatusCounts,
  StudentAssignment,
} from "@/contracts/assignments";
import type { UpcomingDeadline } from "@/contracts/graph";
import { assertTeaches, clone, fail, mockRequest, requireFaculty, requireStudent, type FacultyActor } from "../context";
import { mockId } from "../fixtures/ids";
import { DEMO_STUDENT, students } from "../fixtures/people";
import { sectionStudents, sourceFor, subjectProgress } from "../progress";
import { statusKey, type MockStore } from "../store";
import { assertSemesterOpen, findSubject, findUnit, nowIso } from "./shared";

// ---------- Helpers (also used by graph + dashboard mocks) ----------

export function statusOfStudent(store: MockStore, assignmentId: string, studentId: string) {
  const record = store.statuses.get(statusKey(assignmentId, studentId));
  return {
    status: (record?.status ?? "pending") as AssignmentStatus,
    marks: record?.marks ?? null,
    remark: record?.remark ?? null,
    markedAt: record?.markedAt ?? null,
  };
}

export function toStudentAssignment(store: MockStore, assignment: Assignment, studentId: string): StudentAssignment {
  return { ...assignment, ...statusOfStudent(store, assignment.id, studentId) };
}

export function toDeadline(store: MockStore, assignment: Assignment, studentId: string): UpcomingDeadline {
  return {
    id: assignment.id,
    title: assignment.title,
    subjectName: assignment.subjectName,
    unitId: assignment.unitId,
    dueAt: assignment.dueAt,
    status: statusOfStudent(store, assignment.id, studentId).status,
  };
}

/** Assignments a student can see (their section). */
export function visibleAssignments(store: MockStore, section: string) {
  return store.assignments.filter((a) => a.sections.includes(section));
}

/** Soonest not-yet-due assignment matching `filter`, for hover cards and side panels. */
export function nextDeadline(store: MockStore, studentId: string, section: string, filter: (a: Assignment) => boolean) {
  const now = new Date().toISOString();
  const next = visibleAssignments(store, section)
    .filter((a) => filter(a) && a.dueAt > now)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  return next ? toDeadline(store, next, studentId) : null;
}

export function countsFor(store: MockStore, assignment: Assignment, sections: string[]): StatusCounts {
  const counts: StatusCounts = { submitted: 0, late: 0, notSubmitted: 0, pending: 0, total: 0 };
  for (const student of students.filter((s) => sections.includes(s.profile.section))) {
    const { status } = statusOfStudent(store, assignment.id, student.user.id);
    counts.total++;
    if (status === "submitted") counts.submitted++;
    else if (status === "late") counts.late++;
    else if (status === "not_submitted") counts.notSubmitted++;
    else counts.pending++;
  }
  return counts;
}

export function addCounts(a: StatusCounts, b: StatusCounts): StatusCounts {
  return {
    submitted: a.submitted + b.submitted,
    late: a.late + b.late,
    notSubmitted: a.notSubmitted + b.notSubmitted,
    pending: a.pending + b.pending,
    total: a.total + b.total,
  };
}

const EMPTY_COUNTS: StatusCounts = { submitted: 0, late: 0, notSubmitted: 0, pending: 0, total: 0 };

function findAssignment(store: MockStore, assignmentId: string) {
  const assignment = store.assignments.find((a) => a.id === assignmentId);
  if (!assignment) throw fail("NOT_FOUND", "Assignment not found.");
  return assignment;
}

function facultyAssignment(store: MockStore, faculty: FacultyActor, assignmentId: string) {
  const assignment = findAssignment(store, assignmentId);
  assertTeaches(faculty, assignment.subjectId);
  return assignment;
}

function assertSections(faculty: FacultyActor, subjectId: string, sections: string[]) {
  const teaching = assertTeaches(faculty, subjectId);
  const outside = sections.filter((s) => !teaching.sections.includes(s));
  if (outside.length) throw fail("FORBIDDEN", `You don't teach section ${outside.join(", ")}.`);
}

function markingRow(store: MockStore, assignmentId: string, studentId: string): MarkingRow {
  const student = students.find((s) => s.user.id === studentId)!;
  return { studentId, name: student.user.name, section: student.profile.section, ...statusOfStudent(store, assignmentId, studentId) };
}

function setStatus(
  store: MockStore,
  assignment: Assignment,
  studentId: string,
  input: { status: AssignmentStatus; marks?: number | null; remark?: string | null },
) {
  const student = students.find((s) => s.user.id === studentId);
  if (!student || !assignment.sections.includes(student.profile.section)) {
    throw fail("VALIDATION", "That student isn't in a section this assignment targets.");
  }
  if (input.marks != null && assignment.maxMarks != null && input.marks > assignment.maxMarks) {
    throw fail("VALIDATION", `Marks can't exceed ${assignment.maxMarks}.`, { fieldErrors: { marks: ["Too high"] } });
  }
  const key = statusKey(assignment.id, studentId);
  if (input.status === "pending") {
    store.statuses.delete(key);
    return;
  }
  const previous = store.statuses.get(key);
  store.statuses.set(key, {
    status: input.status,
    marks: input.marks === undefined ? (previous?.marks ?? null) : input.marks,
    remark: input.remark === undefined ? (previous?.remark ?? null) : input.remark,
    markedAt: nowIso(),
  });

  if (studentId === DEMO_STUDENT.user.id && previous?.status !== input.status) {
    const label = { submitted: "Submitted", late: "Late", not_submitted: "Not submitted" }[input.status];
    store.notifications.unshift({
      id: mockId(`notification:marked:${assignment.id}:${Date.now()}`),
      userId: studentId,
      type: "status_marked",
      title: `${assignment.title} marked: ${label}`,
      body: assignment.subjectName,
      target: { kind: "assignment", assignmentId: assignment.id },
      read: false,
      createdAt: nowIso(),
    });
  }
}

// ---------- API ----------

export const assignmentsMock: AssignmentsApi = {
  async listMyAssignments(query) {
    const store = await mockRequest();
    const { user, profile } = await requireStudent(store);
    assertSemesterOpen(profile, query.semesterNumber);
    return clone(
      visibleAssignments(store, profile.section)
        .filter((a) => findSubject(store, a.subjectId).semesterNumber === query.semesterNumber)
        .filter((a) => !query.subjectId || a.subjectId === query.subjectId)
        .map((a) => toStudentAssignment(store, a, user.id))
        .filter((a) => !query.status || a.status === query.status)
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    );
  },

  async getMyAssignment(assignmentId) {
    const store = await mockRequest();
    const { user, profile } = await requireStudent(store);
    const assignment = findAssignment(store, assignmentId);
    if (!assignment.sections.includes(profile.section)) throw fail("NOT_FOUND", "Assignment not found.");
    return clone(toStudentAssignment(store, assignment, user.id));
  },

  async listAssignments(query) {
    const store = await mockRequest();
    const faculty = await requireFaculty(store);
    const teaching = assertTeaches(faculty, query.subjectId, query.section);
    const sections = query.section ? [query.section] : teaching.sections;
    return clone(
      store.assignments
        .filter((a) => a.subjectId === query.subjectId && a.sections.some((s) => sections.includes(s)))
        .map((a) => ({ ...a, counts: countsFor(store, a, a.sections.filter((s) => sections.includes(s))) }))
        .sort((a, b) => b.dueAt.localeCompare(a.dueAt)),
    );
  },

  async createAssignment(input) {
    const store = await mockRequest(200);
    const faculty = await requireFaculty(store);
    const subject = findSubject(store, input.subjectId);
    assertSections(faculty, subject.id, input.sections);
    const unit = input.unitId ? findUnit(store, input.unitId) : null;
    if (unit && unit.subjectId !== subject.id) throw fail("VALIDATION", "That unit belongs to another subject.");

    const now = nowIso();
    const assignment: Assignment = {
      id: mockId(`assignment:new:${now}`),
      subjectId: subject.id,
      subjectName: subject.name,
      unitId: unit?.id ?? null,
      unitTitle: unit?.title ?? null,
      title: input.title,
      description: input.description ?? "",
      dueAt: new Date(input.dueAt).toISOString(),
      sections: input.sections,
      maxMarks: input.maxMarks ?? null,
      createdBy: { id: faculty.user.id, name: faculty.user.name },
      createdAt: now,
    };
    store.assignments.push(assignment);

    if (assignment.sections.includes(DEMO_STUDENT.profile.section)) {
      store.notifications.unshift({
        id: mockId(`notification:assignment:${assignment.id}`),
        userId: DEMO_STUDENT.user.id,
        type: "assignment_created",
        title: `New assignment: ${assignment.title}`,
        body: subject.name,
        target: { kind: "assignment", assignmentId: assignment.id },
        read: false,
        createdAt: now,
      });
    }
    return clone(assignment);
  },

  async updateAssignment(input) {
    const store = await mockRequest(200);
    const faculty = await requireFaculty(store);
    const assignment = facultyAssignment(store, faculty, input.assignmentId);
    if (input.sections) assertSections(faculty, assignment.subjectId, input.sections);
    if (input.unitId) {
      const unit = findUnit(store, input.unitId);
      if (unit.subjectId !== assignment.subjectId) throw fail("VALIDATION", "That unit belongs to another subject.");
      assignment.unitId = unit.id;
      assignment.unitTitle = unit.title;
    } else if (input.unitId === null) {
      assignment.unitId = null;
      assignment.unitTitle = null;
    }
    if (input.title !== undefined) assignment.title = input.title;
    if (input.description !== undefined) assignment.description = input.description;
    if (input.dueAt !== undefined) assignment.dueAt = new Date(input.dueAt).toISOString();
    if (input.sections !== undefined) assignment.sections = input.sections;
    if (input.maxMarks !== undefined) assignment.maxMarks = input.maxMarks;
    return clone(assignment);
  },

  async deleteAssignment(input) {
    const store = await mockRequest(200);
    const faculty = await requireFaculty(store);
    const assignment = facultyAssignment(store, faculty, input.assignmentId);
    store.assignments = store.assignments.filter((a) => a.id !== assignment.id);
    for (const key of store.statuses.keys()) if (key.startsWith(`${assignment.id}:`)) store.statuses.delete(key);
  },

  async getMarkingSheet(input) {
    const store = await mockRequest();
    const faculty = await requireFaculty(store);
    const assignment = facultyAssignment(store, faculty, input.assignmentId);
    assertTeaches(faculty, assignment.subjectId, input.section);
    if (!assignment.sections.includes(input.section)) throw fail("VALIDATION", "This assignment isn't set for that section.");
    const rows = sectionStudents(input.section)
      .map((s) => markingRow(store, assignment.id, s.user.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    return clone({ assignment, section: input.section, rows, counts: countsFor(store, assignment, [input.section]) });
  },

  async markStudent(input) {
    const store = await mockRequest(60);
    const faculty = await requireFaculty(store);
    const assignment = facultyAssignment(store, faculty, input.assignmentId);
    setStatus(store, assignment, input.studentId, input);
    return clone(markingRow(store, assignment.id, input.studentId));
  },

  async bulkMark(input) {
    const store = await mockRequest(120);
    const faculty = await requireFaculty(store);
    const assignment = facultyAssignment(store, faculty, input.assignmentId);
    for (const studentId of input.studentIds) setStatus(store, assignment, studentId, { status: input.status });
    return clone(input.studentIds.map((id) => markingRow(store, assignment.id, id)));
  },

  async getSectionTracker(input) {
    const store = await mockRequest();
    const faculty = await requireFaculty(store);
    assertTeaches(faculty, input.subjectId, input.section);
    const assignments = store.assignments
      .filter((a) => a.subjectId === input.subjectId && a.sections.includes(input.section))
      .sort((a, b) => b.dueAt.localeCompare(a.dueAt))
      .map((a) => ({ ...a, counts: countsFor(store, a, [input.section]) }));

    const studentRows = sectionStudents(input.section)
      .map((student) => {
        const counts = assignments.reduce((total, a) => {
          const { status } = statusOfStudent(store, a.id, student.user.id);
          return addCounts(total, {
            submitted: status === "submitted" ? 1 : 0,
            late: status === "late" ? 1 : 0,
            notSubmitted: status === "not_submitted" ? 1 : 0,
            pending: status === "pending" ? 1 : 0,
            total: 1,
          });
        }, EMPTY_COUNTS);
        const { percent } = subjectProgress(store, input.subjectId, sourceFor(store, student.user.id));
        return { studentId: student.user.id, name: student.user.name, counts, progressPercent: percent };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return clone({
      subjectId: input.subjectId,
      section: input.section,
      assignments,
      students: studentRows,
      counts: assignments.reduce((total, a) => addCounts(total, a.counts), EMPTY_COUNTS),
    });
  },
};
