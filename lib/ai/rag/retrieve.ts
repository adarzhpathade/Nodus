// Vector retrieval over faculty resources and student's own notes (BE-7.2). Owner: BE.
import "server-only";
import { and, asc, eq, isNotNull, lte, or, sql, type SQL } from "drizzle-orm";
import type { Citation, TutorScope } from "@/contracts/ai";
import type { OnboardedStudent } from "@/lib/auth/guards";
import { getDb } from "@/lib/db";
import {
  noteChunks,
  notes,
  resourceChunks,
  resources,
  semesters,
  subjects,
  topics,
  units,
} from "@/lib/db/schema";
import { NOT_COVERED_DISTANCE_THRESHOLD } from "@/lib/ai/config";
import { generateEmbeddings } from "./embed";

export interface RetrievedChunk {
  ref: string;
  sourceType: "resource" | "note";
  sourceId: string;
  title: string;
  page: number | null;
  locationLabel: string;
  snippet: string;
  distance: number;
  unitId: string;
  topicId: string | null;
}

export interface RetrievalResult {
  citations: Citation[];
  chunks: RetrievedChunk[];
  notCovered: boolean;
  bestTopicId: string | null;
  suggestion: {
    topicId: string;
    topicTitle: string;
    subjectName: string;
    unitTitle: string;
  } | null;
}

export interface RetrieveParams {
  student: OnboardedStudent;
  scope: TutorScope;
  question: string;
  topK?: number;
}

/**
 * Vector search over resource_chunks + the student's note_chunks
 * with strict scope, branch, section, and semester permission filters.
 */
