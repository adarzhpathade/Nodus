// In-memory mock database (FE-1.10). Built once from the fixtures on first use and kept on
// `globalThis`, so mutations (new notes, quiz attempts, marking…) survive hot reloads during a
// dev session. Restart the dev server to reset. Dates are relative to the moment it is built.
import { addDays, format, setHours, setMinutes, startOfDay, subDays } from "date-fns";
import type { ChatMessage, Citation, Conversation, NoteAnalysis, Quiz } from "@/contracts/ai";
import type { Assignment, AssignmentStatus } from "@/contracts/assignments";
import type { FacultySelection, StudentProfile } from "@/contracts/auth";
import type { Prerequisite, Semester, Subject, Topic, Unit } from "@/contracts/curriculum";
import type { LinkTarget } from "@/contracts/notes";
import type { Notification } from "@/contracts/notifications";
import type { Resource } from "@/contracts/resources";
import { rawAssignments, rawConversations, rawQuizAttempts, rawResources } from "./fixtures/academics";
import * as curriculum from "./fixtures/curriculum";
import { createRandom, mockId } from "./fixtures/ids";
import { noteId, rawNotes } from "./fixtures/notes";
import { DEMO_STUDENT, students, teacherOf } from "./fixtures/people";
import { buildQuestions } from "./fixtures/quizzes";

// ---------- Record types (internal; mapped to contract shapes by the mock APIs) ----------

export type ActivityType = "note_created" | "note_updated" | "quiz_attempted" | "ai_question" | "resource_opened";

