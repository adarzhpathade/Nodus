// Gap Finder service (BE-7.9). Owner: BE.
import "server-only";
import { generateObject } from "ai";
import { and, eq, inArray } from "drizzle-orm";
import type { GapItem, GapReport, GapReportInput } from "@/contracts/ai";
import { GatewayError } from "@/contracts/common";
import type { OnboardedStudent } from "@/lib/auth/guards";
import { getChatModel } from "@/lib/ai/config";
import { buildGapSystemPrompt, buildGapUserPrompt, type TopicNoteSummary } from "@/lib/ai/prompts";
import { GapReportGeneratedSchema } from "@/lib/ai/schemas";
import { getDb } from "@/lib/db";
import { getStudentUnitProgressRawData } from "@/lib/db/queries/progress";
import { notes } from "@/lib/db/schema";
import { calculateUnitProgress } from "@/lib/progress";

export async function getGapReportService(
  student: OnboardedStudent,
  input: GapReportInput,
): Promise<GapReport> {
  const db = getDb();

  // 1. Fetch raw progress and curriculum data for this student and unit
  const raw = await getStudentUnitProgressRawData(student.user.id, input.unitId);
  if (!raw || raw.subject.branchId !== student.profile.branch.id) {
    throw new GatewayError("NOT_FOUND", "Unit not found.");
  }
  if (raw.subject.semesterNumber > student.profile.currentSemester) {
    throw new GatewayError("LOCKED", `Semester ${raw.subject.semesterNumber} is locked.`);
  }

  if (raw.topics.length === 0) {
    return {
      unitId: input.unitId,
      missing: [],
      weak: [],
      coveredCount: 0,
      totalTopics: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  // 2. Real unit progress calculation (including quiz scores & notes rule from lib/progress)
  const unitProgress = calculateUnitProgress({
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

  const progressByTopic = new Map(unitProgress.topics.map((tp) => [tp.topicId, tp]));

  // 3. Fetch student's notes for topics in this unit (for content summaries and depth check)
  const topicIds = raw.topics.map((t) => t.id);
  const studentNotes = await db
    .select({
      id: notes.id,
      topicId: notes.topicId,
      title: notes.title,
      contentMd: notes.contentMd,
    })
    .from(notes)
    .where(and(eq(notes.ownerId, student.user.id), inArray(notes.topicId, topicIds)));

  // Map notes per topic
  const notesByTopic = new Map<string, typeof studentNotes>();
  for (const n of studentNotes) {
    const list = notesByTopic.get(n.topicId) ?? [];
    list.push(n);
    notesByTopic.set(n.topicId, list);
  }

  // 4. Build summaries for AI prompt
  const summaries: TopicNoteSummary[] = raw.topics.map((t) => {
    const tNotes = notesByTopic.get(t.id) ?? [];
    return {
      topicId: t.id,
      topicTitle: t.title,
      notesCount: tNotes.length,
      noteTitles: tNotes.map((n) => n.title),
      noteExcerpts: tNotes.map((n) => n.contentMd.slice(0, 200)),
    };
  });

  // Decide covered/missing per topic from calculateUnitProgress(...).topics[].covered
  const missingTopics = summaries.filter((t) => {
    const tp = progressByTopic.get(t.topicId);
    return !tp?.covered;
  });

  // Weak topics: covered topics whose notes are shallow (< 150 chars total)
  const weakTopics = summaries.filter((t) => {
    const tp = progressByTopic.get(t.topicId);
    if (!tp?.covered) return false;
    const totalChars = t.noteExcerpts.reduce((acc, text) => acc + text.length, 0);
    return totalChars < 150;
  });

  const coveredCount = unitProgress.coveredTopics;

  // 5. Generate AI explanations for missing/weak topics if needed
  let missingItems: GapItem[] = missingTopics.map((t) => {
    const tp = progressByTopic.get(t.topicId);
    let reason = "No notes written yet. Study this topic and write a summary to mark it covered.";
    if (tp && tp.noteCount > 0 && tp.bestQuizScore !== null && tp.bestQuizScore < 50) {
      reason = `Quiz score is ${tp.bestQuizScore}%. Retake the practice quiz with at least 50% to mark this topic covered.`;
    }
    return {
      topicId: t.topicId,
      title: t.topicTitle,
      reason,
    };
  });

  let weakItems: GapItem[] = weakTopics.map((t) => ({
    topicId: t.topicId,
    title: t.topicTitle,
    reason: "Notes are brief. Add definitions, examples, or code snippets to strengthen your understanding.",
  }));

  // Attempt AI enhancement if we have gaps and AI is available
  if (missingTopics.length > 0 || weakTopics.length > 0) {
    try {
      const model = getChatModel();
      const { object } = await generateObject({
        model,
        schema: GapReportGeneratedSchema,
        system: buildGapSystemPrompt(),
        prompt: buildGapUserPrompt({
          unitTitle: raw.unit.title,
          topics: summaries,
        }),
      });

      if (object.missing && object.missing.length > 0) {
        const aiMap = new Map(object.missing.map((m) => [m.topicId, m.reason]));
        missingItems = missingTopics.map((t) => ({
          topicId: t.topicId,
          title: t.topicTitle,
          reason:
            aiMap.get(t.topicId) ??
            missingItems.find((m) => m.topicId === t.topicId)?.reason ??
            "Not yet covered in your studies.",
        }));
      }

      if (object.weak && object.weak.length > 0) {
        const aiMap = new Map(object.weak.map((w) => [w.topicId, w.reason]));
        weakItems = weakTopics.map((t) => ({
          topicId: t.topicId,
          title: t.topicTitle,
          reason: aiMap.get(t.topicId) ?? "Notes are brief and could benefit from further detail.",
        }));
      }
    } catch {
      // Degrade gracefully to the default deterministic reasons above
    }
  }

  return {
    unitId: input.unitId,
    missing: missingItems,
    weak: weakItems,
    coveredCount,
    totalTopics: unitProgress.totalTopics,
    generatedAt: new Date().toISOString(),
  };
}
