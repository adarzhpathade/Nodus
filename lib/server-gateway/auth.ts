// Real AuthApi (C-01). Owner: BE.
import "server-only";
import type {
  AuthApi,
  BranchOption,
  FacultyProfile,
  SessionUser,
  StudentProfile,
  TeachingAssignment,
  Viewer,
} from "@/contracts/auth";
import { GatewayError } from "@/contracts/common";
import { assertSemesterOpen, requireFaculty, requireStudent, requireStudentAccount, requireViewer } from "@/lib/auth/guards";
import { readFacultySelection, readStudentSemester, writeFacultySelection, writeStudentSemester } from "@/lib/auth/selection";
import { getViewerContext, type FacultyContext, type StudentContext } from "@/lib/auth/viewer";
import {
  findBranch,
  insertStudentProfile,
  listBranchesWithSemesters,
  semesterExists,
  updateUserName,
  type UserRow,
} from "@/lib/db/queries/users";

const toSessionUser = (user: UserRow): SessionUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  role: user.role,
});

const toBranchRef = (branch: { id: string; code: string; name: string }) => ({
  id: branch.id,
  code: branch.code,
  name: branch.name,
});

function toStudentProfile(viewer: StudentContext): StudentProfile | null {
  if (!viewer.profile) return null;
  return {
    userId: viewer.user.id,
    branch: toBranchRef(viewer.profile.branch),
    currentSemester: viewer.profile.currentSemester,
    section: viewer.profile.section,
  };
}

function toFacultyProfile(viewer: FacultyContext): FacultyProfile {
  const bySubject = new Map<string, TeachingAssignment>();
  for (const row of viewer.teaching) {
    const entry = bySubject.get(row.subjectId) ?? {
      subjectId: row.subjectId,
      subjectCode: row.subjectCode,
      subjectName: row.subjectName,
      semesterNumber: row.semesterNumber,
      sections: [],
    };
    entry.sections.push(row.section);
    bySubject.set(row.subjectId, entry);
  }
  const branch = viewer.branch ?? { id: "00000000-0000-4000-8000-000000000000", code: "-", name: "Not assigned" };
  return { userId: viewer.user.id, branch: toBranchRef(branch), teaches: [...bySubject.values()] };
}

export const authApi: AuthApi = {
  async getViewer(): Promise<Viewer | null> {
    const viewer = await getViewerContext();
    if (!viewer) return null;
    return viewer.role === "faculty"
      ? { role: "faculty", user: toSessionUser(viewer.user), profile: toFacultyProfile(viewer) }
      : { role: "student", user: toSessionUser(viewer.user), profile: toStudentProfile(viewer) };
  },

  async listBranches(): Promise<BranchOption[]> {
    await requireViewer();
    const rows = await listBranchesWithSemesters();
    return rows.map(({ branch, semesters }) => ({ ...toBranchRef(branch), sections: branch.sections, semesters }));
  },

  async completeOnboarding(input) {
    const viewer = await requireStudentAccount();
    if (viewer.profile) throw new GatewayError("CONFLICT", "You have already completed onboarding.");

    const branch = await findBranch(input.branchId);
    if (!branch) throw new GatewayError("VALIDATION", "Choose a valid branch.", { fieldErrors: { branchId: ["Unknown branch"] } });
    if (!branch.sections.includes(input.section)) {
      throw new GatewayError("VALIDATION", "Choose a valid section.", { fieldErrors: { section: [`Not a section of ${branch.code}`] } });
    }
    if (!(await semesterExists(branch.id, input.currentSemester))) {
      throw new GatewayError("VALIDATION", "Choose a valid semester.", { fieldErrors: { currentSemester: ["Not offered"] } });
    }

    await insertStudentProfile({ userId: viewer.user.id, ...input });
    return { userId: viewer.user.id, branch: toBranchRef(branch), currentSemester: input.currentSemester, section: input.section };
  },

  async updateProfile(input) {
    const viewer = await requireViewer();
    return toSessionUser(await updateUserName(viewer.user.id, input.name));
  },

  async getStudentSelection() {
    const student = await requireStudent();
    const saved = await readStudentSemester();
    const current = student.profile.currentSemester;
    return { semesterNumber: saved && saved <= current ? saved : current };
  },

  async setStudentSelection(input) {
    const student = await requireStudent();
    assertSemesterOpen(student, input.semesterNumber);
    await writeStudentSemester(input.semesterNumber);
    return input;
  },

  async getFacultySelection() {
    const faculty = await requireFaculty();
    const saved = await readFacultySelection();
    const valid = saved && faculty.teaching.some((t) => t.subjectId === saved.subjectId && t.section === saved.section);
    return valid ? saved : null;
  },

  async setFacultySelection(input) {
    const faculty = await requireFaculty();
    if (!faculty.teaching.some((t) => t.subjectId === input.subjectId && t.section === input.section)) {
      throw new GatewayError("FORBIDDEN", "You don't teach this subject or section.");
    }
    await writeFacultySelection(input);
    return input;
  },
};
