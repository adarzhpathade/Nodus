// POST /api/ai/tutor — streaming, cited tutor answers (AI SDK UI message stream). Owner: BE.
// Body: { messages: TutorUIMessage[], conversationId, scope }  (see contracts/ai.ts)
// Mock mode ("ai" in MOCK_FEATURES): streams the canned reply from mocks/ai-tutor.ts.
// Real mode: RAG over pgvector + Gemini (BE-7.3, BE-7.4, BE-7.5).
import { randomUUID } from "node:crypto";
import { createUIMessageStream, createUIMessageStreamResponse, streamText, type ModelMessage } from "ai";
import { z } from "zod";
import { TutorRequestBody, type TutorUIMessage } from "@/contracts/ai";
import { GatewayError } from "@/contracts/common";
import { errorResponse, toErrorPayload, validationError } from "@/lib/actions/result";
import { getChatModel, mapAiError } from "@/lib/ai/config";
import { buildNotCoveredReply, buildTutorSystemPrompt } from "@/lib/ai/prompts";
import { retrieveChunks } from "@/lib/ai/rag/retrieve";
import { assertSemesterOpen, requireStudent } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import { logActivity } from "@/lib/db/queries/activity";
import { ensureConversation, insertAiMessage } from "@/lib/db/queries/ai";
import { semesters, subjects, units } from "@/lib/db/schema";
import { isMocked } from "@/lib/gateway";
import { mockTutorReply } from "@/mocks/ai-tutor";
import { eq } from "drizzle-orm";

const Body = TutorRequestBody.extend({
  messages: z.array(z.object({ role: z.string(), parts: z.array(z.unknown()) }).loose()).min(1),
});

function lastUserText(messages: z.infer<typeof Body>["messages"]): string {
  const last = [...messages].reverse().find((message) => message.role === "user");
  return (last?.parts ?? [])
    .map((part) => (part && typeof part === "object" && "text" in part ? String(part.text) : ""))
    .join(" ")
    .trim();
}

