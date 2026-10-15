// Branch → semesters → subjects → units → topics. Owner: BE.
import { check, index, integer, pgTable, primaryKey, text, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { id, timestamps } from "./_shared";

export const branches = pgTable("branches", {
  id: id(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  /** Section letters offered in this branch, e.g. {A,B,C}. */
  sections: text("sections").array().notNull().default(sql`'{A,B,C}'::text[]`),
  ...timestamps,
});

export const semesters = pgTable(
  "semesters",
  {
    id: id(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    ...timestamps,
  },
  (t) => [unique("semesters_branch_number_uq").on(t.branchId, t.number), check("semesters_number_ck", sql`${t.number} between 1 and 8`)],
);

export const subjects = pgTable(
  "subjects",
  {
    id: id(),
    semesterId: uuid("semester_id")
      .notNull()
      .references(() => semesters.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    order: integer("order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("subjects_semester_idx").on(t.semesterId, t.order), unique("subjects_semester_code_uq").on(t.semesterId, t.code)],
);

export const subjectPrerequisites = pgTable(
  "subject_prerequisites",
  {
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    prerequisiteSubjectId: uuid("prerequisite_subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.subjectId, t.prerequisiteSubjectId] })],
);

export const units = pgTable(
  "units",
  {
    id: id(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    order: integer("order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("units_subject_idx").on(t.subjectId, t.order)],
);

export const topics = pgTable(
  "topics",
  {
    id: id(),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    order: integer("order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("topics_unit_idx").on(t.unitId, t.order)],
);
