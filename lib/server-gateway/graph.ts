// Real GraphApi (C-06). Implements BE-6.1 … BE-6.5, BE-6.7. Owner: BE.
import "server-only";
import { GatewayError } from "@/contracts/common";
import type {
  FacultyGraph,
  FacultyHoverCard,
  FacultySidePanel,
  GraphApi,
  GraphEdge,
  GraphNode,
  StudentGraph,
  StudentHoverCard,
  StudentSidePanel,
} from "@/contracts/graph";
import type { Resource, ResourceType } from "@/contracts/resources";
import type { UnitProgress } from "@/contracts/progress";
import {
  assertSemesterOpen,
  requireFacultyTeaches,
  requireStudent,
} from "@/lib/auth/guards";
import {
  calculateClassUnitProgress,
  calculateSemesterProgress,
  calculateStudentsNeedingHelp,
  calculateSubjectProgress,
  calculateUnitProgress,
  round1,
  statusOf,
  type StudentHelpItemInput,
} from "@/lib/progress";
import { findUnitWithSubject } from "@/lib/db/queries/curriculum";
import { listPrerequisitesForSubjects } from "@/lib/db/queries/graph";
import {
  getSectionProgressRawData,
  getStudentSemesterProgressRawData,
  getStudentUnitProgressRawData,
} from "@/lib/db/queries/progress";
import {
  listResourcesForUnit,
  type ResourceRecord,
} from "@/lib/db/queries/resources";

function hierarchyEdge(source: string, target: string): GraphEdge {
  return {
    id: `h:${source}->${target}`,
    source,
    target,
    kind: "hierarchy",
  };
}

function prerequisiteEdge(source: string, target: string): GraphEdge {
  return {
    id: `p:${source}->${target}`,
    source,
    target,
    kind: "prerequisite",
  };
}

function toResource(
  record: ResourceRecord,
  uploader: { id: string; name: string },
): Resource {
  return {
    id: record.id,
    unitId: record.unitId,
    fileName: record.fileName,
    type: record.type as ResourceType,
    sizeBytes: record.sizeBytes,
    visibleSections: record.visibleSections,
    uploadedBy: {
      id: uploader.id,
      name: uploader.name,
    },
    uploadedAt: record.createdAt.toISOString(),
    ingestion: {
      status: record.ingestionStatus,
      pageCount: record.pageCount ?? null,
      error: record.ingestionError ?? null,
      updatedAt: record.updatedAt.toISOString(),
    },
  };
}