function extractTextFromParts(parts: unknown[]): string {
  return parts
    .map((part) => (part && typeof part === "object" && "text" in part ? String(part.text) : ""))
    .join(" ")
    .trim();
}

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse(validationError(parsed.error));
  const { scope, conversationId, messages } = parsed.data;

  // 1. Mock mode
  if (isMocked("ai")) {
    const question = lastUserText(messages);
    const reply = mockTutorReply(question, scope);
    const metadata = {
      conversationId: conversationId ?? randomUUID(),
      citations: reply.citations,
      notCovered: reply.notCovered,
    };

    const stream = createUIMessageStream<TutorUIMessage>({
      async execute({ writer }) {
        const textId = randomUUID();
        writer.write({ type: "start", messageMetadata: metadata });
        writer.write({ type: "text-start", id: textId });
        for (const word of reply.text.split(/(\s+)/)) {
          writer.write({ type: "text-delta", id: textId, delta: word });
          await new Promise((resolve) => setTimeout(resolve, 15));
        }
        writer.write({ type: "text-end", id: textId });
        writer.write({ type: "finish", messageMetadata: metadata });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  // 2. Real mode: authentication and scope permission checks
  let student;
  try {
    student = await requireStudent();
  } catch (err) {
    return errorResponse(toErrorPayload(err));
  }

  try {
    if (scope.type === "semester") {
      assertSemesterOpen(student, scope.semesterNumber);
    } else if (scope.type === "subject") {
      const [subj] = await getDb()
        .select({ semesterNumber: semesters.number, branchId: semesters.branchId })
        .from(subjects)
        .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
        .where(eq(subjects.id, scope.subjectId))
        .limit(1);
      if (!subj || subj.branchId !== student.profile.branch.id) {
        return errorResponse({ code: "NOT_FOUND", message: "Subject not found." });
      }
      assertSemesterOpen(student, subj.semesterNumber);
    } else if (scope.type === "unit") {
      const [u] = await getDb()
        .select({ semesterNumber: semesters.number, branchId: semesters.branchId })
        .from(units)
        .innerJoin(subjects, eq(subjects.id, units.subjectId))
        .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
        .where(eq(units.id, scope.unitId))
        .limit(1);
      if (!u || u.branchId !== student.profile.branch.id) {
        return errorResponse({ code: "NOT_FOUND", message: "Unit not found." });
      }
      assertSemesterOpen(student, u.semesterNumber);
    }
  } catch (err) {
    return errorResponse(toErrorPayload(err));
  }

  const question = lastUserText(messages);
  if (!question) {
    return errorResponse({ code: "VALIDATION", message: "Question cannot be empty." });
  }

  // 3. Retrieval over resources + own notes
  let retrieval;
  try {
    retrieval = await retrieveChunks({
      student,
      scope,
      question,
      topK: 6,
    });
  } catch (err) {
    console.error("[nodus] retrieval error:", err);
    return errorResponse(toErrorPayload(mapAiError(err)));
  }

  // 4. Ensure conversation in database
  let conversationRecord;
  try {
    conversationRecord = await ensureConversation(
      conversationId,
      student.user.id,
      question,
      scope,
    );
  } catch (err) {
    console.error("[nodus] ensureConversation error:", err);
    return errorResponse(toErrorPayload(err));
  }

  const actualConversationId = conversationRecord.id;

  // Record user message
  await insertAiMessage({
    conversationId: actualConversationId,
    role: "user",
    content: question,
  }).catch((err) => console.error("[nodus] failed to record user message:", err));

  // 5. Fallback: Not covered in material
  if (retrieval.notCovered) {
    const fallbackText = buildNotCoveredReply(retrieval.suggestion);
    const metadata = {
      conversationId: actualConversationId,
      citations: [],
      notCovered: true,
    };

    const stream = createUIMessageStream<TutorUIMessage>({
      async execute({ writer }) {
        const textId = randomUUID();
        writer.write({ type: "start", messageMetadata: metadata });
        writer.write({ type: "text-start", id: textId });
        writer.write({ type: "text-delta", id: textId, delta: fallbackText });
        writer.write({ type: "text-end", id: textId });
        writer.write({ type: "finish", messageMetadata: metadata });

        await insertAiMessage({
          conversationId: actualConversationId,
          role: "assistant",
          content: fallbackText,
          citations: [],
          notCovered: true,
          topicId: retrieval.bestTopicId,
        }).catch((err) => console.error("[nodus] failed to record assistant message:", err));

        await logActivity({
          studentId: student.user.id,
          type: "ai_question",
          refId: actualConversationId,
        }).catch(() => {});
      },
    });

    return createUIMessageStreamResponse({ stream });
  }

  // 6. Covered: Stream LLM answer with inline citations
  let model;
  try {
    model = getChatModel();
  } catch (err) {
    return errorResponse(toErrorPayload(mapAiError(err)));
  }

  const systemPrompt = buildTutorSystemPrompt(retrieval.chunks);
  const metadata = {
    conversationId: actualConversationId,
    citations: retrieval.citations,
    notCovered: false,
  };

  // Convert previous messages to ModelMessage format
  const chatHistory: ModelMessage[] = messages.slice(-6).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: extractTextFromParts(m.parts as unknown[]),
  }));

  const stream = createUIMessageStream<TutorUIMessage>({
    async execute({ writer }) {
      const textId = randomUUID();
      writer.write({ type: "start", messageMetadata: metadata });
      writer.write({ type: "text-start", id: textId });

      let fullAnswer = "";
      try {
        const result = streamText({
          model,
          system: systemPrompt,
          messages: chatHistory,
        });

        for await (const chunk of result.textStream) {
          fullAnswer += chunk;
          writer.write({ type: "text-delta", id: textId, delta: chunk });
        }

        writer.write({ type: "text-end", id: textId });
        writer.write({ type: "finish", messageMetadata: metadata });

        // Save assistant message to DB
        await insertAiMessage({
          conversationId: actualConversationId,
          role: "assistant",
          content: fullAnswer,
          citations: retrieval.citations,
          notCovered: false,
          topicId: retrieval.bestTopicId,
        });

        // Log ai_question study activity
        await logActivity({
          studentId: student.user.id,
          type: "ai_question",
          refId: actualConversationId,
        });
      } catch (err) {
        console.error("[nodus] AI tutor generation error:", err);
        const mapped = mapAiError(err);
        writer.write({ type: "error", errorText: mapped.message });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}
