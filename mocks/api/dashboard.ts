import { subDays } from "date-fns";
import type {
  DashboardApi,
  FacultyDashboard,
  HeatmapDay,
  StudentDashboard,
  SubmissionDonut,
  WeakUnitCell,
} from "@/contracts/dashboard";
import { assertTeaches, clone, mockRequest, requireFaculty, requireStudent } from "../context";
import { createRandom } from "../fixtures/ids";
import { classUnitProgress, round1, sectionStudents, semesterProgress, sourceFor, subjectProgress } from "../progress";
import { dayKey, type MockStore } from "../store";
import { countsFor, statusOfStudent, toDeadline, visibleAssignments } from "./assignments";
import { assertSemesterOpen, byOrder, findSubject } from "./shared";

const HEATMAP_DAYS = 180;
const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

function heatmap(store: MockStore, studentId: string): HeatmapDay[] {
  const days = store.activity.get(studentId);
  const today = new Date();
  return Array.from({ length: HEATMAP_DAYS }, (_, i) => {
    const date = dayKey(subDays(today, HEATMAP_DAYS - 1 - i));
    return { date, count: days?.get(date) ?? 0 };
  });
}

/** Consecutive active days ending today (or yesterday, if nothing logged yet today). */
function streak(activity: HeatmapDay[]): number {
  let index = activity.length - 1;
  if (activity[index]?.count === 0) index--;
  let days = 0;
  while (index >= 0 && activity[index].count > 0) {
    days++;
    index--;
  }
  return days;
}

/** Attempts (with quiz + unit) of a student in one semester, oldest first. */
function semesterAttempts(store: MockStore, studentId: string, semesterNumber: number) {
  return store.attempts
    .filter((a) => a.studentId === studentId)
    .flatMap((attempt) => {
      const quiz = store.quizzes.find((q) => q.id === attempt.quizId);
      const unit = quiz && store.units.find((u) => u.id === quiz.unitId);
      const subject = unit && findSubject(store, unit.subjectId);
      return subject && subject.semesterNumber === semesterNumber ? [{ attempt, subject }] : [];
    })
    .sort((a, b) => a.attempt.attemptedAt.localeCompare(b.attempt.attemptedAt));
}

