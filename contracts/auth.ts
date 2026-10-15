// C-01 — Auth, profiles, onboarding and the top-bar selection. Owner: BE (FE reviews).
//
// Sign-up / sign-in / sign-out are NOT gateway methods: FE calls Neon Auth directly with
// `authClient` from "@/lib/auth/client" (signUp.email, signIn.email, signOut). The gateway covers
// everything NODUS adds on top: who the viewer is, their role/profile, onboarding and selections.
import { z } from "zod";
import { Id, Role, Section, SemesterNumber } from "./common";

export const SessionUser = z.object({
  id: Id,
  name: z.string(),
  email: z.email(),
  image: z.url().nullable(),
  role: Role,
});
export type SessionUser = z.infer<typeof SessionUser>;

export const BranchRef = z.object({ id: Id, code: z.string(), name: z.string() });
export type BranchRef = z.infer<typeof BranchRef>;

export const StudentProfile = z.object({
  userId: Id,
  branch: BranchRef,
  currentSemester: SemesterNumber,
  section: Section,
});
export type StudentProfile = z.infer<typeof StudentProfile>;

export const TeachingAssignment = z.object({
  subjectId: Id,
  subjectCode: z.string(),
  subjectName: z.string(),
  semesterNumber: SemesterNumber,
  sections: z.array(Section).min(1),
});
export type TeachingAssignment = z.infer<typeof TeachingAssignment>;

export const FacultyProfile = z.object({
  userId: Id,
  branch: BranchRef,
  teaches: z.array(TeachingAssignment),
});
export type FacultyProfile = z.infer<typeof FacultyProfile>;

/**
 * The signed-in user plus role-specific profile.
 * A student with `profile: null` must complete onboarding before using the app.
 */
export const Viewer = z.discriminatedUnion("role", [
  z.object({ role: z.literal("student"), user: SessionUser, profile: StudentProfile.nullable() }),
  z.object({ role: z.literal("faculty"), user: SessionUser, profile: FacultyProfile }),
]);
export type Viewer = z.infer<typeof Viewer>;

/** Options for the onboarding form. */
export const BranchOption = BranchRef.extend({
  sections: z.array(Section),
  semesters: z.array(SemesterNumber),
});
export type BranchOption = z.infer<typeof BranchOption>;

export const OnboardingInput = z.object({
  branchId: Id,
  currentSemester: SemesterNumber,
  section: Section,
});
export type OnboardingInput = z.infer<typeof OnboardingInput>;

export const UpdateProfileInput = z.object({
  name: z.string().trim().min(1).max(80),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInput>;

/** Student top bar: which semester the whole app shows. Defaults to the current semester. */
export const StudentSelection = z.object({ semesterNumber: SemesterNumber });
export type StudentSelection = z.infer<typeof StudentSelection>;

/** Faculty top bar: which subject + section the faculty pages show. */
export const FacultySelection = z.object({ subjectId: Id, section: Section });
export type FacultySelection = z.infer<typeof FacultySelection>;

export interface AuthApi {
  /** Current viewer, or null when signed out. */
  getViewer(): Promise<Viewer | null>;
  listBranches(): Promise<BranchOption[]>;
  /** Student only. Throws CONFLICT if already onboarded. */
  completeOnboarding(input: OnboardingInput): Promise<StudentProfile>;
  updateProfile(input: UpdateProfileInput): Promise<SessionUser>;
  getStudentSelection(): Promise<StudentSelection>;
  /** Throws LOCKED for a future semester. */
  setStudentSelection(input: StudentSelection): Promise<StudentSelection>;
  /** Null until the faculty picks one (FE may default to the first teaching assignment). */
  getFacultySelection(): Promise<FacultySelection | null>;
  /** Throws FORBIDDEN if the faculty doesn't teach that subject + section. */
  setFacultySelection(input: FacultySelection): Promise<FacultySelection>;
}
