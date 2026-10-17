// Zod schemas for AI structured outputs (AGENTS.md §10.1). Owner: BE.
import { z } from "zod";
import { LinkTarget } from "@/contracts/notes";

export const QuizGeneratedQuestionSchema = z.object({
  question: z.string().describe("The multiple choice question text"),
  options: z.array(z.string()).length(4).describe("Exactly 4 distinct answer choices"),
  correctIndex: z
    .number()
    .int()
    .min(0)
    .max(3)
    .describe("0-based index of the correct option (0, 1, 2, or 3)"),
  explanation: z
    .string()
    .describe("Clear explanation of why the correct option is right and others are wrong"),
  topicId: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .describe("Associated topic ID if specific to one topic, or null"),
});

export const QuizGeneratedSchema = z.object({
  title: z.string().describe("A concise descriptive title for this practice quiz"),
  questions: z
    .array(QuizGeneratedQuestionSchema)
    .min(1)
    .max(10)
    .describe("List of generated practice quiz questions"),
});

export type QuizGenerated = z.infer<typeof QuizGeneratedSchema>;

export const NoteAnalysisGeneratedSchema = z.object({
  summary: z.string().describe("A concise 2-3 sentence summary of the note's core concepts"),
  suggestedTitle: z.string().describe("An improved, specific title for the note"),
  tags: z.array(z.string()).describe("3-6 relevant lowercase concept tags"),
  todos: z.array(z.string()).describe("List of follow-up study tasks or questions"),
  suggestedLinks: z.array(
    z.object({
      target: LinkTarget,
      title: z.string().describe("Title of the target entity"),
      reason: z.string().describe("Brief reason why this link is relevant"),
    }),
  ).describe("Suggested links to relevant topics, units, or existing notes"),
});

export type NoteAnalysisGenerated = z.infer<typeof NoteAnalysisGeneratedSchema>;

export const GapItemSchema = z.object({
  topicId: z.string().uuid().describe("Topic UUID"),
  title: z.string().describe("Topic title"),
  reason: z.string().describe("Brief explanation of why this topic is missing or weakly covered"),
});

export const GapReportGeneratedSchema = z.object({
  missing: z.array(GapItemSchema).describe("Topics completely missing notes or coverage"),
  weak: z.array(GapItemSchema).describe("Topics with only sparse or incomplete coverage"),
});

export type GapReportGenerated = z.infer<typeof GapReportGeneratedSchema>;
