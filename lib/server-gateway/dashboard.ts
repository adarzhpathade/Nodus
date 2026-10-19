// Real DashboardApi (C-09). Implements BE-9.1 … BE-9.3. Owner: BE.
import "server-only";
import { format, startOfDay, subDays } from "date-fns";
import { GatewayError } from "@/contracts/common";
import type {
  CoverageRing,
  DashboardApi,
  FacultyDashboard,
  FacultyStats,
  HeatmapDay,
  QuizTrendPoint,
  RadarPoint,
  SectionComparison,
  StudentDashboard,
  SubmissionDonut,
  WeakUnitCell,
} from "@/contracts/dashboard";
import type { UpcomingDeadline } from "@/contracts/graph";
import type { UnitProgress } from "@/contracts/progress";
import {
  assertSemesterOpen,
  requireFacultyTeaches,
  requireStudent,
} from "@/lib/auth/guards";
import {
  average,
  calculateClassUnitProgress,
  calculateSemesterProgress,
  calculateSubjectProgress,
  calculateUnitProgress,
  round1,
} from "@/lib/progress";
import { findSubject } from "@/lib/db/queries/curriculum";
import {
  getFacultyDashboardSubmissionsData,
  getStudentActivityTimestamps,
  getStudentNotesCountForSemester,
  getStudentSemesterQuizAttempts,
  getTopAiTopicsForSubject,
} from "@/lib/db/queries/dashboard";
import {
  getSectionProgressRawData,
  getStudentSemesterProgressRawData,
} from "@/lib/db/queries/progress";
import { listStudentAssignments } from "@/lib/db/queries/assignments";

const HEATMAP_DAYS = 180;

