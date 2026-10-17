// Note queries (notes CRUD, links, backlinks, tags, search). Owner: BE.
import "server-only";
import { and, asc, desc, eq, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  noteChunks,
  noteLinks,
  notes,
  semesters,
  subjects,
  topics,
  units,
} from "@/lib/db/schema";
import { waitUntil } from "@vercel/functions";
import { chunkText } from "@/lib/ai/rag/chunk";
import { generateEmbeddings } from "@/lib/ai/rag/embed";
import type { SyllabusLocation } from "@/contracts/common";

export type NoteRecord = typeof notes.$inferSelect;
export type NoteLinkRecord = typeof noteLinks.$inferSelect;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface NoteWithLocation {
  note: NoteRecord;
  location: SyllabusLocation & { branchId: string };
}

export interface TopicLocationRecord {
  topic: {
    id: string;
    unitId: string;
    title: string;
    order: number;
  };
  unit: {
    id: string;
    subjectId: string;
    title: string;
    order: number;
  };
  subject: {
    id: string;
    name: string;
    code: string;
    order: number;
    semesterId: string;
  };
  semester: {
    id: string;
    number: number;
    branchId: string;
  };
}

export interface UnitLocationRecord {
  unit: {
    id: string;
    subjectId: string;
    title: string;
    order: number;
  };
  subject: {
    id: string;
    name: string;
    code: string;
    order: number;
    semesterId: string;
  };
  semester: {
    id: string;
    number: number;
    branchId: string;
  };
}

const locationSelection = {
  topicId: topics.id,
  topicTitle: topics.title,
  unitId: units.id,
  unitTitle: units.title,
  subjectId: subjects.id,
  subjectName: subjects.name,
  semesterNumber: semesters.number,
  branchId: semesters.branchId,
};

/** Finds the topic with its unit, subject and semester hierarchy. */
export async function findTopicLocation(topicId: string): Promise<TopicLocationRecord | null> {
  if (!UUID_RE.test(topicId)) return null;
  const [row] = await getDb()
    .select({
      topic: {
        id: topics.id,
        unitId: topics.unitId,
        title: topics.title,
        order: topics.order,
      },
      unit: {
        id: units.id,
        subjectId: units.subjectId,
        title: units.title,
        order: units.order,
      },
      subject: {
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        order: subjects.order,
        semesterId: subjects.semesterId,
      },
      semester: {
        id: semesters.id,
        number: semesters.number,
        branchId: semesters.branchId,
      },
    })
    .from(topics)
    .innerJoin(units, eq(units.id, topics.unitId))
    .innerJoin(subjects, eq(subjects.id, units.subjectId))
    .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
    .where(eq(topics.id, topicId))
    .limit(1);

  return row ?? null;
}

/** Finds the unit with its subject and semester hierarchy. */
export async function findUnitLocation(unitId: string): Promise<UnitLocationRecord | null> {
  if (!UUID_RE.test(unitId)) return null;
  const [row] = await getDb()
    .select({
      unit: {
        id: units.id,
        subjectId: units.subjectId,
        title: units.title,
        order: units.order,
      },
      subject: {
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        order: subjects.order,
        semesterId: subjects.semesterId,
      },
      semester: {
        id: semesters.id,
        number: semesters.number,
        branchId: semesters.branchId,
      },
    })
    .from(units)
    .innerJoin(subjects, eq(subjects.id, units.subjectId))
    .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
    .where(eq(units.id, unitId))
    .limit(1);

  return row ?? null;
}

