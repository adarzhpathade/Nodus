// C-06 — Graph View data (tree + hover card + side panel), student and faculty. Owner: BE (FE reviews).
// Layout is FE's job (React Flow + dagre). The backend only sends nodes, edges and their data.
import { z } from "zod";
import { AssignmentStatus, AssignmentSummary } from "./assignments";
import { Id, Percent, ProgressStatus, Section, SemesterNumber } from "./common";
import { ClassTopicProgress, StatusBands, StudentNeedingHelp, UnitProgress } from "./progress";
import { Resource } from "./resources";

export const GraphNodeKind = z.enum(["semester", "subject", "unit", "topic"]);
export type GraphNodeKind = z.infer<typeof GraphNodeKind>;

export const GraphNode = z.object({
  /** Same as the entity id (semester/subject/unit/topic id). */
  id: Id,
  kind: GraphNodeKind,
  label: z.string(),
  parentId: Id.nullable(),
  order: z.number().int(),
  /** Student: own progress. Faculty: class average. */
  percent: Percent,
  status: ProgressStatus,
});
export type GraphNode = z.infer<typeof GraphNode>;

export const GraphEdge = z.object({
  id: z.string(),
  source: Id,
  target: Id,
  /** hierarchy = parent → child (solid). prerequisite = subject → subject (dashed). */
  kind: z.enum(["hierarchy", "prerequisite"]),
});
export type GraphEdge = z.infer<typeof GraphEdge>;

export const UpcomingDeadline = AssignmentSummary.extend({ status: AssignmentStatus });
export type UpcomingDeadline = z.infer<typeof UpcomingDeadline>;

// ---------- Student ----------

/** Hover card data — sent WITH the graph (keyed by node id) so hovering never waits on the network. */
export const StudentHoverCard = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("subject"),
    id: Id,
    title: z.string(),
    percent: Percent,
    status: ProgressStatus,
    unitCount: z.number().int(),
    completedUnits: z.number().int(),
    nextDeadline: UpcomingDeadline.nullable(),
  }),
  z.object({
    kind: z.literal("unit"),
    id: Id,
    title: z.string(),
    percent: Percent,
    status: ProgressStatus,
    topics: z.array(z.object({ id: Id, title: z.string(), covered: z.boolean() })),
    noteCount: z.number().int(),
    quizAverage: Percent.nullable(),
    nextDeadline: UpcomingDeadline.nullable(),
  }),
]);
export type StudentHoverCard = z.infer<typeof StudentHoverCard>;

export const StudentGraph = z.object({
  semesterNumber: SemesterNumber,
  /** Root semester node, its subjects and their units. Topics are shown in the side panel, not as nodes. */
  nodes: z.array(GraphNode),
  edges: z.array(GraphEdge),
  hoverCards: z.record(Id, StudentHoverCard),
});
export type StudentGraph = z.infer<typeof StudentGraph>;

export const StudentSidePanel = z.object({
  unit: z.object({ id: Id, title: z.string(), subjectId: Id, subjectName: z.string() }),
  progress: UnitProgress,
  resources: z.array(Resource),
  assignment: UpcomingDeadline.nullable(),
});
export type StudentSidePanel = z.infer<typeof StudentSidePanel>;

// ---------- Faculty ----------

export const FacultyHoverCard = z.object({
  kind: z.literal("unit"),
  id: Id,
  title: z.string(),
  section: Section,
  averagePercent: Percent,
  status: ProgressStatus,
  bands: StatusBands,
  weakestTopic: ClassTopicProgress.nullable(),
  quizAverage: Percent.nullable(),
});
export type FacultyHoverCard = z.infer<typeof FacultyHoverCard>;

export const FacultyGraph = z.object({
  subjectId: Id,
  section: Section,
  /** Subject root → units → topics, with class-average percents. */
  nodes: z.array(GraphNode),
  edges: z.array(GraphEdge),
  hoverCards: z.record(Id, FacultyHoverCard),
});
export type FacultyGraph = z.infer<typeof FacultyGraph>;

export const FacultySidePanel = z.object({
  unit: z.object({ id: Id, title: z.string(), subjectId: Id, subjectName: z.string() }),
  section: Section,
  averagePercent: Percent,
  status: ProgressStatus,
  topics: z.array(ClassTopicProgress),
  studentsNeedingHelp: z.array(StudentNeedingHelp),
  resources: z.array(Resource),
  assignment: AssignmentSummary.extend({ pendingCount: z.number().int() }).nullable(),
});
export type FacultySidePanel = z.infer<typeof FacultySidePanel>;

export interface GraphApi {
  /** Throws LOCKED for a future semester. */
  getStudentGraph(semesterNumber: number): Promise<StudentGraph>;
  getStudentSidePanel(unitId: string): Promise<StudentSidePanel>;
  /** Fresh unit progress, e.g. after a note is created or a quiz is submitted. */
  getUnitProgress(unitId: string): Promise<UnitProgress>;

  getFacultyGraph(input: { subjectId: string; section: string }): Promise<FacultyGraph>;
  getFacultySidePanel(input: { unitId: string; section: string }): Promise<FacultySidePanel>;
}
