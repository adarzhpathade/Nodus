// App users and profiles. Owner: BE.
// `users.id` is the Neon Auth user id (neon_auth."user".id): auth owns credentials and sessions,
// NODUS owns role, academic profile and teaching assignments.
import { char, index, integer, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { roleEnum, timestamps } from "./_shared";
import { branches, subjects } from "./curriculum";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  image: text("image"),
  role: roleEnum("role").notNull().default("student"),
  ...timestamps,
});

export const studentProfiles = pgTable(
  "student_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    currentSemester: integer("current_semester").notNull(),
    section: char("section", { length: 1 }).notNull(),
    ...timestamps,
  },
  (t) => [index("student_profiles_branch_section_idx").on(t.branchId, t.currentSemester, t.section)],
);

/** Which faculty teaches which subject to which section. */
export const facultyTeaching = pgTable(
  "faculty_teaching",
  {
    facultyId: uuid("faculty_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    section: char("section", { length: 1 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.facultyId, t.subjectId, t.section] })],
);