/** Finds a single note belonging to ownerId with full syllabus location. */
export async function findNoteWithLocation(
  noteId: string,
  ownerId: string,
): Promise<NoteWithLocation | null> {
  if (!UUID_RE.test(noteId) || !UUID_RE.test(ownerId)) return null;
  const [row] = await getDb()
    .select({
      note: notes,
      loc: locationSelection,
    })
    .from(notes)
    .innerJoin(topics, eq(topics.id, notes.topicId))
    .innerJoin(units, eq(units.id, topics.unitId))
    .innerJoin(subjects, eq(subjects.id, units.subjectId))
    .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
    .where(and(eq(notes.id, noteId), eq(notes.ownerId, ownerId)))
    .limit(1);

  if (!row) return null;

  return {
    note: row.note,
    location: {
      semesterNumber: row.loc.semesterNumber,
      subjectId: row.loc.subjectId,
      subjectName: row.loc.subjectName,
      unitId: row.loc.unitId,
      unitTitle: row.loc.unitTitle,
      topicId: row.loc.topicId,
      topicTitle: row.loc.topicTitle,
      branchId: row.loc.branchId,
    },
  };
}

export interface InsertNoteInput {
  ownerId: string;
  topicId: string;
  title: string;
  contentMd?: string;
  contentJson?: unknown;
  tags?: string[];
}

export async function insertNote(data: InsertNoteInput): Promise<NoteRecord> {
  const [created] = await getDb()
    .insert(notes)
    .values({
      ownerId: data.ownerId,
      topicId: data.topicId,
      title: data.title,
      contentMd: data.contentMd ?? "",
      contentJson: data.contentJson ?? null,
      tags: data.tags ?? [],
    })
    .returning();

  if (created && created.contentMd && created.contentMd.trim()) {
    try {
      waitUntil(rechunkAndEmbedNote(created.id, created.contentMd));
    } catch {
      rechunkAndEmbedNote(created.id, created.contentMd).catch(() => {});
    }
  }

  return created;
}

export interface UpdateNoteFields {
  title?: string;
  contentMd?: string;
  contentJson?: unknown;
  tags?: string[];
  topicId?: string;
}

export async function updateNoteRecord(
  noteId: string,
  ownerId: string,
  fields: UpdateNoteFields,
): Promise<NoteRecord | null> {
  if (!UUID_RE.test(noteId) || !UUID_RE.test(ownerId)) return null;

  const valuesToSet: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (fields.title !== undefined) valuesToSet.title = fields.title;
  if (fields.contentMd !== undefined) valuesToSet.contentMd = fields.contentMd;
  if (fields.contentJson !== undefined) valuesToSet.contentJson = fields.contentJson;
  if (fields.tags !== undefined) valuesToSet.tags = fields.tags;
  if (fields.topicId !== undefined) valuesToSet.topicId = fields.topicId;

  const [updated] = await getDb()
    .update(notes)
    .set(valuesToSet)
    .where(and(eq(notes.id, noteId), eq(notes.ownerId, ownerId)))
    .returning();

  if (updated && fields.contentMd !== undefined) {
    try {
      waitUntil(rechunkAndEmbedNote(updated.id, fields.contentMd));
    } catch {
      rechunkAndEmbedNote(updated.id, fields.contentMd).catch(() => {});
    }
  }

  return updated ?? null;
}

export async function deleteNoteRecord(noteId: string, ownerId: string): Promise<boolean> {
  if (!UUID_RE.test(noteId) || !UUID_RE.test(ownerId)) return false;

  const db = getDb();
  // Remove any incoming note_links pointing to this note as target
  await db
    .delete(noteLinks)
    .where(and(eq(noteLinks.toType, "note"), eq(noteLinks.toId, noteId)));

  const result = await db
    .delete(notes)
    .where(and(eq(notes.id, noteId), eq(notes.ownerId, ownerId)))
    .returning({ id: notes.id });

  return result.length > 0;
}

export interface ListNotesFilter {
  ownerId: string;
  branchId: string;
  semesterNumber?: number;
  maxSemesterNumber?: number;
  subjectId?: string;
  unitId?: string;
  topicId?: string;
  tag?: string;
  search?: string;
  sort?: "updated" | "created" | "title";
  limit: number;
  offset: number;
}