export type NoteRecord = {
  id: string;
  ownerId: string;
  topicId: string;
  title: string;
  contentMd: string;
  contentJson: unknown | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type LinkRecord = { id: string; fromNoteId: string; target: LinkTarget };

export type AttemptRecord = {
  id: string;
  quizId: string;
  studentId: string;
  score: number;
  answers: (number | null)[];
  attemptedAt: string;
};

export type StatusRecord = { status: Exclude<AssignmentStatus, "pending">; marks: number | null; remark: string | null; markedAt: string };

export type NotificationRecord = Notification & { userId: string };

export type ConversationRecord = { conversation: Conversation; studentId: string; messages: ChatMessage[] };

/** Classmates don't have real notes — only aggregated numbers, which is all faculty views ever see. */
export type ClassmateRecord = { noteCounts: Map<string, number>; unitQuizScores: Map<string, number[]> };

export type MockStore = {
  version: number;
  builtAt: Date;
  semesters: Semester[];
  subjects: Subject[];
  units: Unit[];
  topics: Topic[];
  prerequisites: Prerequisite[];
  resources: Resource[];
  /** Text the mock tutor retrieves from, by resource id. */
  passages: Map<string, { page: number; text: string }[]>;
  notes: NoteRecord[];
  links: LinkRecord[];
  quizzes: Quiz[];
  attempts: AttemptRecord[];
  assignments: Assignment[];
  /** Key `${assignmentId}:${studentId}`. No record = pending. */
  statuses: Map<string, StatusRecord>;
  /** studentId → (YYYY-MM-DD → count). */
  activity: Map<string, Map<string, number>>;
  notifications: NotificationRecord[];
  conversations: ConversationRecord[];
  analyses: Map<string, { hash: string; analysis: NoteAnalysis }>;
  classmates: Map<string, ClassmateRecord>;
  studentSelection: Map<string, number>;
  facultySelection: Map<string, FacultySelection>;
  /** Profiles created through onboarding during the session. */
  onboarded: Map<string, StudentProfile>;
  /** Name changes made through updateProfile. */
  names: Map<string, string>;
};

const STORE_VERSION = 1;
const globalForMocks = globalThis as typeof globalThis & { __nodusMockStore?: MockStore };

export function getStore(): MockStore {
  const existing = globalForMocks.__nodusMockStore;
  if (existing?.version === STORE_VERSION) return existing;
  const store = buildStore(new Date());
  globalForMocks.__nodusMockStore = store;
  return store;
}

// ---------- Helpers ----------

export const statusKey = (assignmentId: string, studentId: string) => `${assignmentId}:${studentId}`;
export const dayKey = (date: Date) => format(date, "yyyy-MM-dd");

function at(today: Date, daysFromToday: number, hour = 10, minute = 0) {
  return setMinutes(setHours(addDays(startOfDay(today), daysFromToday), hour), minute).toISOString();
}

export function logActivity(store: MockStore, studentId: string, _type: ActivityType, when = new Date()) {
  const days = store.activity.get(studentId) ?? new Map<string, number>();
  const key = dayKey(when);
  days.set(key, (days.get(key) ?? 0) + 1);
  store.activity.set(studentId, days);
}

const GENERATED_NOTE_BODIES = [
  (topic: string, subject: string) =>
    `# ${topic}\n\nNotes from the ${subject} lecture.\n\n## Key points\n- Definition and the main idea of ${topic.toLowerCase()}\n- One worked example from class\n- Where it is used in practice\n\n- [ ] Revise before the internal exam`,
  (topic: string) =>
    `# ${topic}\n\n**Summary:** ${topic} — main definitions, a short derivation and two solved examples.\n\n1. Read the slides first\n2. Solve the textbook exercise\n3. Note doubts for the tutorial`,
  (topic: string, subject: string) =>
    `# ${topic}\n\nQuick revision sheet (${subject}).\n\n| Term | Meaning |\n|---|---|\n| ${topic} | Core concept of this topic |\n\n> Asked in last year's paper.`,
];

// ---------- Build ----------

function buildStore(today: Date): MockStore {
  const random = createRandom("nodus-mock-world");
  const subjects = structuredClone(curriculum.subjects);
  const units = structuredClone(curriculum.units);
  const topics = structuredClone(curriculum.topics);
  const subjectOfUnit = (unitId: string) => subjects.find((s) => s.id === units.find((u) => u.id === unitId)?.subjectId)!;
  const demoId = DEMO_STUDENT.user.id;

  // Resources
  const passages = new Map<string, { page: number; text: string }[]>();
  const resources: Resource[] = rawResources.map((raw) => {
    const unit = curriculum.unitOf(raw.subject, raw.unit);
    const id = mockId(`resource:${raw.fileName}`);
    const teacher = teacherOf(unit.subjectId);
    const uploadedAt = at(today, -raw.daysAgo, 9, 30);
    passages.set(id, raw.passages);
    return {
      id,
      unitId: unit.id,
      fileName: raw.fileName,
      type: raw.type,
      sizeBytes: raw.sizeKb * 1024,
      visibleSections: raw.sections,
      uploadedBy: { id: teacher.user.id, name: teacher.user.name },
      uploadedAt,
      ingestion: { status: "ready", pageCount: raw.pages, error: null, updatedAt: uploadedAt },
    };
  });

  // Demo student's notes: hand-written + generated coverage
  const notes: NoteRecord[] = [];
  const links: LinkRecord[] = [];
  for (const raw of rawNotes) {
    const topic = curriculum.topicOf(raw.subject, raw.topic);
    notes.push({
      id: noteId(raw.key),
      ownerId: demoId,
      topicId: topic.id,
      title: raw.title,
      contentMd: raw.contentMd,
      contentJson: null,
      tags: raw.tags,
      createdAt: at(today, -raw.daysAgo, 19, 15),
      updatedAt: at(today, -(raw.editedDaysAgo ?? raw.daysAgo), 21, 40),
    });
    raw.links.forEach((target, index) =>
      links.push({ id: mockId(`link:${raw.key}:${index}`), fromNoteId: noteId(raw.key), target }),
    );
  }

  /** Semester 3 coverage target per subject; earlier units are covered more. */
  const coverage: Record<string, number> = { CS301: 0.8, CS302: 0.5, CS303: 0.25, CS304: 0.65, CS305: 0.2 };
  const keepUncovered = new Set([
    curriculum.topicOf("CS301", "Topological sort").id,
    curriculum.topicOf("CS301", "Minimum spanning tree").id,
  ]);
  const covered = new Set(notes.map((n) => n.topicId));

  for (const subject of subjects) {
    const subjectUnits = units.filter((u) => u.subjectId === subject.id);
    subjectUnits.forEach((unit, unitIndex) => {
      const unitTopics = topics.filter((t) => t.unitId === unit.id);
      const base = subject.semesterNumber < curriculum.CURRENT_SEMESTER ? 0.92 : (coverage[subject.code] ?? 0);
      const weight = subject.semesterNumber < curriculum.CURRENT_SEMESTER ? 1 : 1.35 - (0.7 * unitIndex) / Math.max(1, subjectUnits.length - 1);
      for (const topic of unitTopics) {
        if (covered.has(topic.id) || keepUncovered.has(topic.id) || !random.chance(base * weight)) continue;
        const semesterAge = (curriculum.CURRENT_SEMESTER - subject.semesterNumber) * 180;
        const daysAgo = semesterAge + random.int(3, 70);
        notes.push({
          id: mockId(`note:generated:${topic.id}`),
          ownerId: demoId,
          topicId: topic.id,
          title: topic.title,
          contentMd: random.pick(GENERATED_NOTE_BODIES)(topic.title, subject.name),
          contentJson: null,
          tags: random.chance(0.6) ? [random.pick(["revision", "lecture", "exam", "doubt"])] : [],
          createdAt: at(today, -daysAgo, 20, 0),
          updatedAt: at(today, -Math.max(0, daysAgo - random.int(0, 3)), 22, 10),
        });
        covered.add(topic.id);
      }
    });
  }

  // Quizzes + demo attempts
  const quizzes: Quiz[] = [];
  const attempts: AttemptRecord[] = [];
  const allSubjectNames = subjects.map((s) => s.name);
  const quizFor = (unit: Unit, topicId: string | null, createdAt: string): Quiz => {
    const existing = quizzes.find((q) => q.unitId === unit.id && q.topicId === topicId);
    if (existing) return existing;
    const subject = subjectOfUnit(unit.id);
    const id = mockId(`quiz:${unit.id}:${topicId ?? "unit"}`);
    const quiz: Quiz = {
      id,
      unitId: unit.id,
      topicId,
      title: topicId ? `${topics.find((t) => t.id === topicId)?.title} practice` : `${unit.title} practice`,
      questions: buildQuestions({
        unit,
        subjectName: subject.name,
        unitTopics: topics.filter((t) => t.unitId === unit.id),
        allTopics: topics,
        allUnits: units,
        allSubjectNames,
        topicId,
        count: topicId ? 5 : 10,
        random,
        idPrefix: id.slice(0, 8),
      }),
      createdAt,
    };
    quizzes.push(quiz);
    return quiz;
  };

  rawQuizAttempts.forEach((raw, index) => {
    const unit = curriculum.unitOf(raw.subject, raw.unit);
    const topicId = raw.topic ? curriculum.topicOf(raw.subject, raw.topic).id : null;
    const attemptedAt = at(today, -raw.daysAgo, 18, 30);
    const quiz = quizFor(unit, topicId, attemptedAt);
    const total = quiz.questions.length;
    const correct = Math.round((raw.score / 100) * total);
    const answers = quiz.questions.map((q, i) => (i < correct ? q.correctIndex : (q.correctIndex + 1) % 4));
    attempts.push({
      id: mockId(`attempt:${index}`),
      quizId: quiz.id,
      studentId: demoId,
      score: Math.round((correct / total) * 1000) / 10,
      answers,
      attemptedAt,
    });
  });

  // Past semesters: one high-scoring unit quiz per unit, so semesters 1–2 look completed.
  for (const unit of units) {
    const subject = subjectOfUnit(unit.id);
    if (subject.semesterNumber >= curriculum.CURRENT_SEMESTER) continue;
    const attemptedAt = at(today, -((curriculum.CURRENT_SEMESTER - subject.semesterNumber) * 180 + random.int(5, 60)), 17);
    const quiz = quizFor(unit, null, attemptedAt);
    const correct = random.int(Math.ceil(quiz.questions.length * 0.7), quiz.questions.length);
    attempts.push({
      id: mockId(`attempt:past:${unit.id}`),
      quizId: quiz.id,
      studentId: demoId,
      score: Math.round((correct / quiz.questions.length) * 1000) / 10,
      answers: quiz.questions.map((q, i) => (i < correct ? q.correctIndex : (q.correctIndex + 1) % 4)),
      attemptedAt,
    });
  }

  // Assignments + offline marking
  const assignments: Assignment[] = [];
  const statuses = new Map<string, StatusRecord>();
  for (const raw of rawAssignments) {
    const subject = curriculum.subjectByCode(raw.subject);
    const unit = raw.unit ? curriculum.unitOf(raw.subject, raw.unit) : null;
    const teacher = teacherOf(subject.id);
    const id = mockId(`assignment:${raw.key}`);
    const dueAt = at(today, raw.dueInDays, raw.dueHour);
    assignments.push({
      id,
      subjectId: subject.id,
      subjectName: subject.name,
      unitId: unit?.id ?? null,
      unitTitle: unit?.title ?? null,
      title: raw.title,
      description: raw.description,
      dueAt,
      sections: raw.sections,
      maxMarks: raw.maxMarks,
      createdBy: { id: teacher.user.id, name: teacher.user.name },
      createdAt: at(today, Math.min(raw.dueInDays, 0) - 7, 11),
    });
    if (raw.dueInDays >= 0) continue; // not due yet → everyone pending

    const markedAt = at(today, Math.min(-1, raw.dueInDays + 2), 16);
    for (const student of students.filter((s) => raw.sections.includes(s.profile.section))) {
      if (student.user.id === demoId) {
        if (raw.demoStatus) {
          statuses.set(statusKey(id, demoId), {
            status: raw.demoStatus,
            marks: raw.demoMarks ?? null,
            remark: raw.demoRemark ?? null,
            markedAt,
          });
        }
        continue;
      }
      // The most recent past assignment is still partly unmarked → "pending marking" on faculty side.
      if (raw.dueInDays > -10 && random.chance(0.25)) continue;
      const roll = random.next();
      const status = roll < 0.72 ? "submitted" : roll < 0.86 ? "late" : "not_submitted";
      const marks =
        raw.maxMarks && status !== "not_submitted"
          ? Math.round(raw.maxMarks * random.between(status === "late" ? 0.4 : 0.55, 1))
          : null;
      statuses.set(statusKey(id, student.user.id), { status, marks, remark: null, markedAt });
    }
  }

  // Demo activity heatmap: ~180 days, busier recently, unbroken 7-day streak ending today.
  const activityDays = new Map<string, number>();
  for (let daysAgo = 179; daysAgo >= 0; daysAgo--) {
    const date = subDays(today, daysAgo);
    const recency = 1 - daysAgo / 180;
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    let count = 0;
    if (daysAgo <= 6) count = random.int(2, 7);
    else if (daysAgo === 7) count = 0;
    else if (random.chance((weekend ? 0.35 : 0.55) + recency * 0.3)) count = random.int(1, Math.round(2 + recency * 6));
    activityDays.set(dayKey(date), count);
  }
  const activity = new Map([[demoId, activityDays]]);

  // Classmates: aggregated progress only.
  const sem3Units = units.filter((u) => subjectOfUnit(u.id).semesterNumber === curriculum.CURRENT_SEMESTER);
  const classmates = new Map<string, ClassmateRecord>();
  for (const student of students) {
    if (student.user.id === demoId) continue;
    const r = createRandom(student.user.id);
    const ability = r.between(0.15, 0.95);
    const noteCounts = new Map<string, number>();
    const unitQuizScores = new Map<string, number[]>();
    for (const unit of sem3Units) {
      const siblings = sem3Units.filter((u) => u.subjectId === unit.subjectId);
      const position = siblings.indexOf(unit) / Math.max(1, siblings.length - 1);
      for (const topic of topics.filter((t) => t.unitId === unit.id)) {
        if (r.chance(ability * (1.25 - 0.7 * position))) noteCounts.set(topic.id, r.int(1, 3));
      }
      if (r.chance(ability * 0.9)) {
        const scores = Array.from({ length: r.int(1, 2) }, () =>
          Math.round(Math.min(100, Math.max(20, ability * 100 + r.between(-20, 15)))),
        );
        unitQuizScores.set(unit.id, scores);
      }
    }
    classmates.set(student.user.id, { noteCounts, unitQuizScores });
  }

  // Notifications (demo student)
  const assignmentId = (key: string) => mockId(`assignment:${key}`);
  const resourceByName = (name: string) => resources.find((r) => r.fileName === name)!;
  const notification = (
    key: string,
    type: Notification["type"],
    title: string,
    body: string,
    target: Notification["target"],
    hoursAgo: number,
    read: boolean,
  ): NotificationRecord => ({
    id: mockId(`notification:${key}`),
    userId: demoId,
    type,
    title,
    body,
    target,
    read,
    createdAt: new Date(today.getTime() - hoursAgo * 3_600_000).toISOString(),
  });
  const sqlSheet = resourceByName("SQL_Joins_Cheatsheet.pdf");
  const cacheSlides = resourceByName("Cache_Memory.pdf");
  const notifications: NotificationRecord[] = [
    notification("deadline-coa", "deadline_reminder", "Due today: Pipeline hazard analysis", "Computer Organization & Architecture · due tonight at 11:00 PM", { kind: "assignment", assignmentId: assignmentId("coa-pipeline") }, 2, false),
    notification("deadline-ds", "deadline_reminder", "Due in 2 days: Graph traversal problem set", "Data Structures · submit on paper in class", { kind: "assignment", assignmentId: assignmentId("ds-graphs") }, 5, false),
    notification("upload-sql", "resource_uploaded", "New material in Relational Model & SQL", `Dr. Meera Iyer uploaded ${sqlSheet.fileName}`, { kind: "resource", resourceId: sqlSheet.id, unitId: sqlSheet.unitId }, 26, false),
    notification("assign-er", "assignment_created", "New assignment: Library management ER diagram", "Database Management Systems · due in 5 days", { kind: "assignment", assignmentId: assignmentId("dbms-er") }, 50, false),
    notification("upload-cache", "resource_uploaded", "New material in Memory Organisation", `Prof. Rohan Kulkarni uploaded ${cacheSlides.fileName}`, { kind: "resource", resourceId: cacheSlides.id, unitId: cacheSlides.unitId }, 74, true),
    notification("marked-trees", "status_marked", "AVL insertion worksheet marked: Submitted", "9 / 10 · Neat work. Watch the LR case in step 7.", { kind: "assignment", assignmentId: assignmentId("ds-trees") }, 100, true),
    notification("assign-graphs", "assignment_created", "New assignment: Graph traversal problem set", "Data Structures · Graphs", { kind: "unit", unitId: curriculum.unitOf("CS301", 4).id }, 130, true),
    notification("marked-logic", "status_marked", "Truth tables & proofs marked: Late", "14 / 20 · Submitted a day late.", { kind: "assignment", assignmentId: assignmentId("dm-logic") }, 230, true),
  ];

  // Tutor history
  const conversations: ConversationRecord[] = rawConversations.map((raw) => {
    const subject = curriculum.subjectByCode(raw.scope.subject);
    const scope: Conversation["scope"] = raw.scope.unit
      ? { type: "unit", unitId: curriculum.unitOf(raw.scope.subject, raw.scope.unit).id }
      : { type: "subject", subjectId: subject.id };
    const createdAt = at(today, -raw.daysAgo, 20, 5);
    const messages: ChatMessage[] = raw.messages.map((message, index) => ({
      id: `${raw.key}-${index}`,
      role: message.role,
      content: message.content,
      citations: (message.cite ?? []).map((cite, citeIndex): Citation => {
        const resource = resources.find((r) => r.fileName === cite.file)!;
        const passage = passages.get(resource.id)?.find((p) => p.page === cite.page);
        return {
          ref: `S${citeIndex + 1}`,
          sourceType: "resource",
          sourceId: resource.id,
          title: resource.fileName,
          page: cite.page,
          locationLabel: `${resource.type === "pdf" ? "Page" : "Slide"} ${cite.page}`,
          snippet: passage?.text ?? "",
        };
      }),
      notCovered: false,
      createdAt: new Date(new Date(createdAt).getTime() + index * 20_000).toISOString(),
    }));
    return {
      studentId: demoId,
      conversation: { id: mockId(`conversation:${raw.key}`), title: raw.title, scope, createdAt, updatedAt: messages.at(-1)!.createdAt },
      messages,
    };
  });

  return {
    version: STORE_VERSION,
    builtAt: today,
    semesters: structuredClone(curriculum.semesters),
    subjects,
    units,
    topics,
    prerequisites: structuredClone(curriculum.prerequisites),
    resources,
    passages,
    notes,
    links,
    quizzes,
    attempts,
    assignments,
    statuses,
    activity,
    notifications,
    conversations,
    analyses: new Map(),
    classmates,
    studentSelection: new Map(),
    facultySelection: new Map(),
    onboarded: new Map(),
    names: new Map(),
  };
}
