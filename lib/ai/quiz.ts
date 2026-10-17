// Practice quiz generation and attempt handling (BE-7.6, BE-7.7). Owner: BE.
import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { generateObject } from "ai";
import { and, desc, eq, sql } from "drizzle-orm";
import type {
  GenerateQuizInput,
  Quiz,
  QuizAttemptResult,
  QuizQuestion,
  SubmitQuizInput,
} from "@/contracts/ai";
import { GatewayError } from "@/contracts/common";
import type { UnitProgress } from "@/contracts/progress";
import type { OnboardedStudent } from "@/lib/auth/guards";
import { getChatModel, mapAiError } from "@/lib/ai/config";
import { buildQuizSystemPrompt, buildQuizUserPrompt } from "@/lib/ai/prompts";
import { QuizGeneratedSchema } from "@/lib/ai/schemas";
import { getDb } from "@/lib/db";
import { logActivity } from "@/lib/db/queries/activity";
import {
  findCachedQuiz,
  findQuizById,
  insertQuizAttemptRecord,
  insertQuizRecord,
} from "@/lib/db/queries/ai";
import { getStudentUnitProgressRawData } from "@/lib/db/queries/progress";
import { calculateUnitProgress } from "@/lib/progress";
import {
  resourceChunks,
  resources,
  semesters,
  subjects,
  topics,
  units,
} from "@/lib/db/schema";

export async function generateQuizService(
  student: OnboardedStudent,
  input: GenerateQuizInput,
): Promise<Quiz> {
  const db = getDb();

  // 1. Verify unit belongs to student's branch and semester is open
  const [unitRow] = await db
    .select({
      unitId: units.id,
      unitTitle: units.title,
      semesterNumber: semesters.number,
      branchId: semesters.branchId,
    })
    .from(units)
    .innerJoin(subjects, eq(subjects.id, units.subjectId))
    .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
    .where(eq(units.id, input.unitId))
    .limit(1);

  if (!unitRow || unitRow.branchId !== student.profile.branch.id) {
    throw new GatewayError("NOT_FOUND", "Unit not found.");
  }
  if (unitRow.semesterNumber > student.profile.currentSemester) {
    throw new GatewayError("LOCKED", `Semester ${unitRow.semesterNumber} is locked.`);
  }

  let topicTitle: string | null = null;
  if (input.topicId) {
    const [tRow] = await db
      .select({ title: topics.title })
      .from(topics)
      .where(and(eq(topics.id, input.topicId), eq(topics.unitId, input.unitId)))
      .limit(1);
    if (!tRow) throw new GatewayError("NOT_FOUND", "Topic not found in this unit.");
    topicTitle = tRow.title;
  }

  // 2. Cache check (unless fresh requested)
  if (!input.fresh) {
    const cached = await findCachedQuiz(input.unitId, input.topicId);
    if (cached) {
      return {
        id: cached.id,
        unitId: cached.unitId,
        topicId: cached.topicId,
        title: cached.title,
        questions: cached.questions as QuizQuestion[],
        createdAt: cached.createdAt.toISOString(),
      };
    }
  }

  // 3. Gather faculty materials for this unit (and section)
  const chunkRows = await db
    .select({
      fileName: resources.fileName,
      content: resourceChunks.content,
    })
    .from(resourceChunks)
    .innerJoin(resources, eq(resources.id, resourceChunks.resourceId))
    .where(
      and(
        eq(resources.unitId, input.unitId),
        eq(resources.ingestionStatus, "ready"),
        sql`${student.profile.section} = ANY(${resources.visibleSections})`,
      ),
    )
    .orderBy(desc(resources.createdAt))
    .limit(25);

  const materials = chunkRows.map((r) => ({ title: r.fileName, content: r.content }));
  const combinedText = materials.map((m) => m.content).join("\n\n");

  if (!combinedText.trim()) {
    throw new GatewayError(
      "AI_UNAVAILABLE",
      "No faculty material has been uploaded yet for this unit to generate quiz questions.",
    );
  }

  const sourceHash = createHash("sha256")
    .update(combinedText + (input.topicId ?? ""))
    .digest("hex");

  // 4. Generate structured quiz with AI
  let model;
  try {
    model = getChatModel();
  } catch (err) {
    throw mapAiError(err);
  }

  let generated;
  try {
    const result = await generateObject({
      model,
      schema: QuizGeneratedSchema,
      system: buildQuizSystemPrompt(),
      prompt: buildQuizUserPrompt({
        unitTitle: unitRow.unitTitle,
        topicTitle,
        questionCount: input.questionCount ?? 5,
        materials,
      }),
    });
    generated = result.object;
  } catch (err) {
    console.error("[nodus] quiz generation error:", err);
    throw mapAiError(err);
  }

  const formattedQuestions: QuizQuestion[] = generated.questions.map((q) => ({
    id: randomUUID(),
    topicId: input.topicId ?? null,
    question: q.question,
    options: q.options as [string, string, string, string],
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  }));

  // 5. Store quiz in database
  const createdRecord = await insertQuizRecord({
    unitId: input.unitId,
    topicId: input.topicId ?? null,
    title: generated.title || `${unitRow.unitTitle} Practice Quiz`,
    questions: formattedQuestions,
    sourceHash,
  });

  return {
    id: createdRecord.id,
    unitId: createdRecord.unitId,
    topicId: createdRecord.topicId,
    title: createdRecord.title,
    questions: formattedQuestions,
    createdAt: createdRecord.createdAt.toISOString(),
  };
}

export async function submitQuizAttemptService(
  student: OnboardedStudent,
  input: SubmitQuizInput,
): Promise<QuizAttemptResult> {
  const quiz = await findQuizById(input.quizId);
  if (!quiz) {
    throw new GatewayError("NOT_FOUND", "Quiz not found.");
  }

  const questions = quiz.questions as QuizQuestion[];
  const total = questions.length;
  let correctCount = 0;

  const perQuestion = questions.map((q, idx) => {
    const selectedIndex = input.answers[idx] ?? null;
    const correct = selectedIndex !== null && selectedIndex === q.correctIndex;
    if (correct) correctCount++;
    return {
      questionId: q.id,
      selectedIndex,
      correct,
    };
  });

  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  // Store attempt
  const attempt = await insertQuizAttemptRecord({
    quizId: quiz.id,
    studentId: student.user.id,
    score,
    answers: input.answers,
  });

  // Log activity
  await logActivity({
    studentId: student.user.id,
    type: "quiz_attempted",
    refId: attempt.id,
  });

  // Recalculate unit progress using the progress engine
  const raw = await getStudentUnitProgressRawData(student.user.id, quiz.unitId);
  if (!raw) {
    throw new GatewayError("NOT_FOUND", "Unit not found.");
  }

  const unitProgress: UnitProgress = calculateUnitProgress({
    unitId: raw.unit.id,
    topics: raw.topics.map((t) => ({
      topicId: t.id,
      title: t.title,
      order: t.order,
      noteCount: raw.noteCountsByTopic.get(t.id) ?? 0,
      bestQuizScore: raw.bestQuizScoreByTopic.get(t.id) ?? null,
    })),
    quizScores: raw.quizScores,
  });

  return {
    attemptId: attempt.id,
    quizId: quiz.id,
    score,
    correctCount,
    total,
    perQuestion,
    unitProgress,
  };
}
