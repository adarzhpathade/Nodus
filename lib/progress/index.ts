// Progress calculation engine (AGENTS.md §6.6, C-05). Owner: BE.
// PURE FUNCTIONS ONLY — NO DATABASE ACCESS OR SIDE EFFECTS.
// Single source of truth for all progress calculations across student and faculty views.

import type { ProgressStatus } from "@/contracts/common";
import type {
  ClassTopicProgress,
  ClassUnitProgress,
  ProgressSummary,
  SemesterProgress,
  StatusBands,
  StudentNeedingHelp,
  SubjectProgress,
  TopicProgress,
  UnitProgress,
} from "@/contracts/progress";

/** Rounds a percentage to 1 decimal place. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Computes the average of an array of numbers, or null if empty. */
export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

/**
 * Maps a percentage (0–100) to its status band (AGENTS.md §6.7):
 * - 0% → "not_started"
 * - 1–39% → "low"
 * - 40–75% → "in_progress"
 * - >75% → "mastered"
 */
export function statusOf(percent: number): ProgressStatus {
  if (percent <= 0) return "not_started";
  if (percent < 40) return "low";
  if (percent <= 75) return "in_progress";
  return "mastered";
}

/**
 * Topic covered rule (AGENTS.md §6.6):
 * topic has >= 1 student note AND (no quiz attempted on that topic OR best quiz score >= 50%).
 * Edge case: best quiz score < 50% blocks "covered" even if notes exist.
 */
export function isTopicCovered(noteCount: number, bestQuizScore: number | null): boolean {
  if (noteCount <= 0) return false;
  if (bestQuizScore !== null && bestQuizScore < 50) return false;
  return true;
}

export interface TopicProgressInput {
  topicId: string;
  title: string;
  order: number;
  noteCount: number;
  bestQuizScore: number | null;
}

/** Computes single topic progress. */
export function calculateTopicProgress(input: TopicProgressInput): TopicProgress {
  const covered = isTopicCovered(input.noteCount, input.bestQuizScore);
  return {
    topicId: input.topicId,
    title: input.title,
    order: input.order,
    covered,
    noteCount: Math.max(0, input.noteCount),
    bestQuizScore: input.bestQuizScore === null ? null : round1(input.bestQuizScore),
  };
}

export interface UnitProgressInput {
  unitId: string;
  topics: TopicProgressInput[];
  /** Array of all quiz scores attempted by the student in this unit (each 0–100). */
  quizScores: number[];
}

/**
 * Unit progress formula (AGENTS.md §6.6):
 * Unit coverage   = covered topics / total topics
 * Unit %          = 0.7 × (unit coverage × 100) + 0.3 × unit quiz average
 *                   (if no quiz attempted yet: Unit % = unit coverage × 70)
 * Edge cases:
 * - Unit with no topics: coverage = 0.
 * - No quiz attempted: unit % = coverage × 70.
 */
export function calculateUnitProgress(input: UnitProgressInput): UnitProgress {
  const topics: TopicProgress[] = input.topics
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(calculateTopicProgress);

  const totalTopics = topics.length;
  const coveredTopics = topics.filter((t) => t.covered).length;
  const coverageFraction = totalTopics > 0 ? coveredTopics / totalTopics : 0;

  const rawQuizAvg = average(input.quizScores);
  const quizAverage = rawQuizAvg === null ? null : round1(rawQuizAvg);

  let rawPercent: number;
  if (quizAverage === null) {
    // 0.7 * unit coverage (on 0–100 scale: coverageFraction * 70)
    rawPercent = coverageFraction * 70;
  } else {
    // 0.7 * (coverageFraction * 100) + 0.3 * quizAverage
    rawPercent = coverageFraction * 70 + quizAverage * 0.3;
  }

  const percent = round1(rawPercent);
  const status = statusOf(percent);

  return {
    unitId: input.unitId,
    percent,
    status,
    coveredTopics,
    totalTopics,
    quizAverage,
    topics,
  };
}

export interface SubjectProgressInput {
  subjectId: string;
  units: Array<{
    id: string;
    title: string;
    percent: number;
    status: ProgressStatus;
    order?: number;
  }>;
}

/**
 * Subject % formula (AGENTS.md §6.6):
 * Subject % = average of its units' %
 */
export function calculateSubjectProgress(input: SubjectProgressInput): SubjectProgress {
  const units: ProgressSummary[] = input.units.map((u) => ({
    id: u.id,
    title: u.title,
    percent: round1(u.percent),
    status: u.status,
  }));

  const unitPercents = input.units.map((u) => u.percent);
  const avg = average(unitPercents);
  const percent = avg === null ? 0 : round1(avg);
  const status = statusOf(percent);

  return {
    subjectId: input.subjectId,
    percent,
    status,
    units,
  };
}

