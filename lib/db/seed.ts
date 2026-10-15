// Demo data seed (BE-2.8). Run: `npm run db:seed`  (flags: --skip-files, --allow-production)
// Wipes all NODUS tables on the current Neon branch and fills one realistic CSE batch:
// Sem 1–8 syllabus (Sem 3 current), 48 students in sections A/B/C, 3 faculty, notes + links,
// quizzes + attempts, resources (PDFs in storage + RAG chunks), offline assignments with marking,
// tutor conversations, ~120 days of activity and notifications.
// Demo logins (real Neon Auth users) are created if missing — see docs/environment_setup.md.
// Runs outside Next.js: do not import modules that use "server-only".
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as s from "./schema";
import { noteMarkdown, noteTitle, quizQuestion, slideText, TAG_POOL } from "./seed-data/content";
import { chunk, createRandom, DAY, daysAgo, daysFromNow, makePdf, NOW, uid } from "./seed-data/helpers";
import {
  BRANCH,
  CURRENT_SEMESTER,
  DEMO_PASSWORD,
  DEMO_STUDENTS,
  FACULTY,
  OTHER_STUDENT_NAMES,
  SYLLABUS,
} from "./seed-data/syllabus";

config({ path: [".env.local", ".env"], quiet: true });

const args = new Set(process.argv.slice(2));
const random = createRandom(20261015);
const BUCKET = "nodus-uploads";

type Insert<T extends { $inferInsert: unknown }> = T["$inferInsert"];

// ---------------------------------------------------------------------------
// Curriculum model (in memory)
// ---------------------------------------------------------------------------

type TopicRow = { id: string; title: string; order: number };
type UnitRow = { id: string; title: string; order: number; topics: TopicRow[] };
type SubjectRow = { id: string; code: string; name: string; semesterNumber: number; units: UnitRow[] };

const branchId = uid("branch", BRANCH.code);
const subjects: SubjectRow[] = SYLLABUS.flatMap((semester) =>
  semester.subjects.map((subject) => ({
    id: uid("subject", subject.code),
    code: subject.code,
    name: subject.name,
    semesterNumber: semester.number,
    units: subject.units.map((unit, unitIndex) => ({
      id: uid("unit", subject.code, unitIndex),
      title: unit.title,
      order: unitIndex,
      topics: unit.topics.map((title, topicIndex) => ({ id: uid("topic", subject.code, unitIndex, topicIndex), title, order: topicIndex })),
    })),
  })),
);
const subjectByCode = new Map(subjects.map((subject) => [subject.code, subject]));
const currentSubjects = subjects.filter((subject) => subject.semesterNumber === CURRENT_SEMESTER);
const pastSubjects = subjects.filter((subject) => subject.semesterNumber < CURRENT_SEMESTER);

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

type Student = { id: string; name: string; email: string; section: string; diligence: number; demo: boolean };
type Faculty = { id: string; name: string; email: string; teaches: Record<string, readonly string[]> };

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");

