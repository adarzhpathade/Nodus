// C-09 — Stats-first dashboards (student + faculty). Owner: BE (FE reviews).
// One call returns everything a dashboard needs, so widgets render together.
import { z } from "zod";
import { Id, DateOnly, Percent, ProgressStatus, Section, SemesterNumber } from "./common";
import { UpcomingDeadline } from "./graph";

// ---------- Student ----------

export const StudentStats = z.object({
  notesCount: z.number().int(),
  notesThisWeek: z.number().int(),
  semesterPercent: Percent,
  semesterStatus: ProgressStatus,
  quizAverage: Percent.nullable(),
  /** Change vs the previous 7 days, in percentage points; null if not enough data. */
  quizAverageDelta: z.number().nullable(),
  assignmentsSubmitted: z.number().int(),
  assignmentsTotal: z.number().int(),
  streakDays: z.number().int(),
});
export type StudentStats = z.infer<typeof StudentStats>;

export const CoverageRing = z.object({
  subjectId: Id,
  name: z.string(),
  code: z.string(),
  percent: Percent,
  status: ProgressStatus,
});
export type CoverageRing = z.infer<typeof CoverageRing>;

/** One cell of the activity heatmap. `count` = notes + quizzes + AI questions + resources opened that day. */
export const HeatmapDay = z.object({ date: DateOnly, count: z.number().int().nonnegative() });
export type HeatmapDay = z.infer<typeof HeatmapDay>;

export const RadarPoint = z.object({ subjectId: Id, subject: z.string(), value: Percent });
export type RadarPoint = z.infer<typeof RadarPoint>;

export const QuizTrendPoint = z.object({
  date: DateOnly,
  subjectId: Id,
  subjectName: z.string(),
  score: Percent,
});
export type QuizTrendPoint = z.infer<typeof QuizTrendPoint>;

export const StudentDashboard = z.object({
  semesterNumber: SemesterNumber,
  stats: StudentStats,
  coverage: z.array(CoverageRing),
  /** Last ~180 days, oldest first, every day present (zeros included). */
  activity: z.array(HeatmapDay),
  /** Upcoming and recently due, soonest first. */
  deadlines: z.array(UpcomingDeadline),
  radar: z.array(RadarPoint),
  quizTrend: z.array(QuizTrendPoint),
});
export type StudentDashboard = z.infer<typeof StudentDashboard>;

// ---------- Faculty ----------

export const FacultyStats = z.object({
  students: z.number().int(),
  averageProgress: Percent,
  pendingMarking: z.number().int(),
  activeAssignments: z.number().int(),
});
export type FacultyStats = z.infer<typeof FacultyStats>;

export const SectionComparison = z.object({
  section: Section,
  averagePercent: Percent,
  quizAverage: Percent.nullable(),
});
export type SectionComparison = z.infer<typeof SectionComparison>;

/** Units × sections heatmap cell. */
export const WeakUnitCell = z.object({
  unitId: Id,
  unitTitle: z.string(),
  section: Section,
  averagePercent: Percent,
  status: ProgressStatus,
});
export type WeakUnitCell = z.infer<typeof WeakUnitCell>;

export const SubmissionDonut = z.object({
  section: Section,
  submitted: z.number().int(),
  late: z.number().int(),
  notSubmitted: z.number().int(),
  pending: z.number().int(),
});
export type SubmissionDonut = z.infer<typeof SubmissionDonut>;

/** Aggregated counts only — never question text or student identity. */
export const AiTopicCount = z.object({ topicId: Id, title: z.string(), questionCount: z.number().int() });
export type AiTopicCount = z.infer<typeof AiTopicCount>;

export const FacultyDashboard = z.object({
  subjectId: Id,
  subjectName: z.string(),
  stats: FacultyStats,
  sectionComparison: z.array(SectionComparison),
  weakUnits: z.array(WeakUnitCell),
  submissions: z.array(SubmissionDonut),
  topAiTopics: z.array(AiTopicCount),
});
export type FacultyDashboard = z.infer<typeof FacultyDashboard>;

export interface DashboardApi {
  getStudentDashboard(semesterNumber: number): Promise<StudentDashboard>;
  /** Across all sections the faculty teaches for this subject. */
  getFacultyDashboard(input: { subjectId: string }): Promise<FacultyDashboard>;
}
