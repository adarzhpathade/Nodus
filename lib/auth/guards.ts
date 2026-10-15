// Server-side role guards. Every gateway method starts with one of these (AGENTS.md §14). Owner: BE.
import "server-only";
import { GatewayError } from "@/contracts/common";
import { getViewerContext, type FacultyContext, type StudentContext, type ViewerContext } from "./viewer";

export type OnboardedStudent = StudentContext & { profile: NonNullable<StudentContext["profile"]> };

export async function requireViewer(): Promise<ViewerContext> {
  const viewer = await getViewerContext();
  if (!viewer) throw new GatewayError("UNAUTHENTICATED", "Please sign in.");
  return viewer;
}

/** Any student, onboarded or not (used by onboarding itself). */
export async function requireStudentAccount(): Promise<StudentContext> {
  const viewer = await requireViewer();
  if (viewer.role !== "student") throw new GatewayError("FORBIDDEN", "This is only available to students.");
  return viewer;
}

/** A student who has completed onboarding. */
export async function requireStudent(): Promise<OnboardedStudent> {
  const viewer = await requireStudentAccount();
  if (!viewer.profile) throw new GatewayError("FORBIDDEN", "Complete onboarding first.");
  return viewer as OnboardedStudent;
}

export async function requireFaculty(): Promise<FacultyContext> {
  const viewer = await requireViewer();
  if (viewer.role !== "faculty") throw new GatewayError("FORBIDDEN", "This is only available to faculty.");
  return viewer;
}

/** Faculty who teaches the subject (and the section, when given). */
export async function requireFacultyTeaches(subjectId: string, section?: string): Promise<FacultyContext> {
  const faculty = await requireFaculty();
  const teaches = faculty.teaching.some(
    (t) => t.subjectId === subjectId && (section === undefined || t.section === section),
  );
  if (!teaches) throw new GatewayError("FORBIDDEN", "You don't teach this subject or section.");
  return faculty;
}

/** Students can open their current and past semesters only. */
export function assertSemesterOpen(viewer: ViewerContext, semesterNumber: number): void {
  if (viewer.role !== "student" || !viewer.profile) return;
  if (semesterNumber > viewer.profile.currentSemester) {
    throw new GatewayError("LOCKED", `Semester ${semesterNumber} unlocks later.`);
  }
}

/** Branch the viewer belongs to (student profile, or the branch of what the faculty teaches). */
export function viewerBranchId(viewer: ViewerContext): string {
  const branchId = viewer.role === "student" ? viewer.profile?.branch.id : viewer.branch?.id;
  if (!branchId) {
    throw new GatewayError("FORBIDDEN", viewer.role === "student" ? "Complete onboarding first." : "No subjects assigned yet.");
  }
  return branchId;
}