export async function listNotesWithLocation(
  filters: ListNotesFilter,
): Promise<NoteWithLocation[]> {
  const conditions = [
    eq(notes.ownerId, filters.ownerId),
    eq(semesters.branchId, filters.branchId),
  ];

  if (filters.semesterNumber !== undefined) {
    conditions.push(eq(semesters.number, filters.semesterNumber));
  } else if (filters.maxSemesterNumber !== undefined) {
    conditions.push(lte(semesters.number, filters.maxSemesterNumber));
  }
  if (filters.subjectId !== undefined) {
    conditions.push(eq(subjects.id, filters.subjectId));
  }
  if (filters.unitId !== undefined) {
    conditions.push(eq(units.id, filters.unitId));
  }
  if (filters.topicId !== undefined) {
    conditions.push(eq(notes.topicId, filters.topicId));
  }
  if (filters.tag !== undefined && filters.tag.trim().length > 0) {
    const cleanTag = filters.tag.trim().toLowerCase();
    conditions.push(sql`${cleanTag} = ANY(${notes.tags})`);
  }
  if (filters.search !== undefined && filters.search.trim().length > 0) {
    const cleanSearch = filters.search.trim();
    conditions.push(
      or(
        sql`${notes.searchVector} @@ plainto_tsquery('english', ${cleanSearch})`,
        ilike(notes.title, `%${cleanSearch}%`),
        ilike(notes.contentMd, `%${cleanSearch}%`),
      )!,
    );
  }

  let orderClause = desc(notes.updatedAt);
  if (filters.sort === "title") {
    orderClause = asc(notes.title);
  } else if (filters.sort === "created") {
    orderClause = desc(notes.createdAt);
  }

  const rows = await getDb()
    .select({
      note: notes,
      loc: locationSelection,
    })
    .from(notes)
    .innerJoin(topics, eq(topics.id, notes.topicId))
    .innerJoin(units, eq(units.id, topics.unitId))
    .innerJoin(subjects, eq(subjects.id, units.subjectId))
    .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
    .where(and(...conditions))
    .orderBy(orderClause)
    .limit(filters.limit)
    .offset(filters.offset);

  return rows.map((r) => ({
    note: r.note,
    location: {
      semesterNumber: r.loc.semesterNumber,
      subjectId: r.loc.subjectId,
      subjectName: r.loc.subjectName,
      unitId: r.loc.unitId,
      unitTitle: r.loc.unitTitle,
      topicId: r.loc.topicId,
      topicTitle: r.loc.topicTitle,
      branchId: r.loc.branchId,
    },
  }));
}

/** Lists all outgoing links originating from a note. */
export async function listLinksForNote(noteId: string): Promise<NoteLinkRecord[]> {
  if (!UUID_RE.test(noteId)) return [];
  return getDb()
    .select()
    .from(noteLinks)
    .where(eq(noteLinks.fromNoteId, noteId))
    .orderBy(asc(noteLinks.createdAt));
}

/** Lists all incoming backlinks pointing to noteId from notes owned by ownerId. */
export async function listBacklinksForNote(
  noteId: string,
  ownerId: string,
  maxSemesterNumber?: number,
): Promise<{ fromNote: NoteRecord; loc: NoteWithLocation["location"] }[]> {
  if (!UUID_RE.test(noteId) || !UUID_RE.test(ownerId)) return [];

  const conditions = [
    eq(noteLinks.toType, "note"),
    eq(noteLinks.toId, noteId),
    eq(notes.ownerId, ownerId),
  ];
  if (maxSemesterNumber !== undefined) {
    conditions.push(lte(semesters.number, maxSemesterNumber));
  }

  return getDb()
    .select({
      fromNote: notes,
      loc: locationSelection,
    })
    .from(noteLinks)
    .innerJoin(notes, eq(notes.id, noteLinks.fromNoteId))
    .innerJoin(topics, eq(topics.id, notes.topicId))
    .innerJoin(units, eq(units.id, topics.unitId))
    .innerJoin(subjects, eq(subjects.id, units.subjectId))
    .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
    .where(and(...conditions))
    .orderBy(desc(notes.updatedAt));
}