export const dashboardApi: DashboardApi = {
  async getStudentDashboard(semesterNumber: number): Promise<StudentDashboard> {
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

    // Calculate unit and subject progresses
    const subjectProgressList: {
      subjectId: string;
      code: string;
      name: string;
      percent: number;
      status: ReturnType<typeof calculateSubjectProgress>["status"];
      unitProgresses: UnitProgress[];
    }[] = [];

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

        unitProgresses.push(
          calculateUnitProgress({
            unitId: unit.id,
            topics: topicsInput,
            quizScores,
          }),
        );
      }

      const sProg = calculateSubjectProgress({
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
        code: subject.code,
        name: subject.name,
        percent: sProg.percent,
        status: sProg.status,
        unitProgresses,
      });
    }

    // Semester overall progress
    const semesterProg = calculateSemesterProgress({
      semesterNumber,
      subjects: subjectProgressList.map((s) => ({
        id: s.subjectId,
        title: s.name,
        percent: s.percent,
        status: s.status,
      })),
    });

    // Coverage rings per subject
    const coverage: CoverageRing[] = subjectProgressList.map((s) => ({
      subjectId: s.subjectId,
      name: s.name,
      code: s.code,
      percent: s.percent,
      status: s.status,
    }));

    // Radar points per subject
    const radar: RadarPoint[] = subjectProgressList.map((s) => ({
      subjectId: s.subjectId,
      subject: s.name,
      value: s.percent,
    }));

    // Notes count for semester (total and created in last 7 days)
    const allTopicIds = raw.subjects.flatMap((s) =>
      s.units.flatMap((u) => u.topics.map((t) => t.id)),
    );
    const notesStats = await getStudentNotesCountForSemester(
      student.user.id,
      allTopicIds,
    );

    // Quiz attempts in this semester
    const attempts = await getStudentSemesterQuizAttempts(
      student.user.id,
      student.profile.branch.id,
      semesterNumber,
    );
    const quizAvgRaw = average(attempts.map((a) => a.score));
    const quizAverage = quizAvgRaw === null ? null : round1(quizAvgRaw);

    const weekAgo = subDays(new Date(), 7);
    const olderAttempts = attempts.filter((a) => a.attemptedAt < weekAgo);
    const hasRecent = attempts.some((a) => a.attemptedAt >= weekAgo);
    const olderAvgRaw = average(olderAttempts.map((a) => a.score));
    const quizAverageDelta =
      quizAverage !== null && olderAvgRaw !== null && hasRecent
        ? round1(quizAverage - olderAvgRaw)
        : null;

    const quizTrend: QuizTrendPoint[] = attempts.map((a) => ({
      date: format(a.attemptedAt, "yyyy-MM-dd"),
      subjectId: a.subjectId,
      subjectName: a.subjectName,
      score: round1(a.score),
    }));

    // Assignments & deadlines (visible in student's section for this semester)
    const studentAssignments = await listStudentAssignments({
      studentId: student.user.id,
      studentSection: student.profile.section,
      branchId: student.profile.branch.id,
      semesterNumber,
    });

    const assignmentsTotal = studentAssignments.length;
    const assignmentsSubmitted = studentAssignments.filter(
      (a) => a.status === "submitted" || a.status === "late",
    ).length;

    const recentlyDue = subDays(new Date(), 3);
    const deadlines: UpcomingDeadline[] = studentAssignments
      .filter((a) => a.assignment.dueAt >= recentlyDue)
      .sort((a, b) => a.assignment.dueAt.getTime() - b.assignment.dueAt.getTime())
      .map((a) => ({
        id: a.assignment.id,
        title: a.assignment.title,
        subjectName: a.subjectName,
        unitId: a.assignment.unitId,
        dueAt: a.assignment.dueAt.toISOString(),
        status: a.status,
      }));

    // Activity heatmap (~180 days, oldest first, zeros included)
    const today = new Date();
    const startDate = subDays(startOfDay(today), HEATMAP_DAYS - 1);
    const activityTimestamps = await getStudentActivityTimestamps(
      student.user.id,
      startDate,
    );

    const countsByDay = new Map<string, number>();
    for (const ts of activityTimestamps) {
      const key = format(ts, "yyyy-MM-dd");
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
    }

    const activity: HeatmapDay[] = [];
    for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
      const d = subDays(today, i);
      const dateStr = format(d, "yyyy-MM-dd");
      activity.push({
        date: dateStr,
        count: countsByDay.get(dateStr) ?? 0,
      });
    }

    // Study streak from activity (consecutive days ending today or yesterday)
    let streakIndex = activity.length - 1;
    if ((activity[streakIndex]?.count ?? 0) === 0) {
      streakIndex--;
    }
    let streakDays = 0;
    while (streakIndex >= 0 && (activity[streakIndex]?.count ?? 0) > 0) {
      streakDays++;
      streakIndex--;
    }

    return {
      semesterNumber,
      stats: {
        notesCount: notesStats.total,
        notesThisWeek: notesStats.thisWeek,
        semesterPercent: semesterProg.percent,
        semesterStatus: semesterProg.status,
        quizAverage,
        quizAverageDelta,
        assignmentsSubmitted,
        assignmentsTotal,
        streakDays,
      },
      coverage,
      activity,
      deadlines,
      radar,
      quizTrend,
    };
  },

  async getFacultyDashboard(input: { subjectId: string }): Promise<FacultyDashboard> {
    const faculty = await requireFacultyTeaches(input.subjectId);

    const subject = await findSubject(input.subjectId);
    if (!subject) {
      throw new GatewayError("NOT_FOUND", "Subject not found.");
    }

    const sections = [
      ...new Set(
        faculty.teaching
          .filter((t) => t.subjectId === input.subjectId)
          .map((t) => t.section),
      ),
    ].sort();

    if (sections.length === 0) {
      throw new GatewayError("FORBIDDEN", "You don't teach any section for this subject.");
    }

    const sectionComparison: SectionComparison[] = [];
    const weakUnits: WeakUnitCell[] = [];
    const allStudentSubjectPercents: number[] = [];
    let totalRosterCount = 0;

    for (const section of sections) {
      const raw = await getSectionProgressRawData(input.subjectId, section);
      if (!raw) continue;

      totalRosterCount += raw.roster.length;

      const studentUnitProgressesByStudent: UnitProgress[][] = raw.roster.map(() => []);

      for (const unit of raw.units) {
        const unitStudentProgs: UnitProgress[] = raw.roster.map((st, stIdx) => {
          const stNotes = raw.noteCountsByStudentAndTopic.get(st.id);
          const stBestScores = raw.bestTopicScoresByStudent.get(st.id);
          const stQuizScores =
            raw.unitScoresByStudentAndUnit.get(st.id)?.get(unit.id) ?? [];

          const prog = calculateUnitProgress({
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

          studentUnitProgressesByStudent[stIdx].push(prog);
          return prog;
        });

        const cls = calculateClassUnitProgress({
          unitId: unit.id,
          section,
          topics: unit.topics.map((t) => ({
            topicId: t.id,
            title: t.title,
            order: t.order,
          })),
          studentUnitProgresses: unitStudentProgs,
        });

        weakUnits.push({
          unitId: unit.id,
          unitTitle: unit.title,
          section,
          averagePercent: cls.averagePercent,
          status: cls.status,
        });
      }

      // Compute student subject progresses across units for overall average
      for (let stIdx = 0; stIdx < raw.roster.length; stIdx++) {
        const stProgs = studentUnitProgressesByStudent[stIdx];
        const stSubProg = calculateSubjectProgress({
          subjectId: input.subjectId,
          units: stProgs.map((u, i) => ({
            id: u.unitId,
            title: raw.units[i]?.title ?? "",
            percent: u.percent,
            status: u.status,
          })),
        });
        allStudentSubjectPercents.push(stSubProg.percent);
      }

      // Section comparison
      const sectionUnitCells = weakUnits.filter((w) => w.section === section);
      const secAvgPercent = round1(
        average(sectionUnitCells.map((c) => c.averagePercent)) ?? 0,
      );

      const allSectionStudentUnitProgs = studentUnitProgressesByStudent.flat();
      const quizAvgs = allSectionStudentUnitProgs
        .map((p) => p.quizAverage)
        .filter((q): q is number => q !== null);
      const secQuizAvg = average(quizAvgs);
      const sectionQuizAverage = secQuizAvg === null ? null : round1(secQuizAvg);

      sectionComparison.push({
        section,
        averagePercent: secAvgPercent,
        quizAverage: sectionQuizAverage,
      });
    }

    // Submissions donuts and active assignments count
    const submissionsData = await getFacultyDashboardSubmissionsData({
      subjectId: input.subjectId,
      sections,
      branchId: subject.branchId,
      semesterNumber: subject.semesterNumber,
    });

    const submissions: SubmissionDonut[] = sections.map((section) => {
      const counts = submissionsData.submissionsBySection.get(section) ?? {
        submitted: 0,
        late: 0,
        notSubmitted: 0,
        pending: 0,
      };
      return {
        section,
        submitted: counts.submitted,
        late: counts.late,
        notSubmitted: counts.notSubmitted,
        pending: counts.pending,
      };
    });

    // Top AI topics (BE-9.3: aggregated counts only, no content leak)
    const topAiTopics = await getTopAiTopicsForSubject(input.subjectId, 6);

    const avgProgress = average(allStudentSubjectPercents);
    const averageProgress = avgProgress === null ? 0 : round1(avgProgress);
    const pendingMarking = submissions.reduce((sum, s) => sum + s.pending, 0);

    const stats: FacultyStats = {
      students: totalRosterCount,
      averageProgress,
      pendingMarking,
      activeAssignments: submissionsData.activeAssignmentsCount,
    };

    return {
      subjectId: subject.id,
      subjectName: subject.name,
      stats,
      sectionComparison,
      weakUnits: weakUnits.sort((a, b) => a.averagePercent - b.averagePercent),
      submissions,
      topAiTopics,
    };
  },
};
