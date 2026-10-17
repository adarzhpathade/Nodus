// Real AiApi implementation (C-07, BE-7.1 … BE-7.10). Owner: BE.
import "server-only";
import {
  AnalyzeNoteInput,
  ConversationIdInput,
  GapReportInput,
  GenerateQuizInput,
  ListQuizAttemptsQuery,
  SubmitQuizInput,
  type AiApi,
  type Citation,
  type Conversation,
  type ConversationDetail,
  type GapReport,
  type NoteAnalysis,
  type Quiz,
  type QuizAttemptResult,
  type QuizAttemptSummary,
  type QuizQuestion,
  type TutorScope,
} from "@/contracts/ai";
import { GatewayError } from "@/contracts/common";
import { assertSemesterOpen, requireStudent } from "@/lib/auth/guards";
import { analyzeNoteService } from "@/lib/ai/analyze";
import { getGapReportService } from "@/lib/ai/gap";
import { generateQuizService, submitQuizAttemptService } from "@/lib/ai/quiz";
import { getDb } from "@/lib/db";
import {
  deleteConversationRecord,
  findConversationWithMessages,
  findQuizById,
  listConversationsForStudent,
  listQuizAttemptsForStudent,
} from "@/lib/db/queries/ai";
import { semesters, subjects, units } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const aiApi: AiApi = {
  async listConversations(): Promise<Conversation[]> {
    const student = await requireStudent();
    const rows = await listConversationsForStudent(student.user.id);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      scope: r.scope as TutorScope,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  },

  async getConversation(conversationId: string): Promise<ConversationDetail> {
    const student = await requireStudent();
    const found = await findConversationWithMessages(conversationId, student.user.id);
    if (!found) {
      throw new GatewayError("NOT_FOUND", "Conversation not found.");
    }

    return {
      conversation: {
        id: found.conversation.id,
        title: found.conversation.title,
        scope: found.conversation.scope as TutorScope,
        createdAt: found.conversation.createdAt.toISOString(),
        updatedAt: found.conversation.updatedAt.toISOString(),
      },
      messages: found.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        citations: (m.citations ?? []) as Citation[],
        notCovered: m.notCovered,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  },

  async deleteConversation(input: ConversationIdInput): Promise<void> {
    const student = await requireStudent();
    const parsed = ConversationIdInput.parse(input);
    const deleted = await deleteConversationRecord(parsed.conversationId, student.user.id);
    if (!deleted) {
      throw new GatewayError("NOT_FOUND", "Conversation not found.");
    }
  },

  async generateQuiz(input: GenerateQuizInput): Promise<Quiz> {
    const student = await requireStudent();
    const parsed = GenerateQuizInput.parse(input);
    return generateQuizService(student, parsed);
  },

  async getQuiz(quizId: string): Promise<Quiz> {
    const student = await requireStudent();
    const quiz = await findQuizById(quizId);
    if (!quiz) {
      throw new GatewayError("NOT_FOUND", "Quiz not found.");
    }

    // Verify student has access to the quiz's semester
    const [uRow] = await getDb()
      .select({
        semesterNumber: semesters.number,
        branchId: semesters.branchId,
      })
      .from(units)
      .innerJoin(subjects, eq(subjects.id, units.subjectId))
      .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
      .where(eq(units.id, quiz.unitId))
      .limit(1);

    if (!uRow || uRow.branchId !== student.profile.branch.id) {
      throw new GatewayError("NOT_FOUND", "Quiz not found.");
    }
    assertSemesterOpen(student, uRow.semesterNumber);

    return {
      id: quiz.id,
      unitId: quiz.unitId,
      topicId: quiz.topicId,
      title: quiz.title,
      questions: quiz.questions as QuizQuestion[],
      createdAt: quiz.createdAt.toISOString(),
    };
  },

  async submitQuizAttempt(input: SubmitQuizInput): Promise<QuizAttemptResult> {
    const student = await requireStudent();
    const parsed = SubmitQuizInput.parse(input);
    return submitQuizAttemptService(student, parsed);
  },

  async listQuizAttempts(query: ListQuizAttemptsQuery): Promise<QuizAttemptSummary[]> {
    const student = await requireStudent();
    const parsed = ListQuizAttemptsQuery.parse(query);

    if (parsed.semesterNumber !== undefined) {
      assertSemesterOpen(student, parsed.semesterNumber);
    }

    const rows = await listQuizAttemptsForStudent({
      studentId: student.user.id,
      semesterNumber: parsed.semesterNumber,
      unitId: parsed.unitId,
      limit: parsed.limit ?? 20,
    });

    return rows.map((r) => ({
      id: r.id,
      quizId: r.quizId,
      quizTitle: r.quizTitle,
      unitId: r.unitId,
      unitTitle: r.unitTitle,
      subjectName: r.subjectName,
      score: r.score,
      attemptedAt: r.attemptedAt.toISOString(),
    }));
  },

  async analyzeNote(input: AnalyzeNoteInput): Promise<NoteAnalysis> {
    const student = await requireStudent();
    const parsed = AnalyzeNoteInput.parse(input);
    return analyzeNoteService(student, parsed.noteId);
  },

  async getGapReport(input: GapReportInput): Promise<GapReport> {
    const student = await requireStudent();
    const parsed = GapReportInput.parse(input);
    return getGapReportService(student, parsed);
  },
};
