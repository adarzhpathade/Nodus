import type { AuthApi, Viewer } from "@/contracts/auth";
import { assertTeaches, clone, currentActor, fail, mockRequest, requireActor, requireFaculty, requireStudent } from "../context";
import { BRANCH } from "../fixtures/curriculum";
import { assertSemesterOpen } from "./shared";

export const authMock: AuthApi = {
  async getViewer() {
    const store = await mockRequest();
    const actor = await currentActor(store);
    if (!actor) return null;
    const viewer: Viewer =
      actor.role === "faculty"
        ? { role: "faculty", user: actor.user, profile: actor.profile }
        : { role: "student", user: actor.user, profile: actor.profile };
    return clone(viewer);
  },

  async listBranches() {
    await mockRequest();
    return [clone(BRANCH)];
  },

  async completeOnboarding(input) {
    const store = await mockRequest(300);
    const actor = await requireActor(store);
    if (actor.role !== "student") throw fail("FORBIDDEN", "Only students complete onboarding.");
    if (actor.profile) throw fail("CONFLICT", "You have already completed onboarding.");
    if (input.branchId !== BRANCH.id) throw fail("VALIDATION", "Unknown branch.", { fieldErrors: { branchId: ["Unknown branch"] } });
    if (!BRANCH.sections.includes(input.section)) {
      throw fail("VALIDATION", "Unknown section.", { fieldErrors: { section: ["Unknown section"] } });
    }
    const profile = {
      userId: actor.user.id,
      branch: { id: BRANCH.id, code: BRANCH.code, name: BRANCH.name },
      currentSemester: input.currentSemester,
      section: input.section,
    };
    store.onboarded.set(actor.user.id, profile);
    return clone(profile);
  },

  async updateProfile(input) {
    const store = await mockRequest(200);
    const actor = await requireActor(store);
    store.names.set(actor.user.id, input.name);
    return { ...clone(actor.user), name: input.name };
  },

  async getStudentSelection() {
    const store = await mockRequest();
    const { user, profile } = await requireStudent(store);
    return { semesterNumber: store.studentSelection.get(user.id) ?? profile.currentSemester };
  },

  async setStudentSelection(input) {
    const store = await mockRequest();
    const { user, profile } = await requireStudent(store);
    assertSemesterOpen(profile, input.semesterNumber);
    store.studentSelection.set(user.id, input.semesterNumber);
    return { semesterNumber: input.semesterNumber };
  },

  async getFacultySelection() {
    const store = await mockRequest();
    const faculty = await requireFaculty(store);
    return clone(store.facultySelection.get(faculty.user.id) ?? null);
  },

  async setFacultySelection(input) {
    const store = await mockRequest();
    const faculty = await requireFaculty(store);
    assertTeaches(faculty, input.subjectId, input.section);
    store.facultySelection.set(faculty.user.id, input);
    return clone(input);
  },
};
