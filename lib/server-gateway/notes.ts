// Real NotesApi (C-04). Implements BE-5.1 … BE-5.5, BE-5.7. Owner: BE.
import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { GatewayError } from "@/contracts/common";
import {
  AddLinkInput,
  CreateNoteInput,
  LinkTarget,
  ListNotesQuery,
  NoteIdInput,
  QuickSearchInput,
  RemoveLinkInput,
  UpdateNoteInput,
  parseNoteLinkHref,
  type Backlink,
  type LinkPreview,
  type MarkdownExport,
  type Note,
  type NoteLink,
  type NoteSummary,
  type NoteSummaryPage,
  type NotesApi,
  type QuickSearchResult,
  type SaveResult,
} from "@/contracts/notes";
import { assertSemesterOpen, requireStudent } from "@/lib/auth/guards";
import { readStudentSemester } from "@/lib/auth/selection";
import { getDb } from "@/lib/db";
import {
  semesters,
  subjects,
  topics,
  units,
} from "@/lib/db/schema";
import { logActivity, logActivityThrottled } from "@/lib/db/queries/activity";
import {
  countOwnerNotesInTopic,
  deleteNoteLink,
  deleteNoteRecord,
  findLinkWithOwner,
  findNoteWithLocation,
  findTopicLocation,
  findUnitLocation,
  insertNote,
  insertNoteLink,
  listBacklinksForNote,
  listLinksForNote,
  listNotesWithLocation,
  listTagsForOwner,
  resolveTargetTitles,
  syncNoteLinks,
  updateNoteRecord,
  type NoteWithLocation,
} from "@/lib/db/queries/notes";

const TEN_MINUTES_MS = 10 * 60 * 1000;

