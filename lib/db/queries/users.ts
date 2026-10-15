// User, profile and teaching queries. Owner: BE.
import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { branches, facultyTeaching, semesters, studentProfiles, subjects, users } from "@/lib/db/schema";

export type UserRow = typeof users.$inferSelect;

/** App user + student profile (with branch) in one query. */
export async function findUserWithProfile(userId: string) {
  const rows = await getDb()
    .select({ user: users, profile: studentProfiles, branch: branches })
    .from(users)
    .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .leftJoin(branches, eq(branches.id, studentProfiles.branchId))
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

/** Creates the app user on first sign-in (role student). Never changes an existing row. */
export async function ensureUser(input: { id: string; email: string; name: string; image: string | null }): Promise<UserRow> {
  const db = getDb();
  await db
    .insert(users)
    .values({ id: input.id, email: input.email, name: input.name || input.email.split("@")[0] || "Student", image: input.image })
    .onConflictDoNothing({ target: users.id });
  const [row] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
  if (!row) throw new Error(`User ${input.id} could not be created`);
  return row;
}

export async function updateUserName(userId: string, name: string): Promise<UserRow> {
  const [row] = await getDb().update(users).set({ name }).where(eq(users.id, userId)).returning();
  if (!row) throw new Error(`User ${userId} not found`);
  return row;
}

/** Subjects + sections a faculty member teaches, with the subject's semester and branch. */
export async function listTeaching(facultyId: string) {
  return getDb()
    .select({
      subjectId: subjects.id,
      subjectCode: subjects.code,
      subjectName: subjects.name,
      semesterNumber: semesters.number,
      branch: branches,
      section: facultyTeaching.section,
    })
    .from(facultyTeaching)
    .innerJoin(subjects, eq(subjects.id, facultyTeaching.subjectId))
    .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
    .innerJoin(branches, eq(branches.id, semesters.branchId))
    .where(eq(facultyTeaching.facultyId, facultyId))
    .orderBy(asc(semesters.number), asc(subjects.order), asc(facultyTeaching.section));
}

export async function listBranchesWithSemesters() {
  const db = getDb();
  const [branchRows, semesterRows] = await Promise.all([
    db.select().from(branches).orderBy(asc(branches.code)),
    db.select({ branchId: semesters.branchId, number: semesters.number }).from(semesters).orderBy(asc(semesters.number)),
  ]);
  return branchRows.map((branch) => ({
    branch,
    semesters: semesterRows.filter((s) => s.branchId === branch.id).map((s) => s.number),
  }));
}

export async function findBranch(branchId: string) {
  const [row] = await getDb().select().from(branches).where(eq(branches.id, branchId)).limit(1);
  return row ?? null;
}

export async function semesterExists(branchId: string, number: number): Promise<boolean> {
  const rows = await getDb()
    .select({ id: semesters.id })
    .from(semesters)
    .where(and(eq(semesters.branchId, branchId), eq(semesters.number, number)))
    .limit(1);
  return rows.length > 0;
}

export async function insertStudentProfile(input: { userId: string; branchId: string; currentSemester: number; section: string }) {
  const [row] = await getDb().insert(studentProfiles).values(input).returning();
  return row;
}
