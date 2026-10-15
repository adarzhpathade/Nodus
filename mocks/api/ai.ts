import type { AiApi, Citation, GapItem, NoteAnalysis, Quiz, TutorScope } from "@/contracts/ai";
import type { LinkTarget } from "@/contracts/notes";
import { clone, fail, maybeFailAi, mockRequest, requireStudent } from "../context";
import { createRandom, mockId } from "../fixtures/ids";
import { buildQuestions } from "../fixtures/quizzes";
import { sourceFor, unitProgress } from "../progress";
import { logActivity, type MockStore } from "../store";
import { assertSemesterOpen, byOrder, excerptOf, findSubject, findTopic, findUnit, nowIso, subjectOfUnit } from "./shared";

/** Extra delay so AI loading states are visible. */
const AI_LATENCY_MS = 900;

// ---------- Retrieval (used by the tutor stream in mocks/ai-tutor.ts) ----------

const STOP_WORDS = new Set(
  "what when where which who why how the and for are is was were does do did with from that this into about between difference explain tell give mean meaning use used using can you please vs".split(" "),
);

export const termsOf = (text: string) =>
  [...new Set(text.toLowerCase().match(/[a-z0-9+]{3,}/g) ?? [])].filter((word) => !STOP_WORDS.has(word));

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Number of query terms present as whole words (plural / possessive endings allowed). */
const overlap = (terms: string[], text: string) => {
  const haystack = text.toLowerCase();
  return terms.filter((term) => new RegExp(`\\b${escapeRegExp(term)}(s|es|'s)?\\b`).test(haystack)).length;
};

function unitsInScope(store: MockStore, scope: TutorScope): Set<string> {
  if (scope.type === "unit") return new Set([scope.unitId]);
  const subjectIds =
    scope.type === "subject"
      ? new Set([scope.subjectId])
      : new Set(store.subjects.filter((s) => s.semesterNumber === scope.semesterNumber).map((s) => s.id));
  return new Set(store.units.filter((u) => subjectIds.has(u.subjectId)).map((u) => u.id));
}

/** Top matching faculty passages (own section only) + the student's own notes, as citations. */
export function retrieve(store: MockStore, input: { studentId: string; section: string; scope: TutorScope; question: string; limit?: number }) {
  const terms = termsOf(input.question);
  const units = unitsInScope(store, input.scope);
  const hits: { score: number; citation: Omit<Citation, "ref"> }[] = [];

  for (const resource of store.resources) {
    if (!units.has(resource.unitId) || !resource.visibleSections.includes(input.section)) continue;
    for (const passage of store.passages.get(resource.id) ?? []) {
      const score = overlap(terms, passage.text);
      if (score < 1) continue;
      hits.push({
        score,
        citation: {
          sourceType: "resource",
          sourceId: resource.id,
          title: resource.fileName,
          page: passage.page,
          locationLabel: `${resource.type === "pdf" ? "Page" : "Slide"} ${passage.page}`,
          snippet: passage.text,
        },
      });
    }
  }

  for (const note of store.notes) {
    if (note.ownerId !== input.studentId) continue;
    const topic = store.topics.find((t) => t.id === note.topicId);
    if (!topic || !units.has(topic.unitId)) continue;
    const paragraphs = note.contentMd.split(/\n\s*\n/).map((p) => excerptOf(p, 220)).filter(Boolean);
    const best = paragraphs
      .map((text) => ({ text, score: overlap(terms, text) + overlap(terms, note.title) }))
      .sort((a, b) => b.score - a.score)[0];
    if (!best || best.score < 1.5) continue;
    hits.push({
      score: best.score - 0.25, // faculty material first on ties
      citation: { sourceType: "note", sourceId: note.id, title: note.title, page: null, locationLabel: "Your note", snippet: best.text },
    });
  }

  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit ?? 3)
    .map((hit, index): Citation => ({ ref: `S${index + 1}`, ...hit.citation }));
}

/** Best-matching topic in scope, for the "not covered — check X" suggestion. */
export function suggestTopic(store: MockStore, scope: TutorScope, question: string) {
  const terms = termsOf(question);
  const units = unitsInScope(store, scope);
  const best = store.topics
    .filter((t) => units.has(t.unitId))
    .map((t) => ({ topic: t, score: overlap(terms, t.title) }))
    .sort((a, b) => b.score - a.score)[0];
  if (!best || best.score === 0) return null;
  const unit = findUnit(store, best.topic.unitId);
  return { topic: best.topic, unit, subject: findSubject(store, unit.subjectId) };
}

// ---------- Analyze Note / Gap Finder helpers ----------

const hashOf = (text: string) => {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
};