/** Plain-text excerpt of Markdown (strips syntax, headings, code blocks). */
export function excerptOf(markdown: string, length = 160): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/^#+\s.*$/m, "") // drop first heading
    .replace(/[#>*_`|~-]+/g, " ")
    .replace(/\[[ x]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;
}

function toNoteSummary(record: NoteWithLocation): NoteSummary {
  return {
    id: record.note.id,
    title: record.note.title,
    excerpt: excerptOf(record.note.contentMd),
    tags: record.note.tags,
    location: {
      semesterNumber: record.location.semesterNumber,
      subjectId: record.location.subjectId,
      subjectName: record.location.subjectName,
      unitId: record.location.unitId,
      unitTitle: record.location.unitTitle,
      topicId: record.location.topicId,
      topicTitle: record.location.topicTitle,
    },
    createdAt: record.note.createdAt.toISOString(),
    updatedAt: record.note.updatedAt.toISOString(),
  };
}

const scoreRelevance = (title: string, query: string): number => {
  const t = title.toLowerCase();
  return t.startsWith(query) ? 3 : t.includes(query) ? 1 : 0;
};

export const notesApi: NotesApi = {
  async listNotes(query: ListNotesQuery): Promise<NoteSummaryPage> {
    const student = await requireStudent();
    const parsed = ListNotesQuery.parse(query);

    if (parsed.semesterNumber !== undefined) {
      assertSemesterOpen(student, parsed.semesterNumber);
    }

    const limit = parsed.limit ?? 20;
    const offset = Math.max(0, parsed.cursor ? parseInt(parsed.cursor, 10) || 0 : 0);

    const rows = await listNotesWithLocation({
      ownerId: student.user.id,
      branchId: student.profile.branch.id,
      semesterNumber: parsed.semesterNumber,
      maxSemesterNumber: student.profile.currentSemester,
      subjectId: parsed.subjectId,
      unitId: parsed.unitId,
      topicId: parsed.topicId,
      tag: parsed.tag,
      search: parsed.search,
      sort: parsed.sort,
      limit: limit + 1,
      offset,
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? String(offset + limit) : null;

    return {
      items: pageRows.map(toNoteSummary),
      nextCursor,
    };
  },

  async getNote(noteId: string): Promise<Note> {
    const student = await requireStudent();
    const found = await findNoteWithLocation(noteId, student.user.id);
    if (!found) {
      throw new GatewayError("NOT_FOUND", "Note not found.");
    }
    assertSemesterOpen(student, found.location.semesterNumber);

    // 1. Resolve outgoing links
    const rawLinks = await listLinksForNote(noteId);
    const linkTargets = rawLinks.map((l) => ({
      type: l.toType as "note" | "topic" | "unit",
      id: l.toId,
    }));
    const titleMap = await resolveTargetTitles(linkTargets, student.user.id);
    const links: NoteLink[] = rawLinks.map((l) => ({
      id: l.id,
      fromNoteId: l.fromNoteId,
      target: {
        type: l.toType as "note" | "topic" | "unit",
        id: l.toId,
      },
      targetTitle: titleMap.get(`${l.toType}:${l.toId}`) ?? "(deleted)",
    }));

    // 2. Resolve incoming backlinks
    const rawBacklinks = await listBacklinksForNote(
      noteId,
      student.user.id,
      student.profile.currentSemester,
    );
    const backlinks: Backlink[] = rawBacklinks.map((b) => {
      const line = b.fromNote.contentMd
        .split("\n")
        .find((text) => text.includes(`nodus://note/${noteId}`));
      return {
        noteId: b.fromNote.id,
        noteTitle: b.fromNote.title,
        location: {
          semesterNumber: b.loc.semesterNumber,
          subjectId: b.loc.subjectId,
          subjectName: b.loc.subjectName,
          unitId: b.loc.unitId,
          unitTitle: b.loc.unitTitle,
          topicId: b.loc.topicId,
          topicTitle: b.loc.topicTitle,
        },
        snippet: line ? excerptOf(line, 140) : null,
      };
    });

    return {
      ...toNoteSummary(found),
      contentMd: found.note.contentMd,
      contentJson: found.note.contentJson,
      links,
      backlinks,
    };
  },

  async createNote(input: CreateNoteInput): Promise<Note> {
    const student = await requireStudent();
    const parsed = CreateNoteInput.parse(input);

    const topicLoc = await findTopicLocation(parsed.topicId);
    if (!topicLoc || topicLoc.semester.branchId !== student.profile.branch.id) {
      throw new GatewayError("NOT_FOUND", "Topic not found.");
    }
    assertSemesterOpen(student, topicLoc.semester.number);

    const title = parsed.title?.trim() || "Untitled note";
    const created = await insertNote({
      ownerId: student.user.id,
      topicId: parsed.topicId,
      title,
    });

    await logActivity({
      studentId: student.user.id,
      type: "note_created",
      refId: created.id,
    });

    return {
      id: created.id,
      title: created.title,
      excerpt: "",
      tags: created.tags,
      location: {
        semesterNumber: topicLoc.semester.number,
        subjectId: topicLoc.subject.id,
        subjectName: topicLoc.subject.name,
        unitId: topicLoc.unit.id,
        unitTitle: topicLoc.unit.title,
        topicId: topicLoc.topic.id,
        topicTitle: topicLoc.topic.title,
      },
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      contentMd: created.contentMd,
      contentJson: created.contentJson,
      links: [],
      backlinks: [],
    };
  },

  async updateNote(input: UpdateNoteInput): Promise<SaveResult> {
    const student = await requireStudent();
    const parsed = UpdateNoteInput.parse(input);

    const existing = await findNoteWithLocation(parsed.noteId, student.user.id);
    if (!existing) {
      throw new GatewayError("NOT_FOUND", "Note not found.");
    }
    assertSemesterOpen(student, existing.location.semesterNumber);

    if (parsed.topicId !== undefined && parsed.topicId !== existing.note.topicId) {
      const topicLoc = await findTopicLocation(parsed.topicId);
      if (!topicLoc || topicLoc.semester.branchId !== student.profile.branch.id) {
        throw new GatewayError("NOT_FOUND", "Topic not found.");
      }
      assertSemesterOpen(student, topicLoc.semester.number);
    }

    if (parsed.title !== undefined && parsed.title.trim().length === 0) {
      throw new GatewayError("VALIDATION", "Title must be at least 1 character.", {
        fieldErrors: { title: ["Title must be at least 1 character."] },
      });
    }

    const cleanedTags = parsed.tags
      ? [...new Set(parsed.tags.map((t) => t.toLowerCase().trim()))]
      : undefined;

    const updated = await updateNoteRecord(parsed.noteId, student.user.id, {
      title: parsed.title?.trim(),
      contentMd: parsed.contentMd,
      contentJson: parsed.contentJson,
      tags: cleanedTags,
      topicId: parsed.topicId,
    });

    if (!updated) {
      throw new GatewayError("NOT_FOUND", "Note not found.");
    }

    // BE-5.3: Re-derive links from nodus://note|topic|unit/<id> hrefs
    if (parsed.contentMd !== undefined) {
      const hrefMatches =
        parsed.contentMd.match(/nodus:\/\/(?:note|topic|unit)\/[^/?#\s)\]"'<>]+/gi) ?? [];
      const targetMap = new Map<string, LinkTarget>();
      for (const href of hrefMatches) {
        const target = parseNoteLinkHref(href);
        if (target) {
          targetMap.set(`${target.type}:${target.id}`, target);
        }
      }

      const validTargets: LinkTarget[] = [];
      for (const target of targetMap.values()) {
        if (target.type === "note") {
          if (target.id === parsed.noteId) continue; // ignore self link
          const ownTargetNote = await findNoteWithLocation(target.id, student.user.id);
          if (!ownTargetNote) continue;
          validTargets.push(target);
        } else if (target.type === "topic") {
          const tLoc = await findTopicLocation(target.id);
          if (!tLoc || tLoc.semester.branchId !== student.profile.branch.id) continue;
          if (tLoc.semester.number > student.profile.currentSemester) continue;
          validTargets.push(target);
        } else if (target.type === "unit") {
          const uLoc = await findUnitLocation(target.id);
          if (!uLoc || uLoc.semester.branchId !== student.profile.branch.id) continue;
          if (uLoc.semester.number > student.profile.currentSemester) continue;
          validTargets.push(target);
        }
      }

      await syncNoteLinks(parsed.noteId, validTargets);
    }

    // BE-5.7: Log activity throttled (at most 1 per note per 10 minutes)
    await logActivityThrottled(
      {
        studentId: student.user.id,
        type: "note_updated",
        refId: parsed.noteId,
      },
      TEN_MINUTES_MS,
    );

    return {
      noteId: updated.id,
      updatedAt: updated.updatedAt.toISOString(),
    };
  },

  async deleteNote(input: NoteIdInput): Promise<void> {
    const student = await requireStudent();
    const parsed = NoteIdInput.parse(input);

    const existing = await findNoteWithLocation(parsed.noteId, student.user.id);
    if (!existing) {
      throw new GatewayError("NOT_FOUND", "Note not found.");
    }
    assertSemesterOpen(student, existing.location.semesterNumber);

    const deleted = await deleteNoteRecord(parsed.noteId, student.user.id);
    if (!deleted) {
      throw new GatewayError("NOT_FOUND", "Note not found.");
    }
  },

  async addLink(input: AddLinkInput): Promise<NoteLink> {
    const student = await requireStudent();
    const parsed = AddLinkInput.parse(input);

    const fromNote = await findNoteWithLocation(parsed.fromNoteId, student.user.id);
    if (!fromNote) {
      throw new GatewayError("NOT_FOUND", "Note not found.");
    }

    if (parsed.target.type === "note" && parsed.target.id === parsed.fromNoteId) {
      throw new GatewayError("VALIDATION", "A note can't link to itself.");
    }

    let targetTitle: string;
    if (parsed.target.type === "note") {
      const targetNote = await findNoteWithLocation(parsed.target.id, student.user.id);
      if (!targetNote) {
        throw new GatewayError("NOT_FOUND", "Target note not found.");
      }
      targetTitle = targetNote.note.title;
    } else if (parsed.target.type === "topic") {
      const topicLoc = await findTopicLocation(parsed.target.id);
      if (!topicLoc || topicLoc.semester.branchId !== student.profile.branch.id) {
        throw new GatewayError("NOT_FOUND", "Target topic not found.");
      }
      assertSemesterOpen(student, topicLoc.semester.number);
      targetTitle = topicLoc.topic.title;
    } else {
      const unitLoc = await findUnitLocation(parsed.target.id);
      if (!unitLoc || unitLoc.semester.branchId !== student.profile.branch.id) {
        throw new GatewayError("NOT_FOUND", "Target unit not found.");
      }
      assertSemesterOpen(student, unitLoc.semester.number);
      targetTitle = unitLoc.unit.title;
    }

    const link = await insertNoteLink(parsed.fromNoteId, parsed.target.type, parsed.target.id);
    return {
      id: link.id,
      fromNoteId: link.fromNoteId,
      target: parsed.target,
      targetTitle,
    };
  },

  async removeLink(input: RemoveLinkInput): Promise<void> {
    const student = await requireStudent();
    const parsed = RemoveLinkInput.parse(input);

    const linkWithOwner = await findLinkWithOwner(parsed.linkId);
    if (!linkWithOwner || linkWithOwner.ownerId !== student.user.id) {
      throw new GatewayError("NOT_FOUND", "Link not found.");
    }

    await deleteNoteLink(parsed.linkId);
  },

  async getLinkPreview(target: LinkTarget): Promise<LinkPreview> {
    const student = await requireStudent();
    const parsed = LinkTarget.parse(target);

    if (parsed.type === "note") {
      const noteWithLoc = await findNoteWithLocation(parsed.id, student.user.id);
      if (!noteWithLoc) {
        throw new GatewayError("NOT_FOUND", "Note not found.");
      }
      return {
        target: parsed,
        title: noteWithLoc.note.title,
        excerpt: excerptOf(noteWithLoc.note.contentMd, 220),
        location: {
          semesterNumber: noteWithLoc.location.semesterNumber,
          subjectId: noteWithLoc.location.subjectId,
          subjectName: noteWithLoc.location.subjectName,
          unitId: noteWithLoc.location.unitId,
          unitTitle: noteWithLoc.location.unitTitle,
          topicId: noteWithLoc.location.topicId,
          topicTitle: noteWithLoc.location.topicTitle,
        },
      };
    }

    if (parsed.type === "topic") {
      const topicLoc = await findTopicLocation(parsed.id);
      if (!topicLoc || topicLoc.semester.branchId !== student.profile.branch.id) {
        throw new GatewayError("NOT_FOUND", "Topic not found.");
      }
      assertSemesterOpen(student, topicLoc.semester.number);

      const count = await countOwnerNotesInTopic(parsed.id, student.user.id);
      return {
        target: parsed,
        title: topicLoc.topic.title,
        excerpt: `Topic ${topicLoc.topic.order} of ${topicLoc.unit.title} · ${
          count ? `${count} of your notes` : "no notes yet"
        }`,
        location: {
          semesterNumber: topicLoc.semester.number,
          subjectId: topicLoc.subject.id,
          subjectName: topicLoc.subject.name,
          unitId: topicLoc.unit.id,
          unitTitle: topicLoc.unit.title,
          topicId: topicLoc.topic.id,
          topicTitle: topicLoc.topic.title,
        },
      };
    }

    // Unit target
    const unitLoc = await findUnitLocation(parsed.id);
    if (!unitLoc || unitLoc.semester.branchId !== student.profile.branch.id) {
      throw new GatewayError("NOT_FOUND", "Unit not found.");
    }
    assertSemesterOpen(student, unitLoc.semester.number);

    const unitTopics = await getDb()
      .select({ title: topics.title })
      .from(topics)
      .where(eq(topics.unitId, parsed.id))
      .orderBy(asc(topics.order));
    const topicTitles = unitTopics.map((t) => t.title);

    return {
      target: parsed,
      title: unitLoc.unit.title,
      excerpt: `Topics: ${topicTitles.join(", ")}`,
      location: {
        semesterNumber: unitLoc.semester.number,
        subjectId: unitLoc.subject.id,
        subjectName: unitLoc.subject.name,
        unitId: unitLoc.unit.id,
        unitTitle: unitLoc.unit.title,
        topicId: null,
        topicTitle: null,
      },
    };
  },

  async quickSearch(input: QuickSearchInput): Promise<QuickSearchResult[]> {
    const student = await requireStudent();
    const parsed = QuickSearchInput.parse(input);

    const cookieSemester = await readStudentSemester();
    const semesterNumber = parsed.semesterNumber ?? cookieSemester ?? student.profile.currentSemester;
    assertSemesterOpen(student, semesterNumber);

    const query = parsed.query.trim().toLowerCase();
    const db = getDb();

    // 1. Subjects in semester
    const subjectRows = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
      })
      .from(subjects)
      .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
      .where(
        and(
          eq(semesters.branchId, student.profile.branch.id),
          eq(semesters.number, semesterNumber),
        ),
      );

    const subjectMap = new Map(subjectRows.map((s) => [s.id, s]));
    const subjectIds = subjectRows.map((s) => s.id);

    // 2. Units in semester
    const unitRows =
      subjectIds.length > 0
        ? await db
            .select({
              id: units.id,
              title: units.title,
              order: units.order,
              subjectId: units.subjectId,
            })
            .from(units)
            .where(inArray(units.subjectId, subjectIds))
        : [];

    const unitMap = new Map(unitRows.map((u) => [u.id, u]));
    const unitIds = unitRows.map((u) => u.id);

    // 3. Topics in semester
    const topicRows =
      unitIds.length > 0
        ? await db
            .select({
              id: topics.id,
              title: topics.title,
              unitId: topics.unitId,
            })
            .from(topics)
            .where(inArray(topics.unitId, unitIds))
        : [];

    // 4. Student's own notes in semester
    const noteRows = await listNotesWithLocation({
      ownerId: student.user.id,
      branchId: student.profile.branch.id,
      semesterNumber,
      search: query,
      limit: 50,
      offset: 0,
    });

    const results: (QuickSearchResult & { rank: number })[] = [];

    // Rank notes
    for (const r of noteRows) {
      const titleRank = scoreRelevance(r.note.title, query) * 4;
      const contentRank = r.note.contentMd.toLowerCase().includes(query) ? 1 : 0;
      const rank = Math.max(titleRank, contentRank, 1);
      results.push({
        type: "note",
        id: r.note.id,
        title: r.note.title,
        subtitle: `${r.location.subjectName} › ${r.location.unitTitle}`,
        rank,
      });
    }

    // Rank topics
    for (const t of topicRows) {
      const rank = scoreRelevance(t.title, query) * 3;
      if (rank > 0) {
        const u = unitMap.get(t.unitId);
        const s = u ? subjectMap.get(u.subjectId) : null;
        results.push({
          type: "topic",
          id: t.id,
          title: t.title,
          subtitle: `${s?.name ?? "Subject"} › ${u?.title ?? "Unit"}`,
          rank,
        });
      }
    }

    // Rank units
    for (const u of unitRows) {
      const rank = scoreRelevance(u.title, query) * 2;
      if (rank > 0) {
        const s = subjectMap.get(u.subjectId);
        results.push({
          type: "unit",
          id: u.id,
          title: u.title,
          subtitle: `${s?.name ?? "Subject"} › Unit ${u.order}`,
          rank,
        });
      }
    }

    // Rank subjects
    for (const s of subjectRows) {
      const nameRank = scoreRelevance(s.name, query);
      const codeRank = scoreRelevance(s.code, query);
      const rank = Math.max(nameRank, codeRank) * 2;
      if (rank > 0) {
        results.push({
          type: "subject",
          id: s.id,
          title: s.name,
          subtitle: s.code,
          rank,
        });
      }
    }

    results.sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title));
    return results.slice(0, parsed.limit ?? 10).map((r) => ({
      type: r.type,
      id: r.id,
      title: r.title,
      subtitle: r.subtitle,
    }));
  },

  async listTags(): Promise<{ tag: string; count: number }[]> {
    const student = await requireStudent();
    return listTagsForOwner(student.user.id);
  },

  async exportMarkdown(input: NoteIdInput): Promise<MarkdownExport> {
    const student = await requireStudent();
    const parsed = NoteIdInput.parse(input);

    const found = await findNoteWithLocation(parsed.noteId, student.user.id);
    if (!found) {
      throw new GatewayError("NOT_FOUND", "Note not found.");
    }
    assertSemesterOpen(student, found.location.semesterNumber);

    const slug =
      found.note.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "note";

    const body = found.note.contentMd.trimStart().startsWith("# ")
      ? found.note.contentMd
      : `# ${found.note.title}\n\n${found.note.contentMd}`;

    return {
      fileName: `${slug}.md`,
      content: body,
    };
  },
};