async function ensureAuthUser(pool: Pool, person: { name: string; email: string }): Promise<string> {
  const existing = await pool.query<{ id: string }>(`select id from neon_auth."user" where email = $1`, [person.email]);
  if (existing.rows[0]) return existing.rows[0].id;

  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  if (!baseUrl) throw new Error("NEON_AUTH_BASE_URL is not set — run `neon env pull`.");
  const response = await fetch(`${baseUrl}/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000" },
    body: JSON.stringify({ email: person.email, password: DEMO_PASSWORD, name: person.name }),
  });
  const body = (await response.json().catch(() => null)) as { user?: { id: string }; message?: string } | null;
  if (!response.ok || !body?.user?.id) {
    throw new Error(`Could not create auth user ${person.email}: ${response.status} ${body?.message ?? ""}`);
  }
  return body.user.id;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const branch = process.env.NEON_BRANCH ?? "unknown";
  if (branch === "production" && !args.has("--allow-production")) {
    throw new Error('Refusing to wipe the "production" branch. Run on "dev" (neon checkout dev) or pass --allow-production.');
  }
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_UNPOOLED is not set — run `neon env pull`.");

  const pool = new Pool({ connectionString: url, max: 4 });
  const db = drizzle({ client: pool, schema: s });
  console.log(`Seeding Neon branch "${branch}"…`);

  // ---- Auth users for demo logins ----
  const faculty: Faculty[] = [];
  for (const person of FACULTY) {
    faculty.push({ id: await ensureAuthUser(pool, person), name: person.name, email: person.email, teaches: person.teaches });
  }
  const students: Student[] = [];
  for (const person of DEMO_STUDENTS) {
    const diligence = person.name.startsWith("Ananya") ? 0.62 : 0.82;
    students.push({ id: await ensureAuthUser(pool, person), ...person, diligence, demo: true });
  }
  OTHER_STUDENT_NAMES.forEach((name, index) => {
    const section = BRANCH.sections[[0, 2, 0, 2, 1][index % 5] ?? 0];
    students.push({
      id: uid("student", name),
      name,
      email: `${slug(name)}@nodus-demo.example.com`,
      section: section ?? "A",
      diligence: Math.round(random.between(0.15, 0.95) * 100) / 100,
      demo: false,
    });
  });
  balanceSections(students);
  const ananya = students[0];
  const facultyForSubject = (code: string) => faculty.find((f) => code in f.teaches) ?? faculty[0];
  console.log(`  ✓ ${faculty.length} faculty + ${DEMO_STUDENTS.length} student logins ready`);

  // ---- Wipe app tables (auth tables are untouched) ----
  await db.execute(sql`
    truncate table activity_log, notifications, ai_messages, ai_conversations, note_analyses, quiz_attempts, quizzes,
      assignment_status, assignment_sections, assignments, note_chunks, note_links, notes, resource_chunks, resources,
      faculty_teaching, student_profiles, users, subject_prerequisites, topics, units, subjects, semesters, branches
    restart identity cascade`);

  // ---- Curriculum ----
  await db.insert(s.branches).values({ id: branchId, code: BRANCH.code, name: BRANCH.name, sections: [...BRANCH.sections] });
  await db.insert(s.semesters).values(SYLLABUS.map((semester) => ({ id: uid("semester", semester.number), branchId, number: semester.number })));
  await db.insert(s.subjects).values(
    subjects.map((subject, index) => ({
      id: subject.id,
      semesterId: uid("semester", subject.semesterNumber),
      code: subject.code,
      name: subject.name,
      order: index,
    })),
  );
  const prerequisites = SYLLABUS.flatMap((semester) =>
    semester.subjects.flatMap((subject) =>
      (subject.prerequisites ?? []).map((code) => ({ subjectId: uid("subject", subject.code), prerequisiteSubjectId: uid("subject", code) })),
    ),
  );
  await db.insert(s.subjectPrerequisites).values(prerequisites);
  const allUnits = subjects.flatMap((subject) => subject.units.map((unit) => ({ ...unit, subjectId: subject.id })));
  if (allUnits.length) await db.insert(s.units).values(allUnits.map(({ id, subjectId, title, order }) => ({ id, subjectId, title, order })));
  const allTopics = allUnits.flatMap((unit) => unit.topics.map((topic) => ({ ...topic, unitId: unit.id })));
  for (const rows of chunk(allTopics, 500)) await db.insert(s.topics).values(rows);
  console.log(`  ✓ Curriculum: ${subjects.length} subjects, ${allUnits.length} units, ${allTopics.length} topics`);

  // ---- Users ----
  await db.insert(s.users).values([
    ...faculty.map((f) => ({ id: f.id, email: f.email, name: f.name, role: "faculty" as const })),
    ...students.map((st) => ({ id: st.id, email: st.email, name: st.name, role: "student" as const })),
  ]);
  await db.insert(s.studentProfiles).values(
    students.map((st) => ({ userId: st.id, branchId, currentSemester: CURRENT_SEMESTER, section: st.section })),
  );
  await db.insert(s.facultyTeaching).values(
    faculty.flatMap((f) =>
      Object.entries(f.teaches).flatMap(([code, sections]) =>
        sections.map((section) => ({ facultyId: f.id, subjectId: uid("subject", code), section })),
      ),
    ),
  );
  console.log(`  ✓ Users: ${students.length} students (A/B/C), ${faculty.length} faculty`);

  // ---- Resources (one PDF per unit, one page + chunk per topic) ----
  const resourceRows: Insert<typeof s.resources>[] = [];
  const chunkRows: Insert<typeof s.resourceChunks>[] = [];
  const pdfs: { key: string; bytes: Uint8Array }[] = [];
  const resourceByUnit = new Map<string, { id: string; fileName: string; topicPage: Map<string, number> }>();
  for (const subject of [...pastSubjects, ...currentSubjects]) {
    for (const unit of subject.units) {
      const resourceId = uid("resource", unit.id);
      const fileName =
        subject.code === "CS201" && unit.order === 2
          ? "Lecture_Slides_Unit3_Graphs.pdf"
          : `${subject.code}_Unit${unit.order + 1}_${unit.title.replace(/[^A-Za-z0-9]+/g, "_")}.pdf`;
      const key = `resources/${unit.id}/${resourceId}.pdf`;
      const pages = unit.topics.map((topic) => ({ title: topic.title, lines: slideText(topic.title, unit.title, subject.name) }));
      const bytes = makePdf([{ title: `${subject.name} — Unit ${unit.order + 1}: ${unit.title}`, lines: ["Lecture slides"] }, ...pages]);
      const uploadedAt =
        subject.semesterNumber === CURRENT_SEMESTER ? daysAgo((4 - unit.order) * 16 + 22, 10) : daysAgo(200 + (2 - subject.semesterNumber) * 180, 10);
      pdfs.push({ key, bytes });
      resourceRows.push({
        id: resourceId,
        unitId: unit.id,
        uploadedBy: facultyForSubject(subject.code).id,
        storageKey: key,
        fileName,
        type: "pdf",
        sizeBytes: bytes.byteLength,
        visibleSections: [...BRANCH.sections],
        ingestionStatus: "ready",
        pageCount: pages.length + 1,
        createdAt: uploadedAt,
        updatedAt: uploadedAt,
      });
      const topicPage = new Map<string, number>();
      unit.topics.forEach((topic, index) => {
        topicPage.set(topic.id, index + 2);
        chunkRows.push({
          id: uid("chunk", resourceId, index),
          resourceId,
          chunkIndex: index,
          content: `${topic.title}\n${slideText(topic.title, unit.title, subject.name).join("\n")}`,
          page: index + 2,
          embedding: null, // embedded later by the ingestion pipeline (BE-4.6)
        });
      });
      resourceByUnit.set(unit.id, { id: resourceId, fileName, topicPage });
    }
  }
  await db.insert(s.resources).values(resourceRows);
  for (const rows of chunk(chunkRows, 500)) await db.insert(s.resourceChunks).values(rows);
  if (args.has("--skip-files")) {
    console.log(`  ✓ Resources: ${resourceRows.length} rows (files skipped)`);
  } else {
    // files-sdk is ESM-only; dynamic import works from tsx's CommonJS mode.
    const { Files } = await import("files-sdk");
    const { neon: neonStorage } = await import("files-sdk/neon");
    const files = new Files({ adapter: neonStorage({ bucket: BUCKET }) });
    for (const batch of chunk(pdfs, 6)) {
      await Promise.all(batch.map((pdf) => files.upload(pdf.key, pdf.bytes, { contentType: "application/pdf" })));
    }
    console.log(`  ✓ Resources: ${resourceRows.length} PDFs uploaded to "${BUCKET}", ${chunkRows.length} chunks`);
  }

  // ---- Notes, links, quizzes, attempts, activity ----
  const noteRows: Insert<typeof s.notes>[] = [];
  const linkRows: Insert<typeof s.noteLinks>[] = [];
  const attemptRows: Insert<typeof s.quizAttempts>[] = [];
  const activityRows: Insert<typeof s.activityLog>[] = [];

  // One cached quiz per unit (questions tagged with their topic).
  const quizRows: Insert<typeof s.quizzes>[] = [];
  const quizByUnit = new Map<string, { id: string; questions: { id: string; topicId: string; correctIndex: number }[] }>();
  for (const subject of [...pastSubjects, ...currentSubjects]) {
    for (const unit of subject.units) {
      const quizId = uid("quiz", unit.id);
      const questions = unit.topics.slice(0, 5).map((topic, index) => {
        const q = quizQuestion(topic.title, unit.title, random);
        return { id: `q${index + 1}`, topicId: topic.id, ...q };
      });
      quizRows.push({ id: quizId, unitId: unit.id, title: `${unit.title} — practice quiz`, questions, createdAt: daysAgo(60) });
      quizByUnit.set(unit.id, { id: quizId, questions });
    }
  }

  const MST = uid("topic", "CS201", 2, 4);
  const TOPO = uid("topic", "CS201", 2, 3);
  const ANANYA_MISSING = new Set([MST, TOPO]);
  const ANANYA_COVERED = new Set([uid("topic", "CS201", 2, 0), uid("topic", "CS201", 2, 1), uid("topic", "CS201", 2, 2)]);
  const ANANYA_GAP_DAY = 12; // keeps her streak at exactly 12 days

  const notesByStudent = new Map<string, { id: string; topicId: string; title: string }[]>();
  const addNote = (st: Student, subject: SubjectRow, unit: UnitRow, topic: TopicRow, createdAt: Date) => {
    const index = (notesByStudent.get(st.id)?.length ?? 0) + 1;
    const id = uid("note", st.id, topic.id, index);
    const contentMd = noteMarkdown(topic.title, subject.name, unit.title, random);
    const updatedAt = new Date(Math.min(NOW.getTime() - 60_000, createdAt.getTime() + random.int(0, 3) * DAY));
    const tags = random.chance(0.6) ? [random.pick(TAG_POOL)] : [];
    noteRows.push({ id, ownerId: st.id, topicId: topic.id, title: index === 1 || st.demo ? topic.title : noteTitle(topic.title, random), contentMd, tags, createdAt, updatedAt });
    notesByStudent.set(st.id, [...(notesByStudent.get(st.id) ?? []), { id, topicId: topic.id, title: topic.title }]);
    if (createdAt.getTime() > NOW.getTime() - 130 * DAY) {
      activityRows.push({ id: uid("act", id, "c"), studentId: st.id, type: "note_created", refId: id, createdAt });
      if (updatedAt.getTime() - createdAt.getTime() > DAY / 2) {
        activityRows.push({ id: uid("act", id, "u"), studentId: st.id, type: "note_updated", refId: id, createdAt: updatedAt });
      }
    }
  };
  const dateInUnitWindow = (unitOrder: number, st: Student) => {
    let day = random.int((4 - unitOrder) * 16 + 4, (4 - unitOrder) * 16 + 19);
    if (st === ananya && day === ANANYA_GAP_DAY) day += 1;
    return daysAgo(day, random.int(8, 23), random.int(0, 59));
  };

  for (const st of students) {
    // Current semester: coverage depends on diligence; later units and harder topics are covered less.
    for (const subject of currentSubjects) {
      for (const unit of subject.units) {
        const unitFactor = [1, 0.95, 0.8, 0.6, 0.4][unit.order] ?? 0.4;
        const coveredTopics: TopicRow[] = [];
        for (const topic of unit.topics) {
          let p = st.diligence * unitFactor + 0.1;
          if (topic.id === MST) p *= st.section === "B" ? 0.2 : 0.45;
          if (topic.id === TOPO) p *= 0.6;
          const covered = st === ananya && subject.code === "CS201" && unit.order === 2 ? ANANYA_COVERED.has(topic.id) : random.chance(p);
          if (!covered) continue;
          coveredTopics.push(topic);
          const count = st.diligence > 0.7 && random.chance(0.5) ? 2 : 1;
          for (let n = 0; n < count; n++) addNote(st, subject, unit, topic, dateInUnitWindow(unit.order, st));
        }
        // Practice quizzes on units the student has started.
        const quiz = quizByUnit.get(unit.id);
        if (quiz && coveredTopics.length && random.chance(0.35 + st.diligence * 0.5)) {
          const attempts = st === ananya && subject.code === "CS201" && unit.order === 2 ? 2 : random.chance(0.3) ? 2 : 1;
          for (let a = 0; a < attempts; a++) {
            const answers = quiz.questions.map((q) => {
              const coveredQ = coveredTopics.some((t) => t.id === q.topicId);
              const forceWrong = st === ananya && ANANYA_MISSING.has(q.topicId) && a === 0;
              const sure = st === ananya && coveredQ; // keep her BFS/DFS/Dijkstra covered for the demo story
              const correct = sure || (!forceWrong && random.chance(coveredQ ? 0.85 : 0.25 + st.diligence * 0.3));
              return correct ? q.correctIndex : (q.correctIndex + 1) % 4;
            });
            const score = Math.round((answers.filter((ans, i) => ans === quiz.questions[i]?.correctIndex).length / quiz.questions.length) * 100);
            let day = random.int((4 - unit.order) * 16 + 1, (4 - unit.order) * 16 + 12);
            if (st === ananya && day === ANANYA_GAP_DAY) day += 1;
            const attemptedAt = daysAgo(day, random.int(9, 22), random.int(0, 59));
            const attemptId = uid("attempt", st.id, quiz.id, a);
            attemptRows.push({ id: attemptId, quizId: quiz.id, studentId: st.id, score, answers, attemptedAt });
            activityRows.push({ id: uid("act", attemptId), studentId: st.id, type: "quiz_attempted", refId: attemptId, createdAt: attemptedAt });
          }
        }
      }
    }

    // Past semesters: only demo students (they have full histories).
    if (st.demo) {
      for (const subject of pastSubjects) {
        for (const unit of subject.units) {
          for (const topic of unit.topics) {
            if (random.chance(0.94)) addNote(st, subject, unit, topic, daysAgo(random.int(160, 380), random.int(9, 22)));
          }
          const quiz = quizByUnit.get(unit.id);
          if (quiz) {
            const answers = quiz.questions.map((q) => (random.chance(0.88) ? q.correctIndex : (q.correctIndex + 1) % 4));
            const score = Math.round((answers.filter((ans, i) => ans === quiz.questions[i]?.correctIndex).length / quiz.questions.length) * 100);
            attemptRows.push({ id: uid("attempt", st.id, quiz.id, 0), quizId: quiz.id, studentId: st.id, score, answers, attemptedAt: daysAgo(random.int(160, 360)) });
          }
        }
      }
    }

    // Links between the student's own notes (and to topics/units).
    const own = notesByStudent.get(st.id) ?? [];
    const linkCount = st.demo ? 10 : random.int(0, 4);
    for (let i = 0; i < linkCount && own.length > 1; i++) {
      const from = random.pick(own);
      const to = random.pick(own);
      if (from.id === to.id) continue;
      linkRows.push({ id: uid("link", from.id, to.id), fromNoteId: from.id, toType: "note", toId: to.id });
    }
  }

  // Story links for Ananya: BFS ↔ DFS, BFS → "Queues" topic, Dijkstra → Graphs unit.
  const ananyaNotes = notesByStudent.get(ananya.id) ?? [];
  const noteFor = (topicId: string) => ananyaNotes.find((n) => n.topicId === topicId);
  const bfs = noteFor(uid("topic", "CS201", 2, 0));
  const dfs = noteFor(uid("topic", "CS201", 2, 1));
  const dijkstra = noteFor(uid("topic", "CS201", 2, 2));
  if (bfs && dfs) {
    linkRows.push({ id: uid("link", "story", bfs.id, dfs.id), fromNoteId: bfs.id, toType: "note", toId: dfs.id });
    linkRows.push({ id: uid("link", "story", dfs.id, bfs.id), fromNoteId: dfs.id, toType: "note", toId: bfs.id });
    linkRows.push({ id: uid("link", "story", bfs.id, "queues"), fromNoteId: bfs.id, toType: "topic", toId: uid("topic", "CS201", 0, 4) });
  }
  if (dijkstra) linkRows.push({ id: uid("link", "story", dijkstra.id, "unit"), fromNoteId: dijkstra.id, toType: "unit", toId: uid("unit", "CS201", 2) });
  const uniqueLinks = [...new Map(linkRows.map((l) => [`${l.fromNoteId}|${l.toType}|${l.toId}`, l])).values()];

  for (const rows of chunk(noteRows, 400)) await db.insert(s.notes).values(rows);
  for (const rows of chunk(uniqueLinks, 500)) await db.insert(s.noteLinks).values(rows);
  await db.insert(s.quizzes).values(quizRows);
  for (const rows of chunk(attemptRows, 500)) await db.insert(s.quizAttempts).values(rows);
  console.log(`  ✓ Notes: ${noteRows.length} notes, ${uniqueLinks.length} links · Quizzes: ${quizRows.length}, attempts: ${attemptRows.length}`);

  // ---- Assignments (offline submission; faculty marked past ones) ----
  const assignmentPlan = [
    { code: "CS201", unit: 0, title: "Linked List Operations in C++", due: -40, max: 20 },
    { code: "CS201", unit: 1, title: "BST Insert & Delete", due: -15, max: 20 },
    { code: "CS201", unit: 2, title: "Implementation of BFS in C++", due: 2, max: 20 },
    { code: "CS202", unit: 0, title: "ER Diagram for a Library System", due: -30, max: 10 },
    { code: "CS202", unit: 1, title: "SQL Joins Worksheet", due: 5, max: 10 },
    { code: "CS203", unit: 1, title: "Bank Account Class Design", due: -20, max: 15 },
    { code: "CS203", unit: 2, title: "Shape Hierarchy with Interfaces", due: 9, max: 15 },
    { code: "MA201", unit: 0, title: "Proof by Induction Problem Set", due: -25, max: 10 },
    { code: "MA201", unit: 2, title: "Recurrence Relations Set", due: 4, max: 10 },
    { code: "CS204", unit: 1, title: "Booth's Multiplication Exercises", due: -10, max: 10 },
    { code: "CS204", unit: 3, title: "Cache Mapping Problems", due: 12, max: 10 },
  ];
  const assignmentRows: Insert<typeof s.assignments>[] = [];
  const sectionRows: Insert<typeof s.assignmentSections>[] = [];
  const statusRows: Insert<typeof s.assignmentStatus>[] = [];
  for (const plan of assignmentPlan) {
    const subject = subjectByCode.get(plan.code);
    const unit = subject?.units[plan.unit];
    if (!subject || !unit) continue;
    const id = uid("assignment", plan.code, plan.title);
    const dueAt = plan.due < 0 ? daysAgo(-plan.due, 23, 59) : daysFromNow(plan.due);
    const teacher = facultyForSubject(plan.code);
    const createdAt = new Date(dueAt.getTime() - 14 * DAY);
    assignmentRows.push({
      id,
      subjectId: subject.id,
      unitId: unit.id,
      title: plan.title,
      description: `Complete "${plan.title}" for ${unit.title}. Submit your work on paper in class before the deadline.`,
      dueAt,
      maxMarks: plan.max,
      createdBy: teacher.id,
      createdAt,
      updatedAt: createdAt,
    });
    sectionRows.push(...BRANCH.sections.map((section) => ({ assignmentId: id, section })));
    for (const st of students) {
      const past = plan.due < 0;
      if (!past) {
        // Upcoming: a few already handed in early (Rahul did the BFS one; Ananya hasn't yet).
        const early = st.name === "Rahul Verma" ? true : st === ananya ? false : random.chance(0.25 * st.diligence + 0.05);
        if (early) statusRows.push({ assignmentId: id, studentId: st.id, status: "submitted", marks: null, markedBy: teacher.id, markedAt: daysAgo(random.int(0, 1)) });
        continue;
      }
      const roll = random.next();
      const status = roll < 0.45 + st.diligence * 0.45 ? "submitted" : roll < 0.6 + st.diligence * 0.35 ? "late" : "not_submitted";
      const marks = status === "not_submitted" ? null : Math.round(plan.max * Math.min(1, 0.45 + st.diligence * 0.5 + random.between(-0.1, 0.1)));
      statusRows.push({
        assignmentId: id,
        studentId: st.id,
        status,
        marks,
        remark: status === "late" ? "Submitted after the deadline" : null,
        markedBy: teacher.id,
        markedAt: new Date(dueAt.getTime() + random.int(1, 3) * DAY),
      });
    }
  }
  await db.insert(s.assignments).values(assignmentRows);
  await db.insert(s.assignmentSections).values(sectionRows);
  for (const rows of chunk(statusRows, 500)) await db.insert(s.assignmentStatus).values(rows);
  console.log(`  ✓ Assignments: ${assignmentRows.length}, marked rows: ${statusRows.length}`);

  // ---- Tutor conversations (Ananya's story + aggregated topic questions from everyone) ----
  const conversationRows: Insert<typeof s.aiConversations>[] = [];
  const messageRows: Insert<typeof s.aiMessages>[] = [];
  const graphsUnit = subjectByCode.get("CS201")?.units[2];
  const graphsResource = graphsUnit ? resourceByUnit.get(graphsUnit.id) : undefined;
  if (graphsUnit && graphsResource) {
    const convId = uid("conv", ananya.id, "bfs");
    const at = daysAgo(2, 21, 10);
    conversationRows.push({ id: convId, studentId: ananya.id, title: "Difference between BFS and DFS", scope: { type: "unit", unitId: graphsUnit.id }, createdAt: at, updatedAt: at });
    const bfsTopic = graphsUnit.topics[0];
    const dfsTopic = graphsUnit.topics[1];
    messageRows.push(
      { id: uid("msg", convId, 1), conversationId: convId, role: "user", content: "What's the difference between BFS and DFS?", topicId: bfsTopic?.id ?? null, createdAt: at },
      {
        id: uid("msg", convId, 2),
        conversationId: convId,
        role: "assistant",
        content:
          "**BFS** explores the graph level by level using a **queue**, so it finds the shortest path in an unweighted graph [S1]. " +
          "**DFS** goes as deep as possible first using a **stack** or recursion, which makes it the basis of topological sorting and cycle detection [S2].",
        citations: [bfsTopic, dfsTopic].filter(Boolean).map((topic, index) => ({
          ref: `S${index + 1}`,
          sourceType: "resource",
          sourceId: graphsResource.id,
          title: graphsResource.fileName,
          page: graphsResource.topicPage.get(topic!.id) ?? null,
          locationLabel: `Slide ${graphsResource.topicPage.get(topic!.id) ?? 1}`,
          snippet: slideText(topic!.title, graphsUnit.title, "Data Structures & Algorithms")[0],
        })),
        createdAt: new Date(at.getTime() + 4000),
      },
    );
  }
  const askedTopics = currentSubjects.flatMap((subject) => subject.units.flatMap((unit) => unit.topics));
  const hardTopics = new Set([MST, TOPO, uid("topic", "CS201", 2, 2), uid("topic", "CS202", 2, 2), uid("topic", "CS204", 1, 2), uid("topic", "CS204", 2, 4)]);
  for (const st of students) {
    const questions = random.int(st.demo ? 2 : 0, 6);
    if (!questions) continue;
    const convId = uid("conv", st.id, "general");
    const start = daysAgo(random.int(3, 40), 20);
    conversationRows.push({ id: convId, studentId: st.id, title: "Doubts", scope: { type: "semester", semesterNumber: CURRENT_SEMESTER }, createdAt: start, updatedAt: start });
    for (let q = 0; q < questions; q++) {
      const topic = random.chance(0.5) ? random.pick(askedTopics.filter((t) => hardTopics.has(t.id))) : random.pick(askedTopics);
      let day = random.int(0, 40);
      if (st === ananya && day === ANANYA_GAP_DAY) day += 1;
      const at = daysAgo(day, random.int(9, 23), random.int(0, 59));
      const messageId = uid("msg", convId, q);
      messageRows.push(
        { id: messageId, conversationId: convId, role: "user", content: `Can you explain ${topic.title} with an example?`, topicId: topic.id, createdAt: at },
        { id: uid("msg", convId, q, "a"), conversationId: convId, role: "assistant", content: `Here is ${topic.title} explained from your unit slides…`, createdAt: new Date(at.getTime() + 3000) },
      );
      activityRows.push({ id: uid("act", messageId), studentId: st.id, type: "ai_question", refId: messageId, createdAt: at });
    }
  }
  await db.insert(s.aiConversations).values(conversationRows);
  for (const rows of chunk(messageRows, 500)) await db.insert(s.aiMessages).values(rows);
  console.log(`  ✓ Tutor: ${conversationRows.length} conversations, ${messageRows.length} messages`);

  // ---- Background activity (resource opens) + Ananya's 12-day streak ----
  const currentResources = currentSubjects.flatMap((subject) => subject.units.map((unit) => resourceByUnit.get(unit.id)?.id).filter(Boolean)) as string[];
  for (const st of students) {
    for (let day = 0; day < 120; day++) {
      const forced = st === ananya && day < ANANYA_GAP_DAY;
      if (st === ananya && day === ANANYA_GAP_DAY) continue;
      if (!forced && !random.chance(st.diligence * 0.45)) continue;
      const opens = random.int(1, forced ? 3 : 2);
      for (let k = 0; k < opens; k++) {
        activityRows.push({ id: uid("act", st.id, day, k), studentId: st.id, type: "resource_opened", refId: random.pick(currentResources), createdAt: daysAgo(day, random.int(8, 22), random.int(0, 59)) });
      }
    }
  }
  const activity = activityRows.filter((row) => !(row.studentId === ananya.id && row.createdAt && isDay(row.createdAt, ANANYA_GAP_DAY)));
  for (const rows of chunk(activity, 1000)) await db.insert(s.activityLog).values(rows);
  console.log(`  ✓ Activity: ${activity.length} rows over ~120 days`);

  // ---- Notifications ----
  const notificationRows: Insert<typeof s.notifications>[] = [];
  const recentResources = resourceRows.filter((r) => r.createdAt && r.createdAt.getTime() > NOW.getTime() - 40 * DAY);
  for (const st of students) {
    for (const r of recentResources) {
      notificationRows.push({
        id: uid("notif", st.id, r.id!),
        userId: st.id,
        type: "resource_uploaded",
        title: "New lecture notes",
        body: `${r.fileName} was uploaded.`,
        target: { kind: "resource", resourceId: r.id, unitId: r.unitId },
        readAt: r.createdAt!.getTime() < NOW.getTime() - 7 * DAY ? r.createdAt : null,
        createdAt: r.createdAt,
      });
    }
    for (const a of assignmentRows) {
      notificationRows.push({
        id: uid("notif", st.id, a.id!),
        userId: st.id,
        type: "assignment_created",
        title: "New assignment",
        body: `${a.title} — due ${a.dueAt.toDateString()}`,
        target: { kind: "assignment", assignmentId: a.id },
        readAt: a.createdAt!.getTime() < NOW.getTime() - 7 * DAY ? a.createdAt : null,
        createdAt: a.createdAt,
      });
      const daysLeft = (a.dueAt.getTime() - NOW.getTime()) / DAY;
      if (daysLeft > 0 && daysLeft <= 3) {
        notificationRows.push({
          id: uid("notif", st.id, a.id!, "reminder"),
          userId: st.id,
          type: "deadline_reminder",
          title: "Deadline coming up",
          body: `${a.title} is due in ${Math.ceil(daysLeft)} day(s).`,
          target: { kind: "assignment", assignmentId: a.id },
          createdAt: daysAgo(0, 8),
        });
      }
    }
  }
  for (const row of statusRows.filter((r) => r.status !== "submitted" || r.marks !== null)) {
    const a = assignmentRows.find((x) => x.id === row.assignmentId);
    if (!a || !row.markedAt) continue;
    notificationRows.push({
      id: uid("notif", row.studentId, row.assignmentId, "marked"),
      userId: row.studentId,
      type: "status_marked",
      title: "Assignment marked",
      body: `${a.title}: ${row.status.replace("_", " ")}${row.marks != null ? ` · ${row.marks}/${a.maxMarks}` : ""}`,
      target: { kind: "assignment", assignmentId: a.id },
      readAt: row.markedAt.getTime() < NOW.getTime() - 5 * DAY ? row.markedAt : null,
      createdAt: row.markedAt,
    });
  }
  for (const rows of chunk(notificationRows, 1000)) await db.insert(s.notifications).values(rows);
  console.log(`  ✓ Notifications: ${notificationRows.length}`);

  await pool.end();
  console.log("\nDone. Demo logins (password for all):", DEMO_PASSWORD);
  for (const person of [...DEMO_STUDENTS, ...FACULTY]) console.log(`  ${person.email}`);
}

/** Even 16/16/16 split: demo students stay in B, everyone else fills the gaps. */
function balanceSections(students: Student[]) {
  const target = Math.ceil(students.length / BRANCH.sections.length);
  const counts = new Map(BRANCH.sections.map((section) => [section, 0]));
  for (const st of students.filter((x) => x.demo)) counts.set(st.section, (counts.get(st.section) ?? 0) + 1);
  for (const st of students.filter((x) => !x.demo)) {
    if ((counts.get(st.section) ?? 0) >= target) {
      st.section = BRANCH.sections.find((section) => (counts.get(section) ?? 0) < target) ?? st.section;
    }
    counts.set(st.section, (counts.get(st.section) ?? 0) + 1);
  }
}

function isDay(date: Date, daysBack: number): boolean {
  const day = daysAgo(daysBack, 0, 0);
  return date >= day && date.getTime() < day.getTime() + DAY;
}

main().catch((error: unknown) => {
  const cause = error instanceof Error && error.cause instanceof Error ? `\n  cause: ${error.cause.message}` : "";
  console.error("✗ Seed failed:", error instanceof Error ? error.message.split("\n")[0] : error, cause);
  process.exit(1);
});