export async function retrieveChunks(params: RetrieveParams): Promise<RetrievalResult> {
  const { student, scope, question, topK = 8 } = params;
  const db = getDb();

  // 1. Generate query embedding (Gemini text-embedding-004)
  const embeddings = await generateEmbeddings([question]).catch((err) => {
    console.warn("[nodus] retrieval embedding failed:", err);
    return null;
  });

  const queryEmbedding = embeddings?.[0] ?? null;

  // Build common scope filters
  const buildScopeCondition = (
    semesterCol: typeof semesters.number,
    subjectCol: typeof subjects.id,
    unitCol: typeof units.id,
  ): SQL => {
    if (scope.type === "semester") {
      return eq(semesterCol, scope.semesterNumber);
    }
    if (scope.type === "subject") {
      return eq(subjectCol, scope.subjectId);
    }
    return eq(unitCol, scope.unitId);
  };

  const retrievedList: RetrievedChunk[] = [];

  if (queryEmbedding && queryEmbedding.length > 0) {
    const vectorLiteral = `[${queryEmbedding.join(",")}]`;
    const resourceDistSql = sql<number>`${resourceChunks.embedding} <=> ${vectorLiteral}::vector`;
    const noteDistSql = sql<number>`${noteChunks.embedding} <=> ${vectorLiteral}::vector`;

    // Query 1: Faculty resource chunks visible to student's section
    const resourceMatches = await db
      .select({
        chunkId: resourceChunks.id,
        content: resourceChunks.content,
        page: resourceChunks.page,
        resourceId: resources.id,
        fileName: resources.fileName,
        resourceType: resources.type,
        unitId: units.id,
        distance: resourceDistSql,
      })
      .from(resourceChunks)
      .innerJoin(resources, eq(resources.id, resourceChunks.resourceId))
      .innerJoin(units, eq(units.id, resources.unitId))
      .innerJoin(subjects, eq(subjects.id, units.subjectId))
      .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
      .where(
        and(
          eq(resources.ingestionStatus, "ready"),
          sql`${student.profile.section} = ANY(${resources.visibleSections})`,
          eq(semesters.branchId, student.profile.branch.id),
          lte(semesters.number, student.profile.currentSemester),
          buildScopeCondition(semesters.number, subjects.id, units.id),
          isNotNull(resourceChunks.embedding),
        ),
      )
      .orderBy(asc(resourceDistSql))
      .limit(topK);

    for (const r of resourceMatches) {
      const isSlide = r.resourceType === "ppt" || r.resourceType === "pptx";
      const locationLabel = r.page
        ? isSlide
          ? `Slide ${r.page}`
          : `Page ${r.page}`
        : "Faculty upload";

      retrievedList.push({
        ref: "",
        sourceType: "resource",
        sourceId: r.resourceId,
        title: r.fileName,
        page: r.page,
        locationLabel,
        snippet: r.content,
        distance: Number(r.distance),
        unitId: r.unitId,
        topicId: null,
      });
    }

    // Query 2: Student's OWN notes only (strictly private)
    const noteMatches = await db
      .select({
        chunkId: noteChunks.id,
        content: noteChunks.content,
        noteId: notes.id,
        noteTitle: notes.title,
        unitId: units.id,
        topicId: topics.id,
        distance: noteDistSql,
      })
      .from(noteChunks)
      .innerJoin(notes, eq(notes.id, noteChunks.noteId))
      .innerJoin(topics, eq(topics.id, notes.topicId))
      .innerJoin(units, eq(units.id, topics.unitId))
      .innerJoin(subjects, eq(subjects.id, units.subjectId))
      .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
      .where(
        and(
          eq(notes.ownerId, student.user.id),
          eq(semesters.branchId, student.profile.branch.id),
          lte(semesters.number, student.profile.currentSemester),
          buildScopeCondition(semesters.number, subjects.id, units.id),
          isNotNull(noteChunks.embedding),
        ),
      )
      .orderBy(asc(noteDistSql))
      .limit(topK);

    for (const n of noteMatches) {
      retrievedList.push({
        ref: "",
        sourceType: "note",
        sourceId: n.noteId,
        title: n.noteTitle,
        page: null,
        locationLabel: "Your note",
        snippet: n.content,
        distance: Number(n.distance),
        unitId: n.unitId,
        topicId: n.topicId,
      });
    }
  }

  // Sort merged chunks by cosine distance (lower is closer/better)
  retrievedList.sort((a, b) => a.distance - b.distance);
  const finalChunks = retrievedList.slice(0, topK);

  // Assign ref IDs: [S1], [S2], ...
  finalChunks.forEach((c, idx) => {
    c.ref = `S${idx + 1}`;
  });

  // Evaluate "not covered" threshold
  const bestDistance = finalChunks.length > 0 ? finalChunks[0].distance : 999;
  const notCovered = finalChunks.length === 0 || bestDistance > NOT_COVERED_DISTANCE_THRESHOLD;

  // Find syllabus suggestion if not covered
  let suggestion: RetrievalResult["suggestion"] = null;
  if (notCovered) {
    suggestion = await findTopicSuggestion(student, question);
  }

  // Determine best matching topicId for analytics
  let bestTopicId: string | null = null;
  if (!notCovered && finalChunks.length > 0) {
    const fromNote = finalChunks.find((c) => c.topicId !== null);
    if (fromNote?.topicId) {
      bestTopicId = fromNote.topicId;
    } else {
      // Pick first topic of the top resource's unit
      const [uTopic] = await db
        .select({ id: topics.id })
        .from(topics)
        .where(eq(topics.unitId, finalChunks[0].unitId))
        .orderBy(asc(topics.order))
        .limit(1);
      bestTopicId = uTopic?.id ?? null;
    }
  } else if (suggestion) {
    bestTopicId = suggestion.topicId;
  }

  const citations: Citation[] = notCovered
    ? []
    : finalChunks.map((c) => ({
        ref: c.ref,
        sourceType: c.sourceType,
        sourceId: c.sourceId,
        title: c.title,
        page: c.page,
        locationLabel: c.locationLabel,
        snippet: c.snippet.length > 200 ? `${c.snippet.slice(0, 197).trimEnd()}…` : c.snippet,
      }));

  return {
    citations,
    chunks: finalChunks,
    notCovered,
    bestTopicId,
    suggestion,
  };
}

/**
 * Searches the student's open syllabus for a topic that matches words from the question.
 */
async function findTopicSuggestion(
  student: OnboardedStudent,
  question: string,
): Promise<RetrievalResult["suggestion"]> {
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  if (words.length === 0) return null;

  const db = getDb();
  const searchConditions = words.map((w) => sql`lower(${topics.title}) ILIKE ${`%${w}%`}`);

  const [row] = await db
    .select({
      topicId: topics.id,
      topicTitle: topics.title,
      unitTitle: units.title,
      subjectName: subjects.name,
    })
    .from(topics)
    .innerJoin(units, eq(units.id, topics.unitId))
    .innerJoin(subjects, eq(subjects.id, units.subjectId))
    .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
    .where(
      and(
        eq(semesters.branchId, student.profile.branch.id),
        lte(semesters.number, student.profile.currentSemester),
        or(...searchConditions)!,
      ),
    )
    .limit(1);

  return row ?? null;
}
