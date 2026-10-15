// Real CurriculumApi (C-02). Reads land in BE-3.6; faculty edits (units/topics) land in BE-4.1/4.2. Owner: BE.
import "server-only";
import { GatewayError } from "@/contracts/common";
import type { CurriculumApi, Semester, Subject, Topic, Unit } from "@/contracts/curriculum";
import { assertSemesterOpen, requireFacultyTeaches, requireViewer, viewerBranchId } from "@/lib/auth/guards";
import type { ViewerContext } from "@/lib/auth/viewer";
import {
  countNotesInTopic,
  countNotesInUnit,
  deleteTopic as deleteTopicRecord,
  deleteUnit as deleteUnitRecord,
  findSubject,
  findTopicById,
  findUnitById,
  findUnitWithSubject,
  insertTopic,
  insertUnit,
  listPrerequisitesForSemester,
  listSemestersForBranch,
  listSubjectsForSemester,
  listTopicIds,
  listUnitIds,
  listUnitsWithTopics,
  renameTopic as renameTopicRecord,
  renameUnit as renameUnitRecord,
  setTopicOrder,
  setUnitOrder,
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

function validateOrderedIds(orderedIds: string[], currentIds: string[], childType: "units" | "topics"): void {
  if (orderedIds.length !== currentIds.length || new Set(orderedIds).size !== currentIds.length) {
    throw new GatewayError("VALIDATION", `Ordered IDs must contain all current ${childType} exactly once.`);
  }
  const currentSet = new Set(currentIds);
  for (const id of orderedIds) {
    if (!currentSet.has(id)) {
      throw new GatewayError("VALIDATION", `Unknown ${childType.slice(0, -1)} ID: ${id}`);
    }
  }
}

/** Loads a subject the viewer may see: same branch, and not in a locked semester (students). */
async function visibleSubject(viewer: ViewerContext, subjectId: string): Promise<SubjectRecord> {
  const subject = await findSubject(subjectId);
  if (!subject || subject.branchId !== viewerBranchId(viewer)) throw new GatewayError("NOT_FOUND", "Subject not found.");
  assertSemesterOpen(viewer, subject.semesterNumber);
  return subject;
}

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

  async createUnit(input) {
    const subject = await findSubject(input.subjectId);
    if (!subject) throw new GatewayError("NOT_FOUND", "Subject not found.");
    await requireFacultyTeaches(input.subjectId);

    const created = await insertUnit(input.subjectId, input.title);
    return toUnit(created);
  },

  async renameUnit(input) {
    const unit = await findUnitById(input.unitId);
    if (!unit) throw new GatewayError("NOT_FOUND", "Unit not found.");
    await requireFacultyTeaches(unit.subjectId);

    const updated = await renameUnitRecord(input.unitId, input.title);
    if (!updated) throw new GatewayError("NOT_FOUND", "Unit not found.");
    return toUnit(updated);
  },

  async reorderUnits(input) {
    const subject = await findSubject(input.parentId);
    if (!subject) throw new GatewayError("NOT_FOUND", "Subject not found.");
    await requireFacultyTeaches(input.parentId);

    const currentIds = await listUnitIds(input.parentId);
    validateOrderedIds(input.orderedIds, currentIds, "units");

    const reordered = await setUnitOrder(input.parentId, input.orderedIds);
    return reordered.map(toUnit);
  },

  async deleteUnit(input) {
    const unit = await findUnitById(input.unitId);
    if (!unit) throw new GatewayError("NOT_FOUND", "Unit not found.");
    await requireFacultyTeaches(unit.subjectId);

    const notesCount = await countNotesInUnit(input.unitId);
    if (notesCount > 0) {
      throw new GatewayError("CONFLICT", "Students have notes here. Move or archive them first.");
    }

    await deleteUnitRecord(input.unitId);
  },

  async createTopic(input) {
    const unit = await findUnitById(input.unitId);
    if (!unit) throw new GatewayError("NOT_FOUND", "Unit not found.");
    await requireFacultyTeaches(unit.subjectId);

    const created = await insertTopic(input.unitId, input.title);
    return toTopic(created);
  },

  async renameTopic(input) {
    const topic = await findTopicById(input.topicId);
    if (!topic) throw new GatewayError("NOT_FOUND", "Topic not found.");
    await requireFacultyTeaches(topic.subjectId);

    const updated = await renameTopicRecord(input.topicId, input.title);
    if (!updated) throw new GatewayError("NOT_FOUND", "Topic not found.");
    return toTopic(updated);
  },

  async reorderTopics(input) {
    const unit = await findUnitById(input.parentId);
    if (!unit) throw new GatewayError("NOT_FOUND", "Unit not found.");
    await requireFacultyTeaches(unit.subjectId);

    const currentIds = await listTopicIds(input.parentId);
    validateOrderedIds(input.orderedIds, currentIds, "topics");

    const reordered = await setTopicOrder(input.parentId, input.orderedIds);
    return reordered.map(toTopic);
  },

  async deleteTopic(input) {
    const topic = await findTopicById(input.topicId);
    if (!topic) throw new GatewayError("NOT_FOUND", "Topic not found.");
    await requireFacultyTeaches(topic.subjectId);

    const notesCount = await countNotesInTopic(input.topicId);
    if (notesCount > 0) {
      throw new GatewayError("CONFLICT", "Students have notes here. Move or archive them first.");
    }

    await deleteTopicRecord(input.topicId);
  },
};

