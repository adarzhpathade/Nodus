import type { Backlink, LinkTarget, Note, NoteLink, NoteSummary, NotesApi, QuickSearchResult } from "@/contracts/notes";
import { clone, fail, mockRequest, requireStudent } from "../context";
import { mockId } from "../fixtures/ids";
import { dayKey, logActivity, type MockStore, type NoteRecord } from "../store";
import {
  assertSemesterOpen,
  byOrder,
  excerptOf,
  findSubject,
  findTopic,
  findUnit,
  nowIso,
  paginate,
  topicLocation,
  unitLocation,
} from "./shared";

function ownNote(store: MockStore, ownerId: string, noteId: string): NoteRecord {
  const note = store.notes.find((n) => n.id === noteId);
  // Someone else's note behaves exactly like a missing one — notes are private.
  if (!note || note.ownerId !== ownerId) throw fail("NOT_FOUND", "Note not found.");
  return note;
}

export function toSummary(store: MockStore, note: NoteRecord): NoteSummary {
  return {
    id: note.id,
    title: note.title,
    excerpt: excerptOf(note.contentMd),
    tags: note.tags,
    location: topicLocation(store, note.topicId),
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

function targetTitle(store: MockStore, target: LinkTarget): string | null {
  if (target.type === "note") return store.notes.find((n) => n.id === target.id)?.title ?? null;
  if (target.type === "topic") return store.topics.find((t) => t.id === target.id)?.title ?? null;
  return store.units.find((u) => u.id === target.id)?.title ?? null;
}

function toNote(store: MockStore, note: NoteRecord): Note {
  const links: NoteLink[] = store.links
    .filter((l) => l.fromNoteId === note.id)
    .map((l) => ({ id: l.id, fromNoteId: l.fromNoteId, target: l.target, targetTitle: targetTitle(store, l.target) ?? "(deleted)" }));

  const backlinks: Backlink[] = store.links
    .filter((l) => l.target.type === "note" && l.target.id === note.id)
    .map((l) => store.notes.find((n) => n.id === l.fromNoteId && n.ownerId === note.ownerId))
    .filter((from): from is NoteRecord => Boolean(from))
    .map((from) => {
      const line = from.contentMd.split("\n").find((text) => text.includes(`nodus://note/${note.id}`));
      return {
        noteId: from.id,
        noteTitle: from.title,
        location: topicLocation(store, from.topicId),
        snippet: line ? excerptOf(line, 140) : null,
      };
    });

  return { ...toSummary(store, note), contentMd: note.contentMd, contentJson: note.contentJson, links, backlinks };
}

function assertTargetExists(store: MockStore, target: LinkTarget, ownerId: string) {
  if (target.type === "note") ownNote(store, ownerId, target.id);
  else if (target.type === "topic") findTopic(store, target.id);
  else findUnit(store, target.id);
}

/** Simple relevance: title starts with the query > contains it. */
const score = (title: string, query: string) => {
  const t = title.toLowerCase();
  return t.startsWith(query) ? 2 : t.includes(query) ? 1 : 0;
};

export const notesMock: NotesApi = {
  async listNotes(query) {
    const store = await mockRequest();
    const { user, profile } = await requireStudent(store);
    if (query.semesterNumber) assertSemesterOpen(profile, query.semesterNumber);
    const search = query.search?.toLowerCase();

    const items = store.notes
      .filter((n) => n.ownerId === user.id)
      .map((n) => ({ record: n, summary: toSummary(store, n) }))
      .filter(({ record, summary }) => {
        const loc = summary.location;
        if (query.semesterNumber && loc.semesterNumber !== query.semesterNumber) return false;
        if (query.subjectId && loc.subjectId !== query.subjectId) return false;
        if (query.unitId && loc.unitId !== query.unitId) return false;
        if (query.topicId && loc.topicId !== query.topicId) return false;
        if (query.tag && !record.tags.includes(query.tag.toLowerCase())) return false;
        if (search && !`${record.title}\n${record.contentMd}`.toLowerCase().includes(search)) return false;
        return true;
      })
      .map(({ summary }) => summary);

    const sort = query.sort ?? "updated";
    items.sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "created"
          ? b.createdAt.localeCompare(a.createdAt)
          : b.updatedAt.localeCompare(a.updatedAt),
    );
    return clone(paginate(items, query.cursor, query.limit ?? 20));
  },

  async getNote(noteId) {
    const store = await mockRequest();
    const { user } = await requireStudent(store);
    return clone(toNote(store, ownNote(store, user.id, noteId)));
  },

  async createNote(input) {
    const store = await mockRequest(150);
    const { user, profile } = await requireStudent(store);
    const location = topicLocation(store, input.topicId);
    assertSemesterOpen(profile, location.semesterNumber);
    const now = nowIso();
    const note: NoteRecord = {
      id: mockId(`note:new:${user.id}:${now}:${Math.random()}`),
      ownerId: user.id,
      topicId: input.topicId,
      title: input.title?.trim() || "Untitled note",
      contentMd: "",
      contentJson: null,
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    store.notes.push(note);
    logActivity(store, user.id, "note_created");
    return clone(toNote(store, note));
  },

  async updateNote(input) {
    const store = await mockRequest(80);
    const { user } = await requireStudent(store);
    const note = ownNote(store, user.id, input.noteId);
    if (input.topicId) findTopic(store, input.topicId);

    const previousDay = dayKey(new Date(note.updatedAt));
    if (input.title !== undefined) note.title = input.title;
    if (input.contentMd !== undefined) note.contentMd = input.contentMd;
    if (input.contentJson !== undefined) note.contentJson = input.contentJson;
    if (input.tags !== undefined) note.tags = [...new Set(input.tags)];
    if (input.topicId !== undefined) note.topicId = input.topicId;
    note.updatedAt = nowIso();

    // One heatmap tick per note per day, not per auto-save.
    if (previousDay !== dayKey(new Date())) logActivity(store, user.id, "note_updated");
    return { noteId: note.id, updatedAt: note.updatedAt };
  },

  async deleteNote(input) {
    const store = await mockRequest(150);
    const { user } = await requireStudent(store);
    const note = ownNote(store, user.id, input.noteId);
    store.notes = store.notes.filter((n) => n.id !== note.id);
    store.links = store.links.filter(
      (l) => l.fromNoteId !== note.id && !(l.target.type === "note" && l.target.id === note.id),
    );
    store.analyses.delete(note.id);
  },

  async addLink(input) {
    const store = await mockRequest();
    const { user } = await requireStudent(store);
    ownNote(store, user.id, input.fromNoteId);
    assertTargetExists(store, input.target, user.id);
    if (input.target.type === "note" && input.target.id === input.fromNoteId) {
      throw fail("VALIDATION", "A note can't link to itself.");
    }
    const existing = store.links.find(
      (l) => l.fromNoteId === input.fromNoteId && l.target.type === input.target.type && l.target.id === input.target.id,
    );
    const link = existing ?? { id: mockId(`link:new:${input.fromNoteId}:${input.target.id}`), fromNoteId: input.fromNoteId, target: input.target };
    if (!existing) store.links.push(link);
    return clone({ ...link, targetTitle: targetTitle(store, link.target) ?? "(deleted)" });
  },

  async removeLink(input) {
    const store = await mockRequest();
    const { user } = await requireStudent(store);
    const link = store.links.find((l) => l.id === input.linkId);
    if (!link) throw fail("NOT_FOUND", "Link not found.");
    ownNote(store, user.id, link.fromNoteId);
    store.links = store.links.filter((l) => l.id !== link.id);
  },

  async getLinkPreview(target) {
    const store = await mockRequest();
    const { user } = await requireStudent(store);
    if (target.type === "note") {
      const note = ownNote(store, user.id, target.id);
      return clone({ target, title: note.title, excerpt: excerptOf(note.contentMd, 220), location: topicLocation(store, note.topicId) });
    }
    if (target.type === "topic") {
      const topic = findTopic(store, target.id);
      const count = store.notes.filter((n) => n.ownerId === user.id && n.topicId === topic.id).length;
      const unit = findUnit(store, topic.unitId);
      return clone({
        target,
        title: topic.title,
        excerpt: `Topic ${topic.order} of ${unit.title} · ${count ? `${count} of your notes` : "no notes yet"}`,
        location: topicLocation(store, topic.id),
      });
    }
    const unit = findUnit(store, target.id);
    const topicTitles = store.topics.filter((t) => t.unitId === unit.id).sort(byOrder).map((t) => t.title);
    return clone({ target, title: unit.title, excerpt: `Topics: ${topicTitles.join(", ")}`, location: unitLocation(store, unit.id) });
  },

  async quickSearch(input) {
    const store = await mockRequest();
    const { user, profile } = await requireStudent(store);
    const query = input.query.trim().toLowerCase();
    const semester = input.semesterNumber ?? store.studentSelection.get(user.id) ?? profile.currentSemester;
    assertSemesterOpen(profile, semester);

    const subjects = store.subjects.filter((s) => s.semesterNumber === semester);
    const subjectIds = new Set(subjects.map((s) => s.id));
    const units = store.units.filter((u) => subjectIds.has(u.subjectId));
    const unitIds = new Set(units.map((u) => u.id));
    const topics = store.topics.filter((t) => unitIds.has(t.unitId));
    const subjectName = (id: string) => findSubject(store, id).name;

    const results: (QuickSearchResult & { rank: number })[] = [
      ...store.notes
        .filter((n) => n.ownerId === user.id)
        .map((n) => ({ n, loc: topicLocation(store, n.topicId) }))
        .filter(({ loc }) => loc.semesterNumber === semester)
        .map(({ n, loc }) => ({
          type: "note" as const,
          id: n.id,
          title: n.title,
          subtitle: `${loc.subjectName} › ${loc.unitTitle}`,
          rank: score(n.title, query) * 3,
        })),
      ...topics.map((t) => {
        const unit = findUnit(store, t.unitId);
        return { type: "topic" as const, id: t.id, title: t.title, subtitle: `${subjectName(unit.subjectId)} › ${unit.title}`, rank: score(t.title, query) * 2 };
      }),
      ...units.map((u) => ({ type: "unit" as const, id: u.id, title: u.title, subtitle: `${subjectName(u.subjectId)} › Unit ${u.order}`, rank: score(u.title, query) * 2 })),
      ...subjects.map((s) => ({ type: "subject" as const, id: s.id, title: s.name, subtitle: s.code, rank: Math.max(score(s.name, query), score(s.code, query)) })),
    ];

    return results
      .filter((r) => r.rank > 0)
      .sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title))
      .slice(0, input.limit ?? 10)
      .map((r) => ({ type: r.type, id: r.id, title: r.title, subtitle: r.subtitle }));
  },

  async listTags() {
    const store = await mockRequest();
    const { user } = await requireStudent(store);
    const counts = new Map<string, number>();
    for (const note of store.notes) {
      if (note.ownerId === user.id) for (const tag of note.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  },

  async exportMarkdown(input) {
    const store = await mockRequest();
    const { user } = await requireStudent(store);
    const note = ownNote(store, user.id, input.noteId);
    const slug = note.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "note";
    const body = note.contentMd.trimStart().startsWith("# ") ? note.contentMd : `# ${note.title}\n\n${note.contentMd}`;
    return { fileName: `${slug}.md`, content: body };
  },
};
