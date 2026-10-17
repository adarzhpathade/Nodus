// Analyze Note service with content-hash caching (BE-7.8). Owner: BE.
import "server-only";
import { createHash } from "node:crypto";
import { generateObject } from "ai";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type { NoteAnalysis } from "@/contracts/ai";
import { GatewayError } from "@/contracts/common";
import type { OnboardedStudent } from "@/lib/auth/guards";
import { getChatModel, mapAiError } from "@/lib/ai/config";
import { buildAnalyzeNoteSystemPrompt, buildAnalyzeNoteUserPrompt, type CandidateLink } from "@/lib/ai/prompts";
import { NoteAnalysisGeneratedSchema, type NoteAnalysisGenerated } from "@/lib/ai/schemas";
import { getDb } from "@/lib/db";
import { findCachedNoteAnalysis, upsertNoteAnalysisRecord } from "@/lib/db/queries/ai";
import { findNoteWithLocation } from "@/lib/db/queries/notes";
import { notes, topics, units } from "@/lib/db/schema";

export async function analyzeNoteService(
  student: OnboardedStudent,
  noteId: string,
): Promise<NoteAnalysis> {
  const noteWithLoc = await findNoteWithLocation(noteId, student.user.id);
  if (!noteWithLoc) {
    throw new GatewayError("NOT_FOUND", "Note not found.");
  }

  // 1. Compute content hash (title + contentMd)
  const contentHash = createHash("sha256")
    .update(`${noteWithLoc.note.title}\n${noteWithLoc.note.contentMd}`)
    .digest("hex");

  // 2. Check cache in note_analyses table
  const cachedRow = await findCachedNoteAnalysis(noteId);
  if (cachedRow && cachedRow.contentHash === contentHash) {
    const cachedResult = cachedRow.result as NoteAnalysisGenerated;
    return {
      noteId,
      summary: cachedResult.summary,
      suggestedTitle: cachedResult.suggestedTitle,
      tags: cachedResult.tags,
      todos: cachedResult.todos,
      suggestedLinks: cachedResult.suggestedLinks,
      generatedAt: cachedRow.generatedAt.toISOString(),
      cached: true,
    };
  }

  // 3. Collect candidates for link suggestions
  const db = getDb();

  // Topics in the same unit
  const topicRows = await db
    .select({ id: topics.id, title: topics.title })
    .from(topics)
    .where(eq(topics.unitId, noteWithLoc.location.unitId))
    .limit(10);

  // Other notes owned by this student in the same unit
  const unitTopicIds = topicRows.map((t) => t.id);
  const otherNotes = unitTopicIds.length > 0
    ? await db
        .select({ id: notes.id, title: notes.title })
        .from(notes)
        .where(
          and(
            eq(notes.ownerId, student.user.id),
            ne(notes.id, noteId),
            inArray(notes.topicId, unitTopicIds),
          ),
        )
        .limit(10)
    : [];

  const candidateLinks: CandidateLink[] = [
    ...topicRows.map((t) => ({
      target: { type: "topic" as const, id: t.id },
      title: t.title,
      context: `Topic in ${noteWithLoc.location.unitTitle}`,
    })),
    ...otherNotes.map((n) => ({
      target: { type: "note" as const, id: n.id },
      title: n.title,
      context: "Your other note",
    })),
  ];

  // 4. Generate structured analysis using Gemini
  let model;
  try {
    model = getChatModel();
  } catch (err) {
    throw mapAiError(err);
  }

  let generated: NoteAnalysisGenerated;
  try {
    const result = await generateObject({
      model,
      schema: NoteAnalysisGeneratedSchema,
      system: buildAnalyzeNoteSystemPrompt(),
      prompt: buildAnalyzeNoteUserPrompt({
        title: noteWithLoc.note.title,
        contentMd: noteWithLoc.note.contentMd,
        topicTitle: noteWithLoc.location.topicTitle ?? "Topic",
        unitTitle: noteWithLoc.location.unitTitle,
        candidateLinks,
      }),
    });
    generated = result.object;
  } catch (err) {
    console.error("[nodus] analyze note error:", err);
    throw mapAiError(err);
  }

  // Filter suggestedLinks to only include valid candidate IDs
  const validTargetIds = new Set(candidateLinks.map((c) => `${c.target.type}:${c.target.id}`));
  generated.suggestedLinks = generated.suggestedLinks.filter((link) =>
    validTargetIds.has(`${link.target.type}:${link.target.id}`),
  );

  // 5. Upsert cache in note_analyses
  const saved = await upsertNoteAnalysisRecord(noteId, contentHash, generated);

  return {
    noteId,
    summary: generated.summary,
    suggestedTitle: generated.suggestedTitle,
    tags: generated.tags,
    todos: generated.todos,
    suggestedLinks: generated.suggestedLinks,
    generatedAt: saved.generatedAt.toISOString(),
    cached: false,
  };
}
