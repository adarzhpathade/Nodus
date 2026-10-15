// Assignments with OFFLINE submission — faculty marks status. Owner: BE.
import { char, index, integer, pgTable, primaryKey, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { assignmentStatusEnum, id, timestamps } from "./_shared";
import { subjects, units } from "./curriculum";
import { users } from "./users";

export const assignments = pgTable(
  "assignments",
  {
    id: id(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id").references(() => units.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    maxMarks: integer("max_marks"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    ...timestamps,
  },
  (t) => [index("assignments_subject_due_idx").on(t.subjectId, t.dueAt)],
);

export const assignmentSections = pgTable(
  "assignment_sections",
  {
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    section: char("section", { length: 1 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.assignmentId, t.section] })],
);

/** One row per (assignment, student) once marked. No row = "pending". */
export const assignmentStatus = pgTable(
  "assignment_status",
  {
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: assignmentStatusEnum("status").notNull(),
    marks: real("marks"),
    remark: text("remark"),
    markedBy: uuid("marked_by").references(() => users.id),
    markedAt: timestamp("marked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.assignmentId, t.studentId] }), index("assignment_status_student_idx").on(t.studentId)],
);
