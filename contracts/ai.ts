// C-07 — AI: tutor, practice quizzes, Analyze Note, Gap Finder. Owner: BE (FE reviews).
//
// The tutor STREAMS through the route `POST /api/ai/tutor` (AI SDK UI message stream, use `useChat`).
// Everything else is a normal gateway method / server action.
// All answers are grounded ONLY in faculty material for the viewer's sections + the viewer's own notes.
import type { UIMessage } from "ai";
import { z } from "zod";
import { Id, Percent, SemesterNumber, Timestamp } from "./common";
import { LinkTarget } from "./notes";
import { UnitProgress } from "./progress";

// ---------- Citations ----------

export const Citation = z.object({
  /** Short id used inside the answer text, e.g. "S1". */
  ref: z.string(),
  sourceType: z.enum(["resource", "note"]),
  /** resourceId or noteId */
  sourceId: Id,
  title: z.string(),
  /** 1-based page (PDF) or slide (PPT); null for notes. */
  page: z.number().int().positive().nullable(),
  /** Human label, e.g. "Slide 12" or "Your note". */
  locationLabel: z.string(),
  snippet: z.string(),
});
export type Citation = z.infer<typeof Citation>;

// ---------- Tutor ----------

export const TutorScope = z.discriminatedUnion("type", [
  z.object({ type: z.literal("semester"), semesterNumber: SemesterNumber }),
  z.object({ type: z.literal("subject"), subjectId: Id }),
  z.object({ type: z.literal("unit"), unitId: Id }),
]);
export type TutorScope = z.infer<typeof TutorScope>;

/**
 * Metadata attached to every assistant message in the tutor stream
 * (AI SDK `message.metadata`). FE: `useChat<TutorUIMessage>()`.
 */
export const TutorMessageMetadata = z.object({
  conversationId: Id,
  citations: z.array(Citation),
  /** True when the material doesn't cover the question; the text then says so and suggests where to look. */
  notCovered: z.boolean(),
});
export type TutorMessageMetadata = z.infer<typeof TutorMessageMetadata>;

/** Message type for `useChat<TutorUIMessage>()`. */
export type TutorUIMessage = UIMessage<TutorMessageMetadata>;

/**
 * Extra fields FE sends in the `useChat` request body (alongside `messages`), e.g.
 * `sendMessage({ text }, { body: { conversationId, scope } })`.
 */
export const TutorRequestBody = z.object({
  /** null starts a new conversation; the id comes back in message metadata. */
  conversationId: Id.nullable(),
  scope: TutorScope,
});
export type TutorRequestBody = z.infer<typeof TutorRequestBody>;

export const TUTOR_ROUTE = "/api/ai/tutor";

export const ChatMessage = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  citations: z.array(Citation),
  notCovered: z.boolean(),
  createdAt: Timestamp,
});
export type ChatMessage = z.infer<typeof ChatMessage>;

export const Conversation = z.object({
  id: Id,
  title: z.string(),
  scope: TutorScope,
  createdAt: Timestamp,
  updatedAt: Timestamp,
});
export type Conversation = z.infer<typeof Conversation>;

export const ConversationDetail = z.object({
  conversation: Conversation,
  messages: z.array(ChatMessage),
});
export type ConversationDetail = z.infer<typeof ConversationDetail>;

export const ConversationIdInput = z.object({ conversationId: Id });
export type ConversationIdInput = z.infer<typeof ConversationIdInput>;

// ---------- Practice quiz ----------

export const QuizQuestion = z.object({
  id: z.string(),
  topicId: Id.nullable(),
  question: z.string(),
  options: z.array(z.string()).length(4),
  /** Sent to the client on purpose: practice gives instant feedback. */
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
});
export type QuizQuestion = z.infer<typeof QuizQuestion>;

export const Quiz = z.object({
  id: Id,
  unitId: Id,
  topicId: Id.nullable(),
  title: z.string(),
  questions: z.array(QuizQuestion).min(1),
  createdAt: Timestamp,
});
export type Quiz = z.infer<typeof Quiz>;