function analyse(store: MockStore, noteId: string, title: string, contentMd: string, topicId: string): NoteAnalysis {
  const topic = findTopic(store, topicId);
  const unit = findUnit(store, topic.unitId);
  const text = excerptOf(contentMd, 2000);
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 20);
  const summary = sentences.slice(0, 2).join(" ") || `Short note on ${topic.title}. Add a definition and an example to make it complete.`;

  const todos = [...contentMd.matchAll(/^\s*[-*] \[ ] (.+)$/gm)].map((m) => m[1].trim());
  if (contentMd.length < 300) todos.push(`Add a worked example for ${topic.title}`);

  const lower = contentMd.toLowerCase();
  const linkedIds = new Set(store.links.filter((l) => l.fromNoteId === noteId).map((l) => l.target.id));
  const siblingTopics = store.topics.filter((t) => t.unitId === unit.id && t.id !== topic.id);
  const suggestedLinks: NoteAnalysis["suggestedLinks"] = siblingTopics
    .filter((t) => !linkedIds.has(t.id) && termsOf(t.title).some((term) => term.length > 3 && lower.includes(term)))
    .slice(0, 3)
    .map((t) => ({ target: { type: "topic", id: t.id } satisfies LinkTarget, title: t.title, reason: `Your note mentions ${t.title.toLowerCase()}.` }));

  const tags = [...new Set([...termsOf(topic.title), ...termsOf(unit.title)])]
    .filter((t) => t.length > 3)
    .slice(0, 4)
    .map((t) => t.replace(/[^a-z0-9-]/g, ""))
    .filter(Boolean);

  const titleIsGeneric = /^untitled/i.test(title) || title.length < 4;
  return {
    noteId,
    summary,
    suggestedTitle: titleIsGeneric ? `${topic.title} — key ideas` : title,
    tags,
    todos: todos.slice(0, 5),
    suggestedLinks,
    generatedAt: nowIso(),
    cached: false,
  };
}

// ---------- API ----------

