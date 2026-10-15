// Quizzes, tutor conversations and cached note analyses. Owner: BE.
import { boolean, index, jsonb, pgTable, primaryKey, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { chatRoleEnum, id, timestamps } from "./_shared";
import { topics, units } from "./curriculum";
import { notes } from "./notes";
import { users } from "./users";

/** Generated quizzes are cached and shared per unit/topic (they come from faculty material, not notes). */
export const quizzes = pgTable(
  "quizzes",
  {
    id: id(),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id").references(() => topics.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** QuizQuestion[] (contracts/ai.ts). */
    questions: jsonb("questions").notNull(),
    /** Hash of the source material — regenerate when it changes. */
    sourceHash: text("source_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("quizzes_unit_topic_idx").on(t.unitId, t.topicId)],
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: id(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 0–100 */
    score: real("score").notNull(),
    /** (number | null)[] — selected option per question. */
    answers: jsonb("answers").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("quiz_attempts_student_idx").on(t.studentId, t.attemptedAt), index("quiz_attempts_quiz_idx").on(t.quizId)],
);

export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: id(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** TutorScope (contracts/ai.ts). */
    scope: jsonb("scope").notNull(),
    ...timestamps,
  },
  (t) => [index("ai_conversations_student_idx").on(t.studentId, t.updatedAt)],
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: id(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    role: chatRoleEnum("role").notNull(),
    content: text("content").notNull(),
    /** Citation[] (contracts/ai.ts). */
    citations: jsonb("citations").notNull().default([]),
    notCovered: boolean("not_covered").notNull().default(false),
    /** Best-matching topic of a student question — powers faculty "most asked topics" (aggregated only). */
    topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_messages_conversation_idx").on(t.conversationId, t.createdAt), index("ai_messages_topic_idx").on(t.topicId)],
);

/** Cached Analyze Note output; recomputed only when the note's content hash changes. */
export const noteAnalyses = pgTable(
  "note_analyses",
  {
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(),
    /** NoteAnalysis without noteId/cached (contracts/ai.ts). */
    result: jsonb("result").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.noteId] })],
);
