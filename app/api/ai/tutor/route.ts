// POST /api/ai/tutor — streaming, cited tutor answers (AI SDK UI message stream). Owner: BE.
// Body: { messages: TutorUIMessage[], conversationId, scope }  (see contracts/ai.ts)
// Mock mode ("ai" in MOCK_FEATURES): streams the canned reply from mocks/ai-tutor.ts.
// Real mode: implemented in BE-7.3 (RAG over pgvector + Gemini).
import { randomUUID } from "node:crypto";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import { TutorRequestBody, type TutorUIMessage } from "@/contracts/ai";
import { isMocked } from "@/lib/gateway";
import { errorResponse, validationError } from "@/lib/actions/result";
import { mockTutorReply } from "@/mocks/ai-tutor";

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

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse(validationError(parsed.error));
  const { scope, conversationId, messages } = parsed.data;

  if (!isMocked("ai")) {
    return errorResponse({
      code: "NOT_IMPLEMENTED",
      message: 'The real AI tutor is not built yet (BE-7.3). Add "ai" to MOCK_FEATURES.',
    });
  }

  const reply = mockTutorReply(lastUserText(messages), scope);
  const metadata = { conversationId: conversationId ?? randomUUID(), citations: reply.citations, notCovered: reply.notCovered };

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
