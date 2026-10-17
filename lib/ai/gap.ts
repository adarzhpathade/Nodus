// Gap Finder service (BE-7.9). Owner: BE.
import "server-only";
import { generateObject } from "ai";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { GapItem, GapReport, GapReportInput } from "@/contracts/ai";
import { GatewayError } from "@/contracts/common";
import type { OnboardedStudent } from "@/lib/auth/guards";
import { getChatModel, mapAiError } from "@/lib/ai/config";
import { buildGapSystemPrompt, buildGapUserPrompt, type TopicNoteSummary } from "@/lib/ai/prompts";
import { GapReportGeneratedSchema } from "@/lib/ai/schemas";
import { getDb } from "@/lib/db";
import { notes, semesters, subjects, topics, units } from "@/lib/db/schema";

export async function getGapReportService(
  student: OnboardedStudent,
  input: GapReportInput,
): Promise<GapReport> {
  const db = getDb();

  // 1. Verify unit location and permissions
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

  // 2. Fetch all topics in this unit
  const unitTopics = await db
    .select({ id: topics.id, title: topics.title, order: topics.order })
    .from(topics)
    .where(eq(topics.unitId, input.unitId))
    .orderBy(asc(topics.order));

  if (unitTopics.length === 0) {
    return {
      unitId: input.unitId,
      missing: [],
      weak: [],
      coveredCount: 0,
      totalTopics: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  // 3. Fetch student's notes for topics in this unit
  const topicIds = unitTopics.map((t) => t.id);
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

  // 4. Topic coverage calculation
  // TODO(BE-6): Replace simple "topic has >=1 note" check with the real progress coverage engine from lib/progress once BE-6 is implemented.
  const summaries: TopicNoteSummary[] = unitTopics.map((t) => {
    const tNotes = notesByTopic.get(t.id) ?? [];
    return {
      topicId: t.id,
      topicTitle: t.title,
      notesCount: tNotes.length,
      noteTitles: tNotes.map((n) => n.title),
      noteExcerpts: tNotes.map((n) => n.contentMd.slice(0, 200)),
    };
  });

  const missingTopics = summaries.filter((t) => t.notesCount === 0);
  // Shallow notes (< 150 chars total) are marked weak
  const weakTopics = summaries.filter((t) => {
    if (t.notesCount === 0) return false;
    const totalChars = t.noteExcerpts.reduce((acc, text) => acc + text.length, 0);
    return totalChars < 150;
  });

  const coveredCount = unitTopics.length - missingTopics.length;

  // 5. Generate AI explanations for missing/weak topics if needed
  let missingItems: GapItem[] = missingTopics.map((t) => ({
    topicId: t.topicId,
    title: t.topicTitle,
    reason: "No notes written yet. Study this topic and write a summary to mark it covered.",
  }));

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
          unitTitle: unitRow.unitTitle,
          topics: summaries,
        }),
      });

      if (object.missing && object.missing.length > 0) {
        const aiMap = new Map(object.missing.map((m) => [m.topicId, m.reason]));
        missingItems = missingTopics.map((t) => ({
          topicId: t.topicId,
          title: t.topicTitle,
          reason: aiMap.get(t.topicId) ?? "No notes written yet for this syllabus topic.",
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
    totalTopics: unitTopics.length,
    generatedAt: new Date().toISOString(),
  };
}