export const GenerateQuizInput = z.object({
  unitId: Id,
  /** Limit to one topic; omit for the whole unit. */
  topicId: Id.optional(),
  questionCount: z.number().int().min(3).max(10).default(5),
  /** true = always generate a fresh quiz instead of reusing a cached one. */
  fresh: z.boolean().default(false),
});
export type GenerateQuizInput = z.input<typeof GenerateQuizInput>;

export const SubmitQuizInput = z.object({
  quizId: Id,
  /** One entry per question, in order; null = skipped. */
  answers: z.array(z.number().int().min(0).max(3).nullable()).min(1),
});
export type SubmitQuizInput = z.infer<typeof SubmitQuizInput>;

export const QuizAttemptResult = z.object({
  attemptId: Id,
  quizId: Id,
  score: Percent,
  correctCount: z.number().int(),
  total: z.number().int(),
  perQuestion: z.array(z.object({ questionId: z.string(), selectedIndex: z.number().int().nullable(), correct: z.boolean() })),
  /** Unit progress after this attempt — lets the UI animate the change. */
  unitProgress: UnitProgress,
});
export type QuizAttemptResult = z.infer<typeof QuizAttemptResult>;

export const QuizAttemptSummary = z.object({
  id: Id,
  quizId: Id,
  quizTitle: z.string(),
  unitId: Id,
  unitTitle: z.string(),
  subjectName: z.string(),
  score: Percent,
  attemptedAt: Timestamp,
});
export type QuizAttemptSummary = z.infer<typeof QuizAttemptSummary>;

export const ListQuizAttemptsQuery = z.object({
  semesterNumber: SemesterNumber.optional(),
  unitId: Id.optional(),
  limit: z.number().int().min(1).max(100).default(20),
});
export type ListQuizAttemptsQuery = z.input<typeof ListQuizAttemptsQuery>;

// ---------- Analyze Note ----------

export const NoteAnalysis = z.object({
  noteId: Id,
  summary: z.string(),
  suggestedTitle: z.string(),
  tags: z.array(z.string()),
  todos: z.array(z.string()),
  suggestedLinks: z.array(z.object({ target: LinkTarget, title: z.string(), reason: z.string() })),
  generatedAt: Timestamp,
  /** true when served from cache (note unchanged since last analysis). */
  cached: z.boolean(),
});
export type NoteAnalysis = z.infer<typeof NoteAnalysis>;

export const AnalyzeNoteInput = z.object({ noteId: Id });
export type AnalyzeNoteInput = z.infer<typeof AnalyzeNoteInput>;

// ---------- Gap Finder ----------

export const GapItem = z.object({ topicId: Id, title: z.string(), reason: z.string() });
export type GapItem = z.infer<typeof GapItem>;

export const GapReport = z.object({
  unitId: Id,
  missing: z.array(GapItem),
  weak: z.array(GapItem),
  coveredCount: z.number().int(),
  totalTopics: z.number().int(),
  generatedAt: Timestamp,
});
export type GapReport = z.infer<typeof GapReport>;

export const GapReportInput = z.object({ unitId: Id });
export type GapReportInput = z.infer<typeof GapReportInput>;

export interface AiApi {
  listConversations(): Promise<Conversation[]>;
  getConversation(conversationId: string): Promise<ConversationDetail>;
  deleteConversation(input: ConversationIdInput): Promise<void>;

  /** Reuses a cached quiz for the same unit/topic unless `fresh`. May throw RATE_LIMITED / AI_UNAVAILABLE. */
  generateQuiz(input: GenerateQuizInput): Promise<Quiz>;
  getQuiz(quizId: string): Promise<Quiz>;
  submitQuizAttempt(input: SubmitQuizInput): Promise<QuizAttemptResult>;
  listQuizAttempts(query: ListQuizAttemptsQuery): Promise<QuizAttemptSummary[]>;

  /** Cached by note content hash. */
  analyzeNote(input: AnalyzeNoteInput): Promise<NoteAnalysis>;
  getGapReport(input: GapReportInput): Promise<GapReport>;
}