export interface SemesterProgressInput {
  semesterNumber: number;
  subjects: Array<{
    id: string;
    title: string;
    percent: number;
    status: ProgressStatus;
    order?: number;
  }>;
}

/**
 * Semester % formula (AGENTS.md §6.6):
 * Semester % = average of its subjects' %
 */
export function calculateSemesterProgress(input: SemesterProgressInput): SemesterProgress {
  const subjects: ProgressSummary[] = input.subjects.map((s) => ({
    id: s.id,
    title: s.title,
    percent: round1(s.percent),
    status: s.status,
  }));

  const subjectPercents = input.subjects.map((s) => s.percent);
  const avg = average(subjectPercents);
  const percent = avg === null ? 0 : round1(avg);
  const status = statusOf(percent);

  return {
    semesterNumber: input.semesterNumber,
    percent,
    status,
    subjects,
  };
}

/** Counts students in each status band. */
export function calculateStatusBands(statuses: ProgressStatus[]): StatusBands {
  const bands: StatusBands = {
    notStarted: 0,
    low: 0,
    inProgress: 0,
    mastered: 0,
  };

  for (const status of statuses) {
    if (status === "not_started") bands.notStarted++;
    else if (status === "low") bands.low++;
    else if (status === "in_progress") bands.inProgress++;
    else if (status === "mastered") bands.mastered++;
  }

  return bands;
}

export interface ClassUnitProgressInput {
  unitId: string;
  section: string;
  topics: Array<{
    topicId: string;
    title: string;
    order: number;
  }>;
  /** Each student in the section's unit progress. */
  studentUnitProgresses: UnitProgress[];
}

/**
 * Class unit % formula (AGENTS.md §6.6):
 * Class unit % = average of all students' unit % in a section (faculty view).
 * Also computes weakest topic, topic coverage % across the section, and status bands.
 */
export function calculateClassUnitProgress(input: ClassUnitProgressInput): ClassUnitProgress {
  const totalStudents = input.studentUnitProgresses.length;

  // Topic coverage across the section
  const topics: ClassTopicProgress[] = input.topics
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((t) => {
      let coveredCount = 0;
      for (const st of input.studentUnitProgresses) {
        const match = st.topics.find((tp) => tp.topicId === t.topicId);
        if (match?.covered) {
          coveredCount++;
        }
      }
      const coveragePercent = totalStudents > 0 ? round1((coveredCount / totalStudents) * 100) : 0;
      return {
        topicId: t.topicId,
        title: t.title,
        order: t.order,
        coveragePercent,
      };
    });

  // Weakest topic: topic with the lowest coverage percent (first/lowest order if tied)
  const weakestTopic: ClassTopicProgress | null =
    topics.length > 0
      ? topics.reduce((min, cur) => (cur.coveragePercent < min.coveragePercent ? cur : min))
      : null;

  // Bands
  const bands = calculateStatusBands(input.studentUnitProgresses.map((p) => p.status));

  // Average unit % across students
  const studentPercents = input.studentUnitProgresses.map((p) => p.percent);
  const avgPercent = average(studentPercents);
  const averagePercent = avgPercent === null ? 0 : round1(avgPercent);
  const status = statusOf(averagePercent);

  // Class quiz average: average of non-null quiz averages among students
  const quizAverages = input.studentUnitProgresses
    .map((p) => p.quizAverage)
    .filter((q): q is number => q !== null);
  const classQuizAvg = average(quizAverages);
  const quizAverage = classQuizAvg === null ? null : round1(classQuizAvg);

  return {
    unitId: input.unitId,
    section: input.section,
    averagePercent,
    status,
    bands,
    quizAverage,
    weakestTopic,
    topics,
  };
}

export interface StudentHelpItemInput {
  studentId: string;
  name: string;
  unitPercent: number;
}

/**
 * Filter students needing help in a unit (< 40% unit progress, lowest first).
 */
export function calculateStudentsNeedingHelp(
  students: StudentHelpItemInput[],
  limit = 6,
): StudentNeedingHelp[] {
  return students
    .filter((s) => s.unitPercent < 40)
    .sort((a, b) => a.unitPercent - b.unitPercent)
    .slice(0, limit)
    .map((s) => {
      const percent = round1(s.unitPercent);
      return {
        studentId: s.studentId,
        name: s.name,
        percent,
        status: statusOf(percent),
      };
    });
}