/** Batch resolves titles for link targets. */
export async function resolveTargetTitles(
  targets: { type: "note" | "topic" | "unit"; id: string }[],
  ownerId: string,
): Promise<Map<string, string>> {
  const titleMap = new Map<string, string>();
  if (targets.length === 0) return titleMap;

  const noteIds = targets.filter((t) => t.type === "note" && UUID_RE.test(t.id)).map((t) => t.id);
  const topicIds = targets.filter((t) => t.type === "topic" && UUID_RE.test(t.id)).map((t) => t.id);
  const unitIds = targets.filter((t) => t.type === "unit" && UUID_RE.test(t.id)).map((t) => t.id);

  const db = getDb();
  const promises: Promise<void>[] = [];

  if (noteIds.length > 0) {
    promises.push(
      db
        .select({ id: notes.id, title: notes.title })
        .from(notes)
        .where(and(inArray(notes.id, noteIds), eq(notes.ownerId, ownerId)))
        .then((rows) => {
          for (const r of rows) titleMap.set(`note:${r.id}`, r.title);
        }),
    );
  }

  if (topicIds.length > 0) {
    promises.push(
      db
        .select({ id: topics.id, title: topics.title })
        .from(topics)
        .where(inArray(topics.id, topicIds))
        .then((rows) => {
          for (const r of rows) titleMap.set(`topic:${r.id}`, r.title);
        }),
    );
  }

  if (unitIds.length > 0) {
    promises.push(
      db
        .select({ id: units.id, title: units.title })
        .from(units)
        .where(inArray(units.id, unitIds))
        .then((rows) => {
          for (const r of rows) titleMap.set(`unit:${r.id}`, r.title);
        }),
    );
  }

  await Promise.all(promises);
  return titleMap;
}

/** Inserts a new note link. Safe against duplicates via unique constraint. */
export async function insertNoteLink(
  fromNoteId: string,
  toType: "note" | "topic" | "unit",
  toId: string,
): Promise<NoteLinkRecord> {
  if (!UUID_RE.test(fromNoteId) || !UUID_RE.test(toId)) {
    throw new Error("Invalid UUID for note link");
  }

  const [created] = await getDb()
    .insert(noteLinks)
    .values({
      fromNoteId,
      toType,
      toId,
    })
    .onConflictDoNothing({
      target: [noteLinks.fromNoteId, noteLinks.toType, noteLinks.toId],
    })
    .returning();

  if (created) return created;

  const [existing] = await getDb()
    .select()
    .from(noteLinks)
    .where(
      and(
        eq(noteLinks.fromNoteId, fromNoteId),
        eq(noteLinks.toType, toType),
        eq(noteLinks.toId, toId),
      ),
    )
    .limit(1);

  return existing!;
}

/** Deletes a note link by link ID. */
export async function deleteNoteLink(linkId: string): Promise<boolean> {
  if (!UUID_RE.test(linkId)) return false;
  const result = await getDb()
    .delete(noteLinks)
    .where(eq(noteLinks.id, linkId))
    .returning({ id: noteLinks.id });
  return result.length > 0;
}

/** Finds a link by ID along with its fromNote ownerId to verify permissions. */
export async function findLinkWithOwner(
  linkId: string,
): Promise<{ link: NoteLinkRecord; ownerId: string } | null> {
  if (!UUID_RE.test(linkId)) return null;
  const [row] = await getDb()
    .select({
      link: noteLinks,
      ownerId: notes.ownerId,
    })
    .from(noteLinks)
    .innerJoin(notes, eq(notes.id, noteLinks.fromNoteId))
    .where(eq(noteLinks.id, linkId))
    .limit(1);

  return row ?? null;
}

