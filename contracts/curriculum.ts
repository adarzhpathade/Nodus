// C-02 — Semesters, subjects, prerequisites, units and topics. Owner: BE (FE reviews).
import { z } from "zod";
import { Id, SemesterNumber } from "./common";

export const Semester = z.object({
  id: Id,
  number: SemesterNumber,
  /** Future semesters are locked: visible in the switcher but disabled. */
  locked: z.boolean(),
  isCurrent: z.boolean(),
});
export type Semester = z.infer<typeof Semester>;

export const Subject = z.object({
  id: Id,
  semesterNumber: SemesterNumber,
  code: z.string(),
  name: z.string(),
  order: z.number().int(),
});
export type Subject = z.infer<typeof Subject>;

export const Prerequisite = z.object({
  subjectId: Id,
  prerequisiteSubjectId: Id,
});
export type Prerequisite = z.infer<typeof Prerequisite>;

export const Topic = z.object({
  id: Id,
  unitId: Id,
  title: z.string(),
  order: z.number().int(),
});
export type Topic = z.infer<typeof Topic>;

export const Unit = z.object({
  id: Id,
  subjectId: Id,
  title: z.string(),
  order: z.number().int(),
});
export type Unit = z.infer<typeof Unit>;

export const UnitWithTopics = Unit.extend({ topics: z.array(Topic) });
export type UnitWithTopics = z.infer<typeof UnitWithTopics>;

export const SubjectDetail = Subject.extend({ units: z.array(UnitWithTopics) });
export type SubjectDetail = z.infer<typeof SubjectDetail>;

export const UnitDetail = z.object({
  subject: Subject,
  unit: Unit,
  topics: z.array(Topic),
});
export type UnitDetail = z.infer<typeof UnitDetail>;

// ---------- Faculty inputs ----------

const Title = z.string().trim().min(1).max(120);

export const CreateUnitInput = z.object({ subjectId: Id, title: Title });
export type CreateUnitInput = z.infer<typeof CreateUnitInput>;

export const RenameUnitInput = z.object({ unitId: Id, title: Title });
export type RenameUnitInput = z.infer<typeof RenameUnitInput>;

/** Full new order of the children of `parentId` (subjectId for units, unitId for topics). */
export const ReorderInput = z.object({ parentId: Id, orderedIds: z.array(Id).min(1) });
export type ReorderInput = z.infer<typeof ReorderInput>;

export const DeleteUnitInput = z.object({ unitId: Id });
export type DeleteUnitInput = z.infer<typeof DeleteUnitInput>;

export const CreateTopicInput = z.object({ unitId: Id, title: Title });
export type CreateTopicInput = z.infer<typeof CreateTopicInput>;

export const RenameTopicInput = z.object({ topicId: Id, title: Title });
export type RenameTopicInput = z.infer<typeof RenameTopicInput>;

export const DeleteTopicInput = z.object({ topicId: Id });
export type DeleteTopicInput = z.infer<typeof DeleteTopicInput>;

export interface CurriculumApi {
  /** All semesters of the viewer's branch, with lock state. */
  listSemesters(): Promise<Semester[]>;
  /** Throws LOCKED for a future semester (students). */
  listSubjects(semesterNumber: number): Promise<Subject[]>;
  listPrerequisites(semesterNumber: number): Promise<Prerequisite[]>;
  getSubject(subjectId: string): Promise<SubjectDetail>;
  getUnit(unitId: string): Promise<UnitDetail>;

  // Faculty only (own subjects). Throw FORBIDDEN otherwise.
  createUnit(input: CreateUnitInput): Promise<Unit>;
  renameUnit(input: RenameUnitInput): Promise<Unit>;
  reorderUnits(input: ReorderInput): Promise<Unit[]>;
  /** Throws CONFLICT if any topic of the unit has student notes. */
  deleteUnit(input: DeleteUnitInput): Promise<void>;
  createTopic(input: CreateTopicInput): Promise<Topic>;
  renameTopic(input: RenameTopicInput): Promise<Topic>;
  reorderTopics(input: ReorderInput): Promise<Topic[]>;
  /** Throws CONFLICT if the topic has student notes. */
  deleteTopic(input: DeleteTopicInput): Promise<void>;
}
