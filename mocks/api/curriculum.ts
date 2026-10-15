import type { CurriculumApi, ReorderInput, Topic, Unit } from "@/contracts/curriculum";
import { assertTeaches, clone, fail, mockRequest, requireActor, requireFaculty, type Actor } from "../context";
import { mockId } from "../fixtures/ids";
import type { MockStore } from "../store";
import { assertSemesterOpen, byOrder, findSubject, findTopic, findUnit } from "./shared";

function checkSemesterAccess(actor: Actor, semesterNumber: number) {
  if (actor.role === "student") {
    if (!actor.profile) throw fail("FORBIDDEN", "Complete onboarding first.");
    assertSemesterOpen(actor.profile, semesterNumber);
  }
}

/** Every topic with at least one student note blocks deletion (notes are never silently deleted). */
function topicHasNotes(store: MockStore, topicId: string) {
  if (store.notes.some((n) => n.topicId === topicId)) return true;
  for (const classmate of store.classmates.values()) if ((classmate.noteCounts.get(topicId) ?? 0) > 0) return true;
  return false;
}

function applyOrder<T extends { id: string; order: number }>(children: T[], input: ReorderInput): T[] {
  const ids = new Set(children.map((c) => c.id));
  if (input.orderedIds.length !== ids.size || !input.orderedIds.every((id) => ids.has(id))) {
    throw fail("VALIDATION", "orderedIds must contain every child exactly once.");
  }
  input.orderedIds.forEach((id, index) => {
    children.find((c) => c.id === id)!.order = index + 1;
  });
  return [...children].sort(byOrder);
}

async function facultyForUnit(store: MockStore, unitId: string) {
  const faculty = await requireFaculty(store);
  const unit = findUnit(store, unitId);
  assertTeaches(faculty, unit.subjectId);
  return unit;
}

export const curriculumMock: CurriculumApi = {
  async listSemesters() {
    const store = await mockRequest();
    const actor = await requireActor(store);
    if (actor.role === "student" && actor.profile) {
      const current = actor.profile.currentSemester;
      return store.semesters.map((s) => ({ ...s, locked: s.number > current, isCurrent: s.number === current }));
    }
    return clone(store.semesters);
  },

  async listSubjects(semesterNumber) {
    const store = await mockRequest();
    checkSemesterAccess(await requireActor(store), semesterNumber);
    return clone(store.subjects.filter((s) => s.semesterNumber === semesterNumber).sort(byOrder));
  },

  async listPrerequisites(semesterNumber) {
    const store = await mockRequest();
    checkSemesterAccess(await requireActor(store), semesterNumber);
    const ids = new Set(store.subjects.filter((s) => s.semesterNumber === semesterNumber).map((s) => s.id));
    return clone(store.prerequisites.filter((p) => ids.has(p.subjectId) && ids.has(p.prerequisiteSubjectId)));
  },

  async getSubject(subjectId) {
    const store = await mockRequest();
    const subject = findSubject(store, subjectId);
    checkSemesterAccess(await requireActor(store), subject.semesterNumber);
    const units = store.units
      .filter((u) => u.subjectId === subjectId)
      .sort(byOrder)
      .map((unit) => ({ ...unit, topics: store.topics.filter((t) => t.unitId === unit.id).sort(byOrder) }));
    return clone({ ...subject, units });
  },

  async getUnit(unitId) {
    const store = await mockRequest();
    const unit = findUnit(store, unitId);
    const subject = findSubject(store, unit.subjectId);
    checkSemesterAccess(await requireActor(store), subject.semesterNumber);
    return clone({ subject, unit, topics: store.topics.filter((t) => t.unitId === unitId).sort(byOrder) });
  },

  async createUnit(input) {
    const store = await mockRequest(150);
    const faculty = await requireFaculty(store);
    findSubject(store, input.subjectId);
    assertTeaches(faculty, input.subjectId);
    const siblings = store.units.filter((u) => u.subjectId === input.subjectId);
    const unit: Unit = {
      id: mockId(`unit:new:${input.subjectId}:${Date.now()}`),
      subjectId: input.subjectId,
      title: input.title,
      order: Math.max(0, ...siblings.map((u) => u.order)) + 1,
    };
    store.units.push(unit);
    return clone(unit);
  },

  async renameUnit(input) {
    const store = await mockRequest(150);
    const unit = await facultyForUnit(store, input.unitId);
    unit.title = input.title;
    return clone(unit);
  },

  async reorderUnits(input) {
    const store = await mockRequest(150);
    const faculty = await requireFaculty(store);
    assertTeaches(faculty, input.parentId);
    return clone(applyOrder(store.units.filter((u) => u.subjectId === input.parentId), input));
  },

  async deleteUnit(input) {
    const store = await mockRequest(150);
    const unit = await facultyForUnit(store, input.unitId);
    const unitTopics = store.topics.filter((t) => t.unitId === unit.id);
    if (unitTopics.some((t) => topicHasNotes(store, t.id))) {
      throw fail("CONFLICT", "Students have notes in this unit. Move or merge its topics first.");
    }
    store.topics = store.topics.filter((t) => t.unitId !== unit.id);
    store.resources = store.resources.filter((r) => r.unitId !== unit.id);
    store.units = store.units.filter((u) => u.id !== unit.id);
  },

  async createTopic(input) {
    const store = await mockRequest(150);
    await facultyForUnit(store, input.unitId);
    const siblings = store.topics.filter((t) => t.unitId === input.unitId);
    const topic: Topic = {
      id: mockId(`topic:new:${input.unitId}:${Date.now()}`),
      unitId: input.unitId,
      title: input.title,
      order: Math.max(0, ...siblings.map((t) => t.order)) + 1,
    };
    store.topics.push(topic);
    return clone(topic);
  },

  async renameTopic(input) {
    const store = await mockRequest(150);
    const topic = findTopic(store, input.topicId);
    await facultyForUnit(store, topic.unitId);
    topic.title = input.title;
    return clone(topic);
  },

  async reorderTopics(input) {
    const store = await mockRequest(150);
    await facultyForUnit(store, input.parentId);
    return clone(applyOrder(store.topics.filter((t) => t.unitId === input.parentId), input));
  },

  async deleteTopic(input) {
    const store = await mockRequest(150);
    const topic = findTopic(store, input.topicId);
    await facultyForUnit(store, topic.unitId);
    if (topicHasNotes(store, topic.id)) throw fail("CONFLICT", "Students have notes under this topic, so it can't be deleted.");
    store.topics = store.topics.filter((t) => t.id !== topic.id);
  },
};