/** Syncs outgoing links for a note based on parsed href targets. */
export async function syncNoteLinks(
  noteId: string,
  validTargets: { type: "note" | "topic" | "unit"; id: string }[],
): Promise<void> {
  if (!UUID_RE.test(noteId)) return;
  const db = getDb();
  const existingLinks = await db
    .select()
    .from(noteLinks)
    .where(eq(noteLinks.fromNoteId, noteId));

  const validKeySet = new Set(validTargets.map((t) => `${t.type}:${t.id}`));
  const existingKeyMap = new Map(existingLinks.map((l) => [`${l.toType}:${l.toId}`, l]));

  // 1. Delete removed links
  const toDeleteIds: string[] = [];
  for (const [key, link] of existingKeyMap) {
    if (!validKeySet.has(key)) {
      toDeleteIds.push(link.id);
    }
  }

  if (toDeleteIds.length > 0) {
    await db.delete(noteLinks).where(inArray(noteLinks.id, toDeleteIds));
  }

  // 2. Insert new links
  const toInsert = validTargets.filter(
    (t) => UUID_RE.test(t.id) && !existingKeyMap.has(`${t.type}:${t.id}`),
  );
  for (const t of toInsert) {
    await db
      .insert(noteLinks)
      .values({
        fromNoteId: noteId,
        toType: t.type,
        toId: t.id,
      })
      .onConflictDoNothing({
        target: [noteLinks.fromNoteId, noteLinks.toType, noteLinks.toId],
      });
  }
}

/** Lists unique tags and their usage count for a student's notes. */
export async function listTagsForOwner(
  ownerId: string,
): Promise<{ tag: string; count: number }[]> {
  if (!UUID_RE.test(ownerId)) return [];
  const rows = await getDb()
    .select({
      tag: sql<string>`unnest(${notes.tags})`.as("tag"),
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(notes)
    .where(and(eq(notes.ownerId, ownerId), sql`${notes.tags} != '{}'::text[]`))
    .groupBy(sql`1`)
    .orderBy(desc(sql`2`), asc(sql`1`));

  return rows;
}

/** Counts notes written by owner for a specific topic. */
export async function countOwnerNotesInTopic(
  topicId: string,
  ownerId: string,
): Promise<number> {
  if (!UUID_RE.test(topicId) || !UUID_RE.test(ownerId)) return 0;
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(notes)
    .where(and(eq(notes.topicId, topicId), eq(notes.ownerId, ownerId)));

  return row?.count ? Number(row.count) : 0;
}

/**
 * Re-chunks and embeds a note's markdown content into note_chunks (BE-5.6).
 * Atomically replaces all existing chunks for this note.
 */
export async function rechunkAndEmbedNote(
  noteId: string,
  contentMd: string,
): Promise<void> {
  if (!UUID_RE.test(noteId)) return;

  const db = getDb();
  const trimmed = contentMd.trim();

  // If note has no content, remove existing chunks
  if (!trimmed) {
    await db.delete(noteChunks).where(eq(noteChunks.noteId, noteId));
    return;
  }

  // 1. Chunk content into ~500–800 token pieces
  const chunks = chunkText(trimmed);
  if (chunks.length === 0) {
    await db.delete(noteChunks).where(eq(noteChunks.noteId, noteId));
    return;
  }

  // 2. Compute Gemini embeddings (skips / returns null when key is missing)
  const embeddings = await generateEmbeddings(chunks).catch((err) => {
    console.warn(`[nodus] failed to generate note embeddings for note ${noteId}:`, err);
    return null;
  });

  // 3. Atomically replace the note's note_chunks in database
  await db.transaction(async (tx) => {
    await tx.delete(noteChunks).where(eq(noteChunks.noteId, noteId));
    await tx.insert(noteChunks).values(
      chunks.map((content, idx) => ({
        noteId,
        chunkIndex: idx,
        content,
        embedding: embeddings ? embeddings[idx] ?? null : null,
      })),
    );
  });
}