export const graphApi: GraphApi = {
  async getStudentGraph(semesterNumber: number): Promise<StudentGraph> {
    const student = await requireStudent();
    assertSemesterOpen(student, semesterNumber);

    const raw = await getStudentSemesterProgressRawData(
      student.user.id,
      student.profile.branch.id,
      semesterNumber,
    );

    if (!raw) {
      throw new GatewayError("NOT_FOUND", "Semester not found.");
    }

    const subjectProgressList: {
      subjectId: string;
      title: string;
      percent: number;
      status: ReturnType<typeof statusOf>;
      unitProgresses: UnitProgress[];
    }[] = [];

    // Calculate unit and subject progresses
    for (const subject of raw.subjects) {
      const unitProgresses: UnitProgress[] = [];

      for (const unit of subject.units) {
        const topicsInput = unit.topics.map((t) => ({
          topicId: t.id,
          title: t.title,
          order: t.order,
          noteCount: raw.noteCountsByTopic.get(t.id) ?? 0,
          bestQuizScore: raw.bestQuizScoreByTopic.get(t.id) ?? null,
        }));
        const quizScores = raw.quizScoresByUnit.get(unit.id) ?? [];

        const unitProg = calculateUnitProgress({
          unitId: unit.id,
          topics: topicsInput,
          quizScores,
        });

        unitProgresses.push(unitProg);
      }

      const subjectProg = calculateSubjectProgress({
        subjectId: subject.id,
        units: unitProgresses.map((u, i) => ({
          id: u.unitId,
          title: subject.units[i]?.title ?? "",
          percent: u.percent,
          status: u.status,
        })),
      });

      subjectProgressList.push({
        subjectId: subject.id,
        title: subject.name,
        percent: subjectProg.percent,
        status: subjectProg.status,
        unitProgresses,
      });
    }

    // Semester progress
    const semesterProg = calculateSemesterProgress({
      semesterNumber,
      subjects: subjectProgressList.map((s) => ({
        id: s.subjectId,
        title: s.title,
        percent: s.percent,
        status: s.status,
      })),
    });

    // Build Graph Nodes and Edges
    const nodes: GraphNode[] = [
      {
        id: raw.semesterId,
        kind: "semester",
        label: `Semester ${semesterNumber}`,
        parentId: null,
        order: semesterNumber,
        percent: semesterProg.percent,
        status: semesterProg.status,
      },
    ];

    const edges: GraphEdge[] = [];
    const hoverCards: Record<string, StudentHoverCard> = {};

    for (let sIdx = 0; sIdx < raw.subjects.length; sIdx++) {
      const subject = raw.subjects[sIdx];
      const sProg = subjectProgressList[sIdx];

      nodes.push({
        id: subject.id,
        kind: "subject",
        label: subject.name,
        parentId: raw.semesterId,
        order: subject.order,
        percent: sProg.percent,
        status: sProg.status,
      });

      edges.push(hierarchyEdge(raw.semesterId, subject.id));

      hoverCards[subject.id] = {
        kind: "subject",
        id: subject.id,
        title: subject.name,
        percent: sProg.percent,
        status: sProg.status,
        unitCount: sProg.unitProgresses.length,
        completedUnits: sProg.unitProgresses.filter((u) => u.status === "mastered").length,
        nextDeadline: null, // BE-8 assignments not built yet
      };

      for (let uIdx = 0; uIdx < subject.units.length; uIdx++) {
        const unit = subject.units[uIdx];
        const uProg = sProg.unitProgresses[uIdx];

        nodes.push({
          id: unit.id,
          kind: "unit",
          label: unit.title,
          parentId: subject.id,
          order: unit.order,
          percent: uProg.percent,
          status: uProg.status,
        });

        edges.push(hierarchyEdge(subject.id, unit.id));

        hoverCards[unit.id] = {
          kind: "unit",
          id: unit.id,
          title: unit.title,
          percent: uProg.percent,
          status: uProg.status,
          topics: uProg.topics.map((t) => ({
            id: t.topicId,
            title: t.title,
            covered: t.covered,
          })),
          noteCount: uProg.topics.reduce((sum, t) => sum + t.noteCount, 0),
          quizAverage: uProg.quizAverage,
          nextDeadline: null, // BE-8 assignments not built yet
        };
      }
    }

    // Prerequisite edges between subjects in this semester
    const subjectIds = new Set(raw.subjects.map((s) => s.id));
    const prereqRecords = await listPrerequisitesForSubjects([...subjectIds]);
    for (const p of prereqRecords) {
      if (subjectIds.has(p.subjectId) && subjectIds.has(p.prerequisiteSubjectId)) {
        edges.push(prerequisiteEdge(p.prerequisiteSubjectId, p.subjectId));
      }
    }

    return {
      semesterNumber,
      nodes,
      edges,
      hoverCards,
    };
  },

  async getStudentSidePanel(unitId: string): Promise<StudentSidePanel> {
    const student = await requireStudent();
    const raw = await getStudentUnitProgressRawData(student.user.id, unitId);

    if (!raw || raw.subject.branchId !== student.profile.branch.id) {
      throw new GatewayError("NOT_FOUND", "Unit not found.");
    }

    assertSemesterOpen(student, raw.subject.semesterNumber);

    const progress = calculateUnitProgress({
      unitId: raw.unit.id,
      topics: raw.topics.map((t) => ({
        topicId: t.id,
        title: t.title,
        order: t.order,
        noteCount: raw.noteCountsByTopic.get(t.id) ?? 0,
        bestQuizScore: raw.bestQuizScoreByTopic.get(t.id) ?? null,
      })),
      quizScores: raw.quizScores,
    });

    const resourceRows = await listResourcesForUnit(unitId, student.profile.section);
    const resources = resourceRows.map((r) => toResource(r.resource, r.uploader));

    return {
      unit: {
        id: raw.unit.id,
        title: raw.unit.title,
        subjectId: raw.subject.id,
        subjectName: raw.subject.name,
      },
      progress,
      resources,
      assignment: null, // BE-8 assignments not built yet
    };
  },

  async getUnitProgress(unitId: string): Promise<UnitProgress> {
    const student = await requireStudent();
    const raw = await getStudentUnitProgressRawData(student.user.id, unitId);

    if (!raw || raw.subject.branchId !== student.profile.branch.id) {
      throw new GatewayError("NOT_FOUND", "Unit not found.");
    }

    assertSemesterOpen(student, raw.subject.semesterNumber);

    return calculateUnitProgress({
      unitId: raw.unit.id,
      topics: raw.topics.map((t) => ({
        topicId: t.id,
        title: t.title,
        order: t.order,
        noteCount: raw.noteCountsByTopic.get(t.id) ?? 0,
        bestQuizScore: raw.bestQuizScoreByTopic.get(t.id) ?? null,
      })),
      quizScores: raw.quizScores,
    });
  },

  async getFacultyGraph(input: { subjectId: string; section: string }): Promise<FacultyGraph> {
    await requireFacultyTeaches(input.subjectId, input.section);

    const raw = await getSectionProgressRawData(input.subjectId, input.section);
    if (!raw) {
      throw new GatewayError("NOT_FOUND", "Subject not found.");
    }

    const classUnits = raw.units.map((unit) => {
      const perStudentProgs: UnitProgress[] = raw.roster.map((st) => {
        const stNotes = raw.noteCountsByStudentAndTopic.get(st.id);
        const stBestScores = raw.bestTopicScoresByStudent.get(st.id);
        const stQuizScores = raw.unitScoresByStudentAndUnit.get(st.id)?.get(unit.id) ?? [];

        return calculateUnitProgress({
          unitId: unit.id,
          topics: unit.topics.map((t) => ({
            topicId: t.id,
            title: t.title,
            order: t.order,
            noteCount: stNotes?.get(t.id) ?? 0,
            bestQuizScore: stBestScores?.get(t.id) ?? null,
          })),
          quizScores: stQuizScores,
        });
      });

      return calculateClassUnitProgress({
        unitId: unit.id,
        section: input.section,
        topics: unit.topics.map((t) => ({
          topicId: t.id,
          title: t.title,
          order: t.order,
        })),
        studentUnitProgresses: perStudentProgs,
      });
    });

    const sumAveragePercent = classUnits.reduce((sum, c) => sum + c.averagePercent, 0);
    const subjectPercent = round1(
      classUnits.length > 0 ? sumAveragePercent / classUnits.length : 0,
    );

    const nodes: GraphNode[] = [
      {
        id: raw.subject.id,
        kind: "subject",
        label: raw.subject.name,
        parentId: null,
        order: 0,
        percent: subjectPercent,
        status: statusOf(subjectPercent),
      },
    ];

    const edges: GraphEdge[] = [];
    const hoverCards: Record<string, FacultyHoverCard> = {};

    raw.units.forEach((unit, index) => {
      const cls = classUnits[index];

      nodes.push({
        id: unit.id,
        kind: "unit",
        label: unit.title,
        parentId: raw.subject.id,
        order: unit.order,
        percent: cls.averagePercent,
        status: cls.status,
      });
      edges.push(hierarchyEdge(raw.subject.id, unit.id));

      hoverCards[unit.id] = {
        kind: "unit",
        id: unit.id,
        title: unit.title,
        section: input.section,
        averagePercent: cls.averagePercent,
        status: cls.status,
        bands: cls.bands,
        weakestTopic: cls.weakestTopic,
        quizAverage: cls.quizAverage,
      };

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

    return {
      subjectId: raw.subject.id,
      section: input.section,
      nodes,
      edges,
      hoverCards,
    };
  },

  async getFacultySidePanel(input: { unitId: string; section: string }): Promise<FacultySidePanel> {
    const unitInfo = await findUnitWithSubject(input.unitId);
    if (!unitInfo) {
      throw new GatewayError("NOT_FOUND", "Unit not found.");
    }

    await requireFacultyTeaches(unitInfo.subject.id, input.section);

    const raw = await getSectionProgressRawData(unitInfo.subject.id, input.section);
    if (!raw) {
      throw new GatewayError("NOT_FOUND", "Subject not found.");
    }

    const studentHelpList: StudentHelpItemInput[] = [];
    const perStudentProgs: UnitProgress[] = [];

    for (const st of raw.roster) {
      const stNotes = raw.noteCountsByStudentAndTopic.get(st.id);
      const stBestScores = raw.bestTopicScoresByStudent.get(st.id);
      const stQuizScores = raw.unitScoresByStudentAndUnit.get(st.id)?.get(input.unitId) ?? [];

      const stProg = calculateUnitProgress({
        unitId: input.unitId,
        topics: unitInfo.topics.map((t) => ({
          topicId: t.id,
          title: t.title,
          order: t.order,
          noteCount: stNotes?.get(t.id) ?? 0,
          bestQuizScore: stBestScores?.get(t.id) ?? null,
        })),
        quizScores: stQuizScores,
      });

      perStudentProgs.push(stProg);
      studentHelpList.push({
        studentId: st.id,
        name: st.name,
        unitPercent: stProg.percent,
      });
    }

    const cls = calculateClassUnitProgress({
      unitId: input.unitId,
      section: input.section,
      topics: unitInfo.topics.map((t) => ({
        topicId: t.id,
        title: t.title,
        order: t.order,
      })),
      studentUnitProgresses: perStudentProgs,
    });

    const studentsNeedingHelp = calculateStudentsNeedingHelp(studentHelpList);
    const resourceRows = await listResourcesForUnit(input.unitId);
    const resources = resourceRows.map((r) => toResource(r.resource, r.uploader));

    return {
      unit: {
        id: unitInfo.unit.id,
        title: unitInfo.unit.title,
        subjectId: unitInfo.subject.id,
        subjectName: unitInfo.subject.name,
      },
      section: input.section,
      averagePercent: cls.averagePercent,
      status: cls.status,
      topics: cls.topics,
      studentsNeedingHelp,
      resources,
      assignment: null, // BE-8 assignments not built yet
    };
  },
};