export const aiMock: AiApi = {
  async listConversations() {
    const store = await mockRequest();
    const { user } = await requireStudent(store);
    return clone(
      store.conversations
        .filter((c) => c.studentId === user.id)
        .map((c) => c.conversation)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    );
  },

  async getConversation(conversationId) {
    const store = await mockRequest();
    const { user } = await requireStudent(store);
    const record = store.conversations.find((c) => c.conversation.id === conversationId && c.studentId === user.id);
    if (!record) throw fail("NOT_FOUND", "Conversation not found.");
    return clone({ conversation: record.conversation, messages: record.messages });
  },

  async deleteConversation(input) {
    const store = await mockRequest();
    const { user } = await requireStudent(store);
    store.conversations = store.conversations.filter((c) => !(c.conversation.id === input.conversationId && c.studentId === user.id));
  },

  async generateQuiz(input) {
    const store = await mockRequest(AI_LATENCY_MS);
    maybeFailAi();
    const { profile } = await requireStudent(store);
    const unit = findUnit(store, input.unitId);
    const subject = findSubject(store, unit.subjectId);
    assertSemesterOpen(profile, subject.semesterNumber);
    const topicId = input.topicId ?? null;
    if (topicId && findTopic(store, topicId).unitId !== unit.id) throw fail("VALIDATION", "That topic is not in this unit.");
    const count = input.questionCount ?? 5;

    if (!input.fresh) {
      const cached = store.quizzes.find((q) => q.unitId === unit.id && q.topicId === topicId && q.questions.length === count);
      if (cached) return clone(cached);
    }

    const createdAt = nowIso();
    const id = mockId(`quiz:generated:${unit.id}:${topicId}:${createdAt}`);
    const unitTopics = store.topics.filter((t) => t.unitId === unit.id).sort(byOrder);
    const quiz: Quiz = {
      id,
      unitId: unit.id,
      topicId,
      title: topicId ? `${findTopic(store, topicId).title} practice` : `${unit.title} practice`,
      questions: buildQuestions({
        unit,
        subjectName: subject.name,
        unitTopics,
        allTopics: store.topics,
        allUnits: store.units,
        allSubjectNames: store.subjects.map((s) => s.name),
        topicId,
        count,
        random: createRandom(id),
        idPrefix: id.slice(0, 8),
      }),
      createdAt,
    };
    if (!quiz.questions.length) throw fail("CONFLICT", "This unit has no topics to quiz you on yet.");
    store.quizzes.push(quiz);
    return clone(quiz);
  },

  async getQuiz(quizId) {
    const store = await mockRequest();
    await requireStudent(store);
    const quiz = store.quizzes.find((q) => q.id === quizId);
    if (!quiz) throw fail("NOT_FOUND", "Quiz not found.");
    return clone(quiz);
  },

  async submitQuizAttempt(input) {
    const store = await mockRequest(300);
    const { user } = await requireStudent(store);
    const quiz = store.quizzes.find((q) => q.id === input.quizId);
    if (!quiz) throw fail("NOT_FOUND", "Quiz not found.");
    if (input.answers.length !== quiz.questions.length) {
      throw fail("VALIDATION", `Expected ${quiz.questions.length} answers.`, { fieldErrors: { answers: ["Wrong length"] } });
    }
    const perQuestion = quiz.questions.map((q, i) => ({
      questionId: q.id,
      selectedIndex: input.answers[i],
      correct: input.answers[i] === q.correctIndex,
    }));
    const correctCount = perQuestion.filter((p) => p.correct).length;
    const score = Math.round((correctCount / quiz.questions.length) * 1000) / 10;
    const attemptedAt = nowIso();
    const attemptId = mockId(`attempt:new:${user.id}:${attemptedAt}`);
    store.attempts.push({ id: attemptId, quizId: quiz.id, studentId: user.id, score, answers: input.answers, attemptedAt });
    logActivity(store, user.id, "quiz_attempted");
    return clone({
      attemptId,
      quizId: quiz.id,
      score,
      correctCount,
      total: quiz.questions.length,
      perQuestion,
      unitProgress: unitProgress(store, quiz.unitId, sourceFor(store, user.id)),
    });
  },

  async listQuizAttempts(query) {
    const store = await mockRequest();
    const { user } = await requireStudent(store);
    return clone(
      store.attempts
        .filter((a) => a.studentId === user.id)
        .flatMap((attempt) => {
          const quiz = store.quizzes.find((q) => q.id === attempt.quizId);
          if (!quiz || (query.unitId && quiz.unitId !== query.unitId)) return [];
          const unit = findUnit(store, quiz.unitId);
          const subject = subjectOfUnit(store, unit.id);
          if (query.semesterNumber && subject.semesterNumber !== query.semesterNumber) return [];
          return [
            {
              id: attempt.id,
              quizId: quiz.id,
              quizTitle: quiz.title,
              unitId: unit.id,
              unitTitle: unit.title,
              subjectName: subject.name,
              score: attempt.score,
              attemptedAt: attempt.attemptedAt,
            },
          ];
        })
        .sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt))
        .slice(0, query.limit ?? 20),
    );
  },

  async analyzeNote(input) {
    const store = await mockRequest();
    const { user } = await requireStudent(store);
    const note = store.notes.find((n) => n.id === input.noteId && n.ownerId === user.id);
    if (!note) throw fail("NOT_FOUND", "Note not found.");

    // Cached by content hash: unchanged note → instant cached result, no AI call.
    const hash = hashOf(`${note.title}\n${note.contentMd}`);
    const cached = store.analyses.get(note.id);
    if (cached?.hash === hash) return clone({ ...cached.analysis, cached: true });

    await mockRequest(AI_LATENCY_MS);
    maybeFailAi();
    if (excerptOf(note.contentMd).length < 20) throw fail("VALIDATION", "Write a few lines first, then analyze the note.");
    const analysis = analyse(store, note.id, note.title, note.contentMd, note.topicId);
    store.analyses.set(note.id, { hash, analysis });
    return clone(analysis);
  },

  async getGapReport(input) {
    const store = await mockRequest(AI_LATENCY_MS);
    maybeFailAi();
    const { user, profile } = await requireStudent(store);
    const unit = findUnit(store, input.unitId);
    assertSemesterOpen(profile, subjectOfUnit(store, unit.id).semesterNumber);
    const progress = unitProgress(store, unit.id, sourceFor(store, user.id));

    const missing: GapItem[] = [];
    const weak: GapItem[] = [];
    for (const topic of progress.topics) {
      if (topic.noteCount === 0) {
        missing.push({ topicId: topic.topicId, title: topic.title, reason: "No notes yet — the faculty material covers this topic." });
      } else if (topic.bestQuizScore !== null && topic.bestQuizScore < 50) {
        weak.push({ topicId: topic.topicId, title: topic.title, reason: `Your best quiz score here is ${topic.bestQuizScore}%. Revise and retry the quiz.` });
      } else {
        const notes = store.notes.filter((n) => n.ownerId === user.id && n.topicId === topic.topicId);
        if (notes.every((n) => n.contentMd.length < 250)) {
          weak.push({ topicId: topic.topicId, title: topic.title, reason: "Your note is very short — add the definition and an example." });
        }
      }
    }
    return clone({
      unitId: unit.id,
      missing,
      weak,
      coveredCount: progress.coveredTopics,
      totalTopics: progress.totalTopics,
      generatedAt: nowIso(),
    });
  },
};
