// AI database queries (conversations, messages, quizzes, attempts, analyses). Owner: BE.
import "server-only";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { TutorScope } from "@/contracts/ai";
import { getDb } from "@/lib/db";
import {
  aiConversations,
  aiMessages,
  noteAnalyses,
  quizzes,
  quizAttempts,
  semesters,
  subjects,
  units,
} from "@/lib/db/schema";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- Conversations & Messages ----------

export async function listConversationsForStudent(studentId: string) {
  if (!UUID_RE.test(studentId)) return [];
  return getDb()
    .select({
      id: aiConversations.id,
      title: aiConversations.title,
      scope: aiConversations.scope,
      createdAt: aiConversations.createdAt,
      updatedAt: aiConversations.updatedAt,
    })
    .from(aiConversations)
    .where(eq(aiConversations.studentId, studentId))
    .orderBy(desc(aiConversations.updatedAt));
}

export async function findConversationWithMessages(conversationId: string, studentId: string) {
  if (!UUID_RE.test(conversationId) || !UUID_RE.test(studentId)) return null;

  const db = getDb();
  const [conversation] = await db
    .select()
    .from(aiConversations)
    .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.studentId, studentId)))
    .limit(1);

  if (!conversation) return null;

  const messages = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(asc(aiMessages.createdAt));

  return { conversation, messages };
}

export async function ensureConversation(
  conversationId: string | null,
  studentId: string,
  title: string,
  scope: TutorScope,
) {
  const db = getDb();

  if (conversationId && UUID_RE.test(conversationId)) {
    const [existing] = await db
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.studentId, studentId)))
      .limit(1);
    if (existing) {
      // Touch updatedAt
      await db
        .update(aiConversations)
        .set({ updatedAt: new Date() })
        .where(eq(aiConversations.id, conversationId));
      return existing;
    }
  }

  // Create new conversation
  const [created] = await db
    .insert(aiConversations)
    .values({
      id: conversationId && UUID_RE.test(conversationId) ? conversationId : undefined,
      studentId,
      title: title.slice(0, 100),
      scope,
    })
    .returning();

  return created;
}

export async function insertAiMessage(data: {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  citations?: unknown;
  notCovered?: boolean;
  topicId?: string | null;
}) {
  const [created] = await getDb()
    .insert(aiMessages)
    .values({
      conversationId: data.conversationId,
      role: data.role,
      content: data.content,
      citations: data.citations ?? [],
      notCovered: data.notCovered ?? false,
      topicId: data.topicId && UUID_RE.test(data.topicId) ? data.topicId : null,
    })
    .returning();

  // Update conversation updatedAt
  await getDb()
    .update(aiConversations)
    .set({ updatedAt: new Date() })
    .where(eq(aiConversations.id, data.conversationId));

  return created;
}

export async function deleteConversationRecord(conversationId: string, studentId: string): Promise<boolean> {
  if (!UUID_RE.test(conversationId) || !UUID_RE.test(studentId)) return false;

  const result = await getDb()
    .delete(aiConversations)
    .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.studentId, studentId)))
    .returning({ id: aiConversations.id });

  return result.length > 0;
}

// ---------- Quizzes ----------

export async function findCachedQuiz(unitId: string, topicId?: string | null) {
  if (!UUID_RE.test(unitId)) return null;

  const conditions = [eq(quizzes.unitId, unitId)];
  if (topicId && UUID_RE.test(topicId)) {
    conditions.push(eq(quizzes.topicId, topicId));
  } else {
    conditions.push(isNull(quizzes.topicId));
  }

  const [row] = await getDb()
    .select()
    .from(quizzes)
    .where(and(...conditions))
    .orderBy(desc(quizzes.createdAt))
    .limit(1);

  return row ?? null;
}

export async function findQuizById(quizId: string) {
  if (!UUID_RE.test(quizId)) return null;

  const [row] = await getDb()
    .select()
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1);

  return row ?? null;
}

export async function insertQuizRecord(data: {
  unitId: string;
  topicId?: string | null;
  title: string;
  questions: unknown;
  sourceHash?: string | null;
}) {
  const [created] = await getDb()
    .insert(quizzes)
    .values({
      unitId: data.unitId,
      topicId: data.topicId && UUID_RE.test(data.topicId) ? data.topicId : null,
      title: data.title,
      questions: data.questions,
      sourceHash: data.sourceHash ?? null,
    })
    .returning();

  return created;
}

export async function insertQuizAttemptRecord(data: {
  quizId: string;
  studentId: string;
  score: number;
  answers: unknown;
}) {
  const [created] = await getDb()
    .insert(quizAttempts)
    .values({
      quizId: data.quizId,
      studentId: data.studentId,
      score: data.score,
      answers: data.answers,
    })
    .returning();

  return created;
}

export async function listQuizAttemptsForStudent(filters: {
  studentId: string;
  semesterNumber?: number;
  unitId?: string;
  limit: number;
}) {
  if (!UUID_RE.test(filters.studentId)) return [];

  const conditions = [eq(quizAttempts.studentId, filters.studentId)];
  if (filters.unitId && UUID_RE.test(filters.unitId)) {
    conditions.push(eq(quizzes.unitId, filters.unitId));
  }
  if (filters.semesterNumber !== undefined) {
    conditions.push(eq(semesters.number, filters.semesterNumber));
  }

  const rows = await getDb()
    .select({
      id: quizAttempts.id,
      quizId: quizAttempts.quizId,
      quizTitle: quizzes.title,
      unitId: units.id,
      unitTitle: units.title,
      subjectName: subjects.name,
      score: quizAttempts.score,
      attemptedAt: quizAttempts.attemptedAt,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
    .innerJoin(units, eq(units.id, quizzes.unitId))
    .innerJoin(subjects, eq(subjects.id, units.subjectId))
    .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
    .where(and(...conditions))
    .orderBy(desc(quizAttempts.attemptedAt))
    .limit(filters.limit);

  return rows;
}

// ---------- Note Analyses ----------

export async function findCachedNoteAnalysis(noteId: string) {
  if (!UUID_RE.test(noteId)) return null;

  const [row] = await getDb()
    .select()
    .from(noteAnalyses)
    .where(eq(noteAnalyses.noteId, noteId))
    .limit(1);

  return row ?? null;
}

export async function upsertNoteAnalysisRecord(
  noteId: string,
  contentHash: string,
  result: unknown,
) {
  const [upserted] = await getDb()
    .insert(noteAnalyses)
    .values({
      noteId,
      contentHash,
      result,
      generatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [noteAnalyses.noteId],
      set: {
        contentHash,
        result,
        generatedAt: new Date(),
      },
    })
    .returning();

  return upserted;
}
