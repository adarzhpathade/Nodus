// C-05 — Progress shapes (calculated only in lib/progress, AGENTS.md §6.6). Owner: BE (FE reviews).
// Served through the `graph` and `dashboard` features — there is no separate progress API.
import { z } from "zod";
import { Id, Percent, ProgressStatus, Section, SemesterNumber } from "./common";

export const TopicProgress = z.object({
  topicId: Id,
  title: z.string(),
  order: z.number().int(),
  covered: z.boolean(),
  noteCount: z.number().int().nonnegative(),
  /** Best quiz score on this topic, null if never attempted. */
  bestQuizScore: Percent.nullable(),
});
export type TopicProgress = z.infer<typeof TopicProgress>;

export const UnitProgress = z.object({
  unitId: Id,
  percent: Percent,
  status: ProgressStatus,
  coveredTopics: z.number().int().nonnegative(),
  totalTopics: z.number().int().nonnegative(),
  /** Average of the student's quiz scores in this unit, null if none. */
  quizAverage: Percent.nullable(),
  topics: z.array(TopicProgress),
});
export type UnitProgress = z.infer<typeof UnitProgress>;

export const ProgressSummary = z.object({
  id: Id,
  title: z.string(),
  percent: Percent,
  status: ProgressStatus,
});
export type ProgressSummary = z.infer<typeof ProgressSummary>;

export const SubjectProgress = z.object({
  subjectId: Id,
  percent: Percent,
  status: ProgressStatus,
  units: z.array(ProgressSummary),
});
export type SubjectProgress = z.infer<typeof SubjectProgress>;

export const SemesterProgress = z.object({
  semesterNumber: SemesterNumber,
  percent: Percent,
  status: ProgressStatus,
  subjects: z.array(ProgressSummary),
});
export type SemesterProgress = z.infer<typeof SemesterProgress>;

// ---------- Faculty (class-level, aggregated — never note content) ----------

/** Number of students in each status band. */
export const StatusBands = z.object({
  notStarted: z.number().int().nonnegative(),
  low: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  mastered: z.number().int().nonnegative(),
});
export type StatusBands = z.infer<typeof StatusBands>;

export const ClassTopicProgress = z.object({
  topicId: Id,
  title: z.string(),
  order: z.number().int(),
  /** % of students in the section who have covered this topic. */
  coveragePercent: Percent,
});
export type ClassTopicProgress = z.infer<typeof ClassTopicProgress>;

export const StudentNeedingHelp = z.object({
  studentId: Id,
  name: z.string(),
  percent: Percent,
  status: ProgressStatus,
});
export type StudentNeedingHelp = z.infer<typeof StudentNeedingHelp>;

export const ClassUnitProgress = z.object({
  unitId: Id,
  section: Section,
  averagePercent: Percent,
  status: ProgressStatus,
  bands: StatusBands,
  quizAverage: Percent.nullable(),
  weakestTopic: ClassTopicProgress.nullable(),
  topics: z.array(ClassTopicProgress),
});
export type ClassUnitProgress = z.infer<typeof ClassUnitProgress>;
