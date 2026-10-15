import type {
  FacultyGraph,
  FacultyHoverCard,
  GraphApi,
  GraphEdge,
  GraphNode,
  StudentGraph,
  StudentHoverCard,
} from "@/contracts/graph";
import { assertTeaches, clone, fail, mockRequest, requireFaculty, requireStudent } from "../context";
import {
  classUnitProgress,
  round1,
  semesterProgress,
  sourceFor,
  statusOf,
  studentsNeedingHelp,
  subjectProgress,
  unitProgress,
} from "../progress";
import type { MockStore } from "../store";
import { countsFor, nextDeadline, toDeadline } from "./assignments";
import { assertSemesterOpen, byOrder, findSubject, findUnit, subjectOfUnit } from "./shared";

const hierarchyEdge = (source: string, target: string): GraphEdge => ({
  id: `h:${source}->${target}`,
  source,
  target,
  kind: "hierarchy",
});

/** The unit's assignment for side panels: the next one due, otherwise the most recent past one. */
function unitAssignment(store: MockStore, unitId: string, section: string) {
  const forUnit = store.assignments.filter((a) => a.unitId === unitId && a.sections.includes(section));
  const now = new Date().toISOString();
  const upcoming = forUnit.filter((a) => a.dueAt > now).sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  return upcoming ?? forUnit.sort((a, b) => b.dueAt.localeCompare(a.dueAt))[0] ?? null;
}

