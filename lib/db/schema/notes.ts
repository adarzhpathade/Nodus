// Student notes (private), their links and RAG chunks. Owner: BE.
import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, unique, uuid, vector } from "drizzle-orm/pg-core";
import { EMBEDDING_DIMENSIONS } from "../../ai/config"; // relative: drizzle-kit runs outside Next
import { id, linkTargetTypeEnum, timestamps, tsvector } from "./_shared";
import { topics } from "./curriculum";
import { users } from "./users";

export const notes = pgTable(
  "notes",
  {
    id: id(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Restrict: a topic with notes can't be deleted (contract: CONFLICT). */
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "restrict" }),
    title: text("title").notNull().default("Untitled"),
    contentMd: text("content_md").notNull().default(""),
    contentJson: jsonb("content_json"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    /** Full-text search (title weighted above body). */
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(content_md, '')), 'B')`,
    ),
    ...timestamps,
  },
  (t) => [
    index("notes_owner_topic_idx").on(t.ownerId, t.topicId),
    index("notes_owner_updated_idx").on(t.ownerId, t.updatedAt),
    index("notes_owner_topic_updated_idx").on(t.ownerId, t.topicId, t.updatedAt),
    index("notes_search_idx").using("gin", t.searchVector),
    index("notes_tags_idx").using("gin", t.tags),
  ],
);

/** Links stored by ID, so renaming never breaks them. Backlinks = rows where (to_type, to_id) match. */
export const noteLinks = pgTable(
  "note_links",
  {
    id: id(),
    fromNoteId: uuid("from_note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    toType: linkTargetTypeEnum("to_type").notNull(),
    toId: uuid("to_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("note_links_uq").on(t.fromNoteId, t.toType, t.toId),
    index("note_links_target_idx").on(t.toType, t.toId),
    index("note_links_target_from_idx").on(t.toType, t.toId, t.fromNoteId),
  ],
);

export const noteChunks = pgTable(
  "note_chunks",
  {
    id: id(),
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("note_chunks_note_idx").on(t.noteId, t.chunkIndex),
    index("note_chunks_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);