export const dashboardMock: DashboardApi = {
  async getStudentDashboard(semesterNumber) {
    const store = await mockRequest();
    const { user, profile } = await requireStudent(store);
    assertSemesterOpen(profile, semesterNumber);
    const source = sourceFor(store, user.id);
    const semester = semesterProgress(store, semesterNumber, source);
    const subjects = store.subjects.filter((s) => s.semesterNumber === semesterNumber).sort(byOrder);
    const subjectIds = new Set(subjects.map((s) => s.id));
    const unitIds = new Set(store.units.filter((u) => subjectIds.has(u.subjectId)).map((u) => u.id));
    const topicIds = new Set(store.topics.filter((t) => unitIds.has(t.unitId)).map((t) => t.id));

    const notes = store.notes.filter((n) => n.ownerId === user.id && topicIds.has(n.topicId));
    const weekAgo = subDays(new Date(), 7).toISOString();
    const attempts = semesterAttempts(store, user.id, semesterNumber);
    const quizAverage = average(attempts.map((a) => a.attempt.score));
    const olderAverage = average(attempts.filter((a) => a.attempt.attemptedAt < weekAgo).map((a) => a.attempt.score));
    const hasRecent = attempts.some((a) => a.attempt.attemptedAt >= weekAgo);

    const assignments = visibleAssignments(store, profile.section).filter((a) => subjectIds.has(a.subjectId));
    const submitted = assignments.filter((a) => {
      const { status } = statusOfStudent(store, a.id, user.id);
      return status === "submitted" || status === "late";
    }).length;

    const activity = heatmap(store, user.id);
    const recentlyDue = subDays(new Date(), 3).toISOString();

    const dashboard: StudentDashboard = {
      semesterNumber,
      stats: {
        notesCount: notes.length,
        notesThisWeek: notes.filter((n) => n.createdAt >= weekAgo).length,
        semesterPercent: semester.percent,
        semesterStatus: semester.status,
        quizAverage: quizAverage === null ? null : round1(quizAverage),
        quizAverageDelta: quizAverage !== null && olderAverage !== null && hasRecent ? round1(quizAverage - olderAverage) : null,
        assignmentsSubmitted: submitted,
        assignmentsTotal: assignments.length,
        streakDays: streak(activity),
      },
      coverage: subjects.map((subject) => {
        const { percent, status } = subjectProgress(store, subject.id, source);
        return { subjectId: subject.id, name: subject.name, code: subject.code, percent, status };
      }),
      activity,
      deadlines: assignments
        .filter((a) => a.dueAt >= recentlyDue)
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
        .map((a) => toDeadline(store, a, user.id)),
      radar: semester.subjects.map((s) => ({ subjectId: s.id, subject: s.title, value: s.percent })),
      quizTrend: attempts.map(({ attempt, subject }) => ({
        date: dayKey(new Date(attempt.attemptedAt)),
        subjectId: subject.id,
        subjectName: subject.name,
        score: attempt.score,
      })),
    };
    return clone(dashboard);
  },

  async getFacultyDashboard(input) {
    const store = await mockRequest();
    const faculty = await requireFaculty(store);
    const teaching = assertTeaches(faculty, input.subjectId);
    const subject = findSubject(store, input.subjectId);
    const sections = teaching.sections;
    const units = store.units.filter((u) => u.subjectId === subject.id).sort(byOrder);
    const now = new Date().toISOString();
    const assignments = store.assignments.filter((a) => a.subjectId === subject.id);
    const pastDue = assignments.filter((a) => a.dueAt <= now);

    const roster = sections.flatMap((section) => sectionStudents(section));
    const studentPercents = roster.map((s) => subjectProgress(store, subject.id, sourceFor(store, s.user.id)).percent);

    const weakUnits: WeakUnitCell[] = [];
    const sectionComparison = sections.map((section) => {
      const perUnit = units.map((u) => classUnitProgress(store, u.id, section));
      perUnit.forEach((cls, i) =>
        weakUnits.push({ unitId: units[i].id, unitTitle: units[i].title, section, averagePercent: cls.averagePercent, status: cls.status }),
      );
      const quiz = average(perUnit.flatMap((c) => (c.quizAverage === null ? [] : [c.quizAverage])));
      return {
        section,
        averagePercent: round1(average(perUnit.map((c) => c.averagePercent)) ?? 0),
        quizAverage: quiz === null ? null : round1(quiz),
      };
    });

    const submissions: SubmissionDonut[] = sections.map((section) => {
      const totals = { section, submitted: 0, late: 0, notSubmitted: 0, pending: 0 };
      for (const a of pastDue.filter((a) => a.sections.includes(section))) {
        const c = countsFor(store, a, [section]);
        totals.submitted += c.submitted;
        totals.late += c.late;
        totals.notSubmitted += c.notSubmitted;
        totals.pending += c.pending;
      }
      return totals;
    });

    // Aggregated, anonymous tutor-question counts per topic (synthetic in mocks).
    const topAiTopics = store.topics
      .filter((t) => units.some((u) => u.id === t.unitId))
      .map((t) => ({ topicId: t.id, title: t.title, questionCount: createRandom(`ai:${t.id}`).int(0, 40) }))
      .sort((a, b) => b.questionCount - a.questionCount)
      .slice(0, 6);

    const averageProgress = round1(average(studentPercents) ?? 0);
    const dashboard: FacultyDashboard = {
      subjectId: subject.id,
      subjectName: subject.name,
      stats: {
        students: roster.length,
        averageProgress,
        pendingMarking: submissions.reduce((sum, s) => sum + s.pending, 0),
        activeAssignments: assignments.filter((a) => a.dueAt > now).length,
      },
      sectionComparison,
      weakUnits: weakUnits.sort((a, b) => a.averagePercent - b.averagePercent),
      submissions,
      topAiTopics,
    };
    return clone(dashboard);
  },
};