export const graphMock: GraphApi = {
  async getStudentGraph(semesterNumber) {
    const store = await mockRequest();
    const { user, profile } = await requireStudent(store);
    assertSemesterOpen(profile, semesterNumber);
    const semester = store.semesters.find((s) => s.number === semesterNumber);
    if (!semester) throw fail("NOT_FOUND", "Semester not found.");

    const source = sourceFor(store, user.id);
    const progress = semesterProgress(store, semesterNumber, source);
    const nodes: GraphNode[] = [
      {
        id: semester.id,
        kind: "semester",
        label: `Semester ${semesterNumber}`,
        parentId: null,
        order: semesterNumber,
        percent: progress.percent,
        status: progress.status,
      },
    ];
    const edges: GraphEdge[] = [];
    const hoverCards: StudentHoverCard[] = [];

    const subjects = store.subjects.filter((s) => s.semesterNumber === semesterNumber).sort(byOrder);
    for (const subject of subjects) {
      const subjectProg = subjectProgress(store, subject.id, source);
      nodes.push({
        id: subject.id,
        kind: "subject",
        label: subject.name,
        parentId: semester.id,
        order: subject.order,
        percent: subjectProg.percent,
        status: subjectProg.status,
      });
      edges.push(hierarchyEdge(semester.id, subject.id));
      hoverCards.push({
        kind: "subject",
        id: subject.id,
        title: subject.name,
        percent: subjectProg.percent,
        status: subjectProg.status,
        unitCount: subjectProg.units.length,
        completedUnits: subjectProg.units.filter((u) => u.status === "mastered").length,
        nextDeadline: nextDeadline(store, user.id, profile.section, (a) => a.subjectId === subject.id),
      });

      for (const unit of store.units.filter((u) => u.subjectId === subject.id).sort(byOrder)) {
        const unitProg = unitProgress(store, unit.id, source);
        nodes.push({
          id: unit.id,
          kind: "unit",
          label: unit.title,
          parentId: subject.id,
          order: unit.order,
          percent: unitProg.percent,
          status: unitProg.status,
        });
        edges.push(hierarchyEdge(subject.id, unit.id));
        hoverCards.push({
          kind: "unit",
          id: unit.id,
          title: unit.title,
          percent: unitProg.percent,
          status: unitProg.status,
          topics: unitProg.topics.map((t) => ({ id: t.topicId, title: t.title, covered: t.covered })),
          noteCount: unitProg.topics.reduce((sum, t) => sum + t.noteCount, 0),
          quizAverage: unitProg.quizAverage,
          nextDeadline: nextDeadline(store, user.id, profile.section, (a) => a.unitId === unit.id),
        });
      }
    }

    const subjectIds = new Set(subjects.map((s) => s.id));
    for (const p of store.prerequisites) {
      if (!subjectIds.has(p.subjectId) || !subjectIds.has(p.prerequisiteSubjectId)) continue;
      edges.push({ id: `p:${p.prerequisiteSubjectId}->${p.subjectId}`, source: p.prerequisiteSubjectId, target: p.subjectId, kind: "prerequisite" });
    }

    const graph: StudentGraph = {
      semesterNumber,
      nodes,
      edges,
      hoverCards: Object.fromEntries(hoverCards.map((card) => [card.id, card])),
    };
    return clone(graph);
  },

  async getStudentSidePanel(unitId) {
    const store = await mockRequest(120);
    const { user, profile } = await requireStudent(store);
    const unit = findUnit(store, unitId);
    const subject = findSubject(store, unit.subjectId);
    assertSemesterOpen(profile, subject.semesterNumber);
    const assignment = unitAssignment(store, unitId, profile.section);
    return clone({
      unit: { id: unit.id, title: unit.title, subjectId: subject.id, subjectName: subject.name },
      progress: unitProgress(store, unitId, sourceFor(store, user.id)),
      resources: store.resources
        .filter((r) => r.unitId === unitId && r.visibleSections.includes(profile.section))
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
      assignment: assignment ? toDeadline(store, assignment, user.id) : null,
    });
  },

  async getUnitProgress(unitId) {
    const store = await mockRequest();
    const { user, profile } = await requireStudent(store);
    assertSemesterOpen(profile, subjectOfUnit(store, unitId).semesterNumber);
    return clone(unitProgress(store, unitId, sourceFor(store, user.id)));
  },

  async getFacultyGraph(input) {
    const store = await mockRequest();
    const faculty = await requireFaculty(store);
    assertTeaches(faculty, input.subjectId, input.section);
    const subject = findSubject(store, input.subjectId);

    const units = store.units.filter((u) => u.subjectId === subject.id).sort(byOrder);
    const classUnits = units.map((u) => classUnitProgress(store, u.id, input.section));
    const subjectPercent = round1(classUnits.reduce((sum, c) => sum + c.averagePercent, 0) / Math.max(1, classUnits.length));

    const nodes: GraphNode[] = [
      {
        id: subject.id,
        kind: "subject",
        label: subject.name,
        parentId: null,
        order: subject.order,
        percent: subjectPercent,
        status: statusOf(subjectPercent),
      },
    ];
    const edges: GraphEdge[] = [];
    const hoverCards: FacultyHoverCard[] = [];

    units.forEach((unit, index) => {
      const cls = classUnits[index];
      nodes.push({ id: unit.id, kind: "unit", label: unit.title, parentId: subject.id, order: unit.order, percent: cls.averagePercent, status: cls.status });
      edges.push(hierarchyEdge(subject.id, unit.id));
      hoverCards.push({
        kind: "unit",
        id: unit.id,
        title: unit.title,
        section: input.section,
        averagePercent: cls.averagePercent,
        status: cls.status,
        bands: cls.bands,
        weakestTopic: cls.weakestTopic,
        quizAverage: cls.quizAverage,
      });
      for (const topic of cls.topics) {
        nodes.push({
          id: topic.topicId,
          kind: "topic",
          label: topic.title,
          parentId: unit.id,
          order: topic.order,
          percent: topic.coveragePercent,
          status: statusOf(topic.coveragePercent),
        });
        edges.push(hierarchyEdge(unit.id, topic.topicId));
      }
    });

    const graph: FacultyGraph = {
      subjectId: subject.id,
      section: input.section,
      nodes,
      edges,
      hoverCards: Object.fromEntries(hoverCards.map((card) => [card.id, card])),
    };
    return clone(graph);
  },

  async getFacultySidePanel(input) {
    const store = await mockRequest(120);
    const faculty = await requireFaculty(store);
    const unit = findUnit(store, input.unitId);
    const subject = findSubject(store, unit.subjectId);
    assertTeaches(faculty, subject.id, input.section);

    const cls = classUnitProgress(store, unit.id, input.section);
    const assignment = unitAssignment(store, unit.id, input.section);
    return clone({
      unit: { id: unit.id, title: unit.title, subjectId: subject.id, subjectName: subject.name },
      section: input.section,
      averagePercent: cls.averagePercent,
      status: cls.status,
      topics: cls.topics,
      studentsNeedingHelp: studentsNeedingHelp(store, unit.id, input.section),
      resources: store.resources.filter((r) => r.unitId === unit.id).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
      assignment: assignment
        ? {
            id: assignment.id,
            title: assignment.title,
            subjectName: assignment.subjectName,
            unitId: assignment.unitId,
            dueAt: assignment.dueAt,
            pendingCount: countsFor(store, assignment, [input.section]).pending,
          }
        : null,
    });
  },
};

