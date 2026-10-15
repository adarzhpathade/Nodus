// C-04 — Student notes, links, backlinks and search. Owner: BE (FE reviews).
// Notes are PRIVATE: every method only ever touches the viewer's own notes.
import { z } from "zod";
import { Id, PageQuery, SemesterNumber, SyllabusLocation, Timestamp, paginated } from "./common";

/** What a link points at. Stored by ID, so renames never break links. */
export const LinkTarget = z.discriminatedUnion("type", [
  z.object({ type: z.literal("note"), id: Id }),
  z.object({ type: z.literal("topic"), id: Id }),
  z.object({ type: z.literal("unit"), id: Id }),
]);
export type LinkTarget = z.infer<typeof LinkTarget>;

/**
 * Builds a portable in-app link href: "nodus://note/<id>", "nodus://topic/<id>", or "nodus://unit/<id>".
 * Note: updateNote re-derives note_links rows from these hrefs when contentMd is sent.
 */
export function noteLinkHref(target: { type: "note" | "topic" | "unit"; id: string }): string {
  return `nodus://${target.type}/${target.id}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parses a nodus:// link href into a LinkTarget, or null if not a valid nodus link. */
export function parseNoteLinkHref(href: string): LinkTarget | null {
  const match = /^nodus:\/\/(note|topic|unit)\/([^/?#]+)$/i.exec(href);
  if (!match) return null;
  const type = match[1].toLowerCase() as "note" | "topic" | "unit";
  const id = match[2];
  if (!UUID_RE.test(id)) return null;
  return { type, id };
}


export const NoteLink = z.object({
  id: Id,
  fromNoteId: Id,
  target: LinkTarget,
  /** Current title of the target (resolved at read time). */
  targetTitle: z.string(),
});
export type NoteLink = z.infer<typeof NoteLink>;

export const Backlink = z.object({
  noteId: Id,
  noteTitle: z.string(),
  location: SyllabusLocation,
  /** Short text around the link, if available. */
  snippet: z.string().nullable(),
});
export type Backlink = z.infer<typeof Backlink>;

export const Tag = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{0,30}$/, "Tags use lowercase letters, numbers and dashes");
export type Tag = z.infer<typeof Tag>;

export const NoteSummary = z.object({
  id: Id,
  title: z.string(),
  excerpt: z.string(),
  tags: z.array(z.string()),
  location: SyllabusLocation,
  createdAt: Timestamp,
  updatedAt: Timestamp,
});
export type NoteSummary = z.infer<typeof NoteSummary>;

export const Note = NoteSummary.extend({
  /** Markdown — the portable source of truth. */
  contentMd: z.string(),
  /** Tiptap JSON document for lossless editing (null for notes created outside the editor). */
  contentJson: z.unknown().nullable(),
  links: z.array(NoteLink),
  backlinks: z.array(Backlink),
});
export type Note = z.infer<typeof Note>;

// ---------- Inputs ----------

export const CreateNoteInput = z.object({
  topicId: Id,
  title: z.string().trim().max(160).optional(),
});
export type CreateNoteInput = z.infer<typeof CreateNoteInput>;

/** Auto-save. Send only the fields that changed. */
export const UpdateNoteInput = z.object({
  noteId: Id,
  title: z.string().trim().min(1).max(160).optional(),
  contentMd: z.string().max(200_000).optional(),
  contentJson: z.unknown().optional(),
  tags: z.array(Tag).max(20).optional(),
  /** Move the note to another topic. */
  topicId: Id.optional(),
});
export type UpdateNoteInput = z.infer<typeof UpdateNoteInput>;

export const SaveResult = z.object({ noteId: Id, updatedAt: Timestamp });
export type SaveResult = z.infer<typeof SaveResult>;

export const NoteIdInput = z.object({ noteId: Id });
export type NoteIdInput = z.infer<typeof NoteIdInput>;

export const AddLinkInput = z.object({ fromNoteId: Id, target: LinkTarget });
export type AddLinkInput = z.infer<typeof AddLinkInput>;

export const RemoveLinkInput = z.object({ linkId: Id });
export type RemoveLinkInput = z.infer<typeof RemoveLinkInput>;

export const ListNotesQuery = PageQuery.extend({
  semesterNumber: SemesterNumber.optional(),
  subjectId: Id.optional(),
  unitId: Id.optional(),
  topicId: Id.optional(),
  tag: z.string().optional(),
  /** Full-text search over title + content. */
  search: z.string().trim().max(200).optional(),
  sort: z.enum(["updated", "created", "title"]).default("updated"),
});
export type ListNotesQuery = z.input<typeof ListNotesQuery>;

export const NoteSummaryPage = paginated(NoteSummary);
export type NoteSummaryPage = z.infer<typeof NoteSummaryPage>;

// ---------- Quick switcher (Ctrl+K) and previews ----------

export const QuickSearchInput = z.object({
  query: z.string().trim().min(1).max(100),
  semesterNumber: SemesterNumber.optional(),
  limit: z.number().int().min(1).max(30).default(10),
});
export type QuickSearchInput = z.input<typeof QuickSearchInput>;

export const QuickSearchResult = z.object({
  type: z.enum(["note", "topic", "unit", "subject"]),
  id: Id,
  title: z.string(),
  /** e.g. "Algorithms › Unit 3 – Graphs" */
  subtitle: z.string(),
});
export type QuickSearchResult = z.infer<typeof QuickSearchResult>;

export const LinkPreview = z.object({
  target: LinkTarget,
  title: z.string(),
  excerpt: z.string(),
  location: SyllabusLocation,
});
export type LinkPreview = z.infer<typeof LinkPreview>;

export const MarkdownExport = z.object({ fileName: z.string(), content: z.string() });
export type MarkdownExport = z.infer<typeof MarkdownExport>;

export interface NotesApi {
  listNotes(query: ListNotesQuery): Promise<NoteSummaryPage>;
  getNote(noteId: string): Promise<Note>;
  createNote(input: CreateNoteInput): Promise<Note>;
  /** Idempotent; safe to call often. */
  updateNote(input: UpdateNoteInput): Promise<SaveResult>;
  deleteNote(input: NoteIdInput): Promise<void>;
  addLink(input: AddLinkInput): Promise<NoteLink>;
  removeLink(input: RemoveLinkInput): Promise<void>;
  getLinkPreview(target: LinkTarget): Promise<LinkPreview>;
  quickSearch(input: QuickSearchInput): Promise<QuickSearchResult[]>;
  /** All tags the viewer uses, most used first. */
  listTags(): Promise<{ tag: string; count: number }[]>;
  exportMarkdown(input: NoteIdInput): Promise<MarkdownExport>;
}
