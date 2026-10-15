// Real CurriculumApi (C-02). Reads land in BE-3.6; faculty edits (units/topics) land in BE-4.1/4.2. Owner: BE.
import "server-only";
import { GatewayError } from "@/contracts/common";
import type { CurriculumApi, Semester, Subject, Topic, Unit } from "@/contracts/curriculum";
import { assertSemesterOpen, requireViewer, viewerBranchId } from "@/lib/auth/guards";
import type { ViewerContext } from "@/lib/auth/viewer";
import {
  findSubject,
  findUnitWithSubject,
  listPrerequisitesForSemester,
  listSemestersForBranch,
  listSubjectsForSemester,
  listUnitsWithTopics,
  type SubjectRecord,
} from "@/lib/db/queries/curriculum";

const toSubject = (s: SubjectRecord): Subject => ({
  id: s.id,
  semesterNumber: s.semesterNumber,
  code: s.code,
  name: s.name,
  order: s.order,
});
const toUnit = (u: { id: string; subjectId: string; title: string; order: number }): Unit => ({
  id: u.id,
  subjectId: u.subjectId,
  title: u.title,
  order: u.order,
});
const toTopic = (t: { id: string; unitId: string; title: string; order: number }): Topic => ({
  id: t.id,
  unitId: t.unitId,
  title: t.title,
  order: t.order,
});

/** Loads a subject the viewer may see: same branch, and not in a locked semester (students). */
async function visibleSubject(viewer: ViewerContext, subjectId: string): Promise<SubjectRecord> {
  const subject = await findSubject(subjectId);
  if (!subject || subject.branchId !== viewerBranchId(viewer)) throw new GatewayError("NOT_FOUND", "Subject not found.");
  assertSemesterOpen(viewer, subject.semesterNumber);
  return subject;
}

const notYet = (task: string) => async (): Promise<never> => {
  throw new GatewayError("NOT_IMPLEMENTED", `Faculty syllabus editing is not built yet (${task}). Add "curriculum" to MOCK_FEATURES.`);
};

export const curriculumApi: CurriculumApi = {
  async listSemesters(): Promise<Semester[]> {
    const viewer = await requireViewer();
    const current = viewer.role === "student" ? viewer.profile?.currentSemester : undefined;
    const rows = await listSemestersForBranch(viewerBranchId(viewer));
    return rows.map((s) => ({
      id: s.id,
      number: s.number,
      locked: current !== undefined && s.number > current,
      isCurrent: current === s.number,
    }));
  },

  async listSubjects(semesterNumber) {
    const viewer = await requireViewer();
    assertSemesterOpen(viewer, semesterNumber);
    return (await listSubjectsForSemester(viewerBranchId(viewer), semesterNumber)).map(toSubject);
  },

  async listPrerequisites(semesterNumber) {
    const viewer = await requireViewer();
    assertSemesterOpen(viewer, semesterNumber);
    const rows = await listPrerequisitesForSemester(viewerBranchId(viewer), semesterNumber);
    return rows.map((r) => ({ subjectId: r.subjectId, prerequisiteSubjectId: r.prerequisiteSubjectId }));
  },

  async getSubject(subjectId) {
    const viewer = await requireViewer();
    const subject = await visibleSubject(viewer, subjectId);
    const units = await listUnitsWithTopics(subject.id);
    return { ...toSubject(subject), units: units.map(({ unit, topics }) => ({ ...toUnit(unit), topics: topics.map(toTopic) })) };
  },

  async getUnit(unitId) {
    const viewer = await requireViewer();
    const found = await findUnitWithSubject(unitId);
    if (!found) throw new GatewayError("NOT_FOUND", "Unit not found.");
    await visibleSubject(viewer, found.subject.id);
    return { subject: toSubject(found.subject), unit: toUnit(found.unit), topics: found.topics.map(toTopic) };
  },

  createUnit: notYet("BE-4.1"),
  renameUnit: notYet("BE-4.1"),
  reorderUnits: notYet("BE-4.1"),
  deleteUnit: notYet("BE-4.1"),
  createTopic: notYet("BE-4.2"),
  renameTopic: notYet("BE-4.2"),
  reorderTopics: notYet("BE-4.2"),
  deleteTopic: notYet("BE-4.2"),
};
