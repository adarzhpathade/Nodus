// MOCK-ONLY progress calculation so mock data reacts to new notes / quiz attempts in a session.
// The real formula lives ONLY in lib/progress (AGENTS.md §6.6); this mirrors it for fake data and
// is deleted with the mocks. Never import it from components.
import type { ProgressStatus } from "@/contracts/common";
import type {
  ClassTopicProgress,
  ClassUnitProgress,
  ProgressSummary,
  SemesterProgress,
  StudentNeedingHelp,
  SubjectProgress,
  TopicProgress,
  UnitProgress,
} from "@/contracts/progress";
import { students } from "./fixtures/people";
import type { MockStore } from "./store";

export type ProgressSource = {
  noteCount(topicId: string): number;
  bestTopicScore(topicId: string): number | null;
  unitScores(unitId: string): number[];
};

export const round1 = (n: number) => Math.round(n * 10) / 10;
const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

export function statusOf(percent: number): ProgressStatus {
  if (percent <= 0) return "not_started";
  if (percent < 40) return "low";
  if (percent <= 75) return "in_progress";
  return "mastered";
}

/** Progress inputs for one student: real records for the signed-in student, synthetic numbers for classmates. */
export function sourceFor(store: MockStore, studentId: string): ProgressSource {
  const classmate = store.classmates.get(studentId);
  if (classmate) {
    return {
      noteCount: (topicId) => classmate.noteCounts.get(topicId) ?? 0,
      bestTopicScore: () => null,
      unitScores: (unitId) => classmate.unitQuizScores.get(unitId) ?? [],
    };
  }

  const noteCounts = new Map<string, number>();
  for (const note of store.notes) {
    if (note.ownerId === studentId) noteCounts.set(note.topicId, (noteCounts.get(note.topicId) ?? 0) + 1);
  }
  const quizById = new Map(store.quizzes.map((q) => [q.id, q]));
  const myAttempts = store.attempts.filter((a) => a.studentId === studentId);

  return {
    noteCount: (topicId) => noteCounts.get(topicId) ?? 0,
    bestTopicScore: (topicId) => {
      const scores = myAttempts.filter((a) => quizById.get(a.quizId)?.topicId === topicId).map((a) => a.score);
      return scores.length ? Math.max(...scores) : null;
    },
    unitScores: (unitId) => myAttempts.filter((a) => quizById.get(a.quizId)?.unitId === unitId).map((a) => a.score),
  };
}

export function topicProgress(store: MockStore, topicId: string, source: ProgressSource): TopicProgress {
  const topic = store.topics.find((t) => t.id === topicId)!;
  const noteCount = source.noteCount(topicId);
  const bestQuizScore = source.bestTopicScore(topicId);
  return {
    topicId,
    title: topic.title,
    order: topic.order,
    // Covered = ≥1 note AND (no topic quiz yet OR best score ≥ 50%).
    covered: noteCount > 0 && (bestQuizScore === null || bestQuizScore >= 50),
    noteCount,
    bestQuizScore,
  };
}

export function unitProgress(store: MockStore, unitId: string, source: ProgressSource): UnitProgress {
  const topics = store.topics
    .filter((t) => t.unitId === unitId)
    .sort((a, b) => a.order - b.order)
    .map((t) => topicProgress(store, t.id, source));
  const coveredTopics = topics.filter((t) => t.covered).length;
  const coverage = topics.length ? coveredTopics / topics.length : 0;
  const quizAverage = average(source.unitScores(unitId));
  // Unit % = 0.7 × coverage + 0.3 × quiz average (coverage × 0.7 until a quiz is attempted).
  const percent = round1(quizAverage === null ? coverage * 70 : coverage * 70 + quizAverage * 0.3);
  return {
    unitId,
    percent,
    status: statusOf(percent),
    coveredTopics,
    totalTopics: topics.length,
    quizAverage: quizAverage === null ? null : round1(quizAverage),
    topics,
  };
}

export function subjectProgress(store: MockStore, subjectId: string, source: ProgressSource): SubjectProgress {
  const units: ProgressSummary[] = store.units
    .filter((u) => u.subjectId === subjectId)
    .sort((a, b) => a.order - b.order)
    .map((unit) => {
      const { percent, status } = unitProgress(store, unit.id, source);
      return { id: unit.id, title: unit.title, percent, status };
    });
  const percent = round1(average(units.map((u) => u.percent)) ?? 0);
  return { subjectId, percent, status: statusOf(percent), units };
}

export function semesterProgress(store: MockStore, semesterNumber: number, source: ProgressSource): SemesterProgress {
  const subjects: ProgressSummary[] = store.subjects
    .filter((s) => s.semesterNumber === semesterNumber)
    .sort((a, b) => a.order - b.order)
    .map((subject) => {
      const { percent, status } = subjectProgress(store, subject.id, source);
      return { id: subject.id, title: subject.name, percent, status };
    });
  const percent = round1(average(subjects.map((s) => s.percent)) ?? 0);
  return { semesterNumber, percent, status: statusOf(percent), subjects };
}

// ---------- Class level (faculty) ----------

export function sectionStudents(section: string) {
  return students.filter((s) => s.profile.section === section);
}

export function classUnitProgress(store: MockStore, unitId: string, section: string): ClassUnitProgress {
  const roster = sectionStudents(section);
  const perStudent = roster.map((s) => unitProgress(store, unitId, sourceFor(store, s.user.id)));
  const unitTopics = store.topics.filter((t) => t.unitId === unitId).sort((a, b) => a.order - b.order);

  const topics: ClassTopicProgress[] = unitTopics.map((topic) => {
    const coveredBy = perStudent.filter((p) => p.topics.find((t) => t.topicId === topic.id)?.covered).length;
    return { topicId: topic.id, title: topic.title, order: topic.order, coveragePercent: round1((coveredBy / roster.length) * 100) };
  });

  const bands = { notStarted: 0, low: 0, inProgress: 0, mastered: 0 };
  for (const p of perStudent) {
    if (p.status === "not_started") bands.notStarted++;
    else if (p.status === "low") bands.low++;
    else if (p.status === "in_progress") bands.inProgress++;
    else bands.mastered++;
  }

  const averagePercent = round1(average(perStudent.map((p) => p.percent)) ?? 0);
  const quizAverage = average(perStudent.flatMap((p) => (p.quizAverage === null ? [] : [p.quizAverage])));
  const weakestTopic = topics.length ? topics.reduce((min, t) => (t.coveragePercent < min.coveragePercent ? t : min)) : null;

  return {
    unitId,
    section,
    averagePercent,
    status: statusOf(averagePercent),
    bands,
    quizAverage: quizAverage === null ? null : round1(quizAverage),
    weakestTopic,
    topics,
  };
}

/** Lowest unit % in the section, below 40%, worst first. */
export function studentsNeedingHelp(store: MockStore, unitId: string, section: string, limit = 6): StudentNeedingHelp[] {
  return sectionStudents(section)
    .map((s) => {
      const { percent, status } = unitProgress(store, unitId, sourceFor(store, s.user.id));
      return { studentId: s.user.id, name: s.user.name, percent, status };
    })
    .filter((s) => s.percent < 40)
    .sort((a, b) => a.percent - b.percent)
    .slice(0, limit);
}
