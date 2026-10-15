// C-08 — Assignments with OFFLINE submission: faculty marks status in the app. Owner: BE (FE reviews).
// There is no student upload anywhere in this contract — by design (AGENTS.md §6.5).
import { z } from "zod";
import { Id, PersonRef, Section, SemesterNumber, Timestamp } from "./common";

/** `pending` = not marked yet. */
export const AssignmentStatus = z.enum(["pending", "submitted", "late", "not_submitted"]);
export type AssignmentStatus = z.infer<typeof AssignmentStatus>;

export const Assignment = z.object({
  id: Id,
  subjectId: Id,
  subjectName: z.string(),
  unitId: Id.nullable(),
  unitTitle: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  dueAt: Timestamp,
  sections: z.array(Section).min(1),
  maxMarks: z.number().int().positive().nullable(),
  createdBy: PersonRef,
  createdAt: Timestamp,
});
export type Assignment = z.infer<typeof Assignment>;

/** Lightweight shape for side panels, unit pages and dashboard timelines. */
export const AssignmentSummary = z.object({
  id: Id,
  title: z.string(),
  subjectName: z.string(),
  unitId: Id.nullable(),
  dueAt: Timestamp,
});
export type AssignmentSummary = z.infer<typeof AssignmentSummary>;

export const StudentAssignment = Assignment.extend({
  status: AssignmentStatus,
  marks: z.number().nonnegative().nullable(),
  remark: z.string().nullable(),
  markedAt: Timestamp.nullable(),
});
export type StudentAssignment = z.infer<typeof StudentAssignment>;

export const StatusCounts = z.object({
  submitted: z.number().int().nonnegative(),
  late: z.number().int().nonnegative(),
  notSubmitted: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});
export type StatusCounts = z.infer<typeof StatusCounts>;

export const FacultyAssignmentSummary = Assignment.extend({ counts: StatusCounts });
export type FacultyAssignmentSummary = z.infer<typeof FacultyAssignmentSummary>;

export const MarkingRow = z.object({
  studentId: Id,
  name: z.string(),
  section: Section,
  status: AssignmentStatus,
  marks: z.number().nonnegative().nullable(),
  remark: z.string().nullable(),
  markedAt: Timestamp.nullable(),
});
export type MarkingRow = z.infer<typeof MarkingRow>;

export const MarkingSheet = z.object({
  assignment: Assignment,
  section: Section,
  rows: z.array(MarkingRow),
  counts: StatusCounts,
});
export type MarkingSheet = z.infer<typeof MarkingSheet>;

export const TrackerStudentRow = z.object({
  studentId: Id,
  name: z.string(),
  counts: StatusCounts,
  /** Student's progress % in this subject (from lib/progress). */
  progressPercent: z.number().min(0).max(100),
});
export type TrackerStudentRow = z.infer<typeof TrackerStudentRow>;

export const SectionTracker = z.object({
  subjectId: Id,
  section: Section,
  assignments: z.array(FacultyAssignmentSummary),
  students: z.array(TrackerStudentRow),
  counts: StatusCounts,
});
export type SectionTracker = z.infer<typeof SectionTracker>;

// ---------- Inputs ----------

const AssignmentFields = z.object({
  subjectId: Id,
  unitId: Id.nullish(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000).default(""),
  dueAt: Timestamp,
  sections: z.array(Section).min(1),
  maxMarks: z.number().int().positive().max(1000).nullish(),
});

export const CreateAssignmentInput = AssignmentFields;
export type CreateAssignmentInput = z.input<typeof CreateAssignmentInput>;

export const UpdateAssignmentInput = AssignmentFields.omit({ subjectId: true })
  .partial()
  .extend({ assignmentId: Id });
export type UpdateAssignmentInput = z.input<typeof UpdateAssignmentInput>;

export const AssignmentIdInput = z.object({ assignmentId: Id });
export type AssignmentIdInput = z.infer<typeof AssignmentIdInput>;

export const MarkStudentInput = z.object({
  assignmentId: Id,
  studentId: Id,
  status: AssignmentStatus,
  marks: z.number().nonnegative().nullish(),
  remark: z.string().trim().max(500).nullish(),
});
export type MarkStudentInput = z.input<typeof MarkStudentInput>;

export const BulkMarkInput = z.object({
  assignmentId: Id,
  studentIds: z.array(Id).min(1),
  status: AssignmentStatus,
});
export type BulkMarkInput = z.infer<typeof BulkMarkInput>;

export const ListMyAssignmentsQuery = z.object({
  semesterNumber: SemesterNumber,
  status: AssignmentStatus.optional(),
  subjectId: Id.optional(),
});
export type ListMyAssignmentsQuery = z.infer<typeof ListMyAssignmentsQuery>;

export const ListAssignmentsQuery = z.object({
  subjectId: Id,
  section: Section.optional(),
});
export type ListAssignmentsQuery = z.infer<typeof ListAssignmentsQuery>;

export interface AssignmentsApi {
  // Student
  listMyAssignments(query: ListMyAssignmentsQuery): Promise<StudentAssignment[]>;
  getMyAssignment(assignmentId: string): Promise<StudentAssignment>;

  // Faculty (own subjects/sections)
  listAssignments(query: ListAssignmentsQuery): Promise<FacultyAssignmentSummary[]>;
  createAssignment(input: CreateAssignmentInput): Promise<Assignment>;
  updateAssignment(input: UpdateAssignmentInput): Promise<Assignment>;
  deleteAssignment(input: AssignmentIdInput): Promise<void>;
  getMarkingSheet(input: { assignmentId: string; section: string }): Promise<MarkingSheet>;
  markStudent(input: MarkStudentInput): Promise<MarkingRow>;
  bulkMark(input: BulkMarkInput): Promise<MarkingRow[]>;
  getSectionTracker(input: { subjectId: string; section: string }): Promise<SectionTracker>;
}
