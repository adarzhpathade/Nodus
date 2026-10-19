// Faculty uploads and their RAG chunks. Owner: BE.
import { index, integer, pgTable, text, timestamp, uuid, vector } from "drizzle-orm/pg-core";
import { EMBEDDING_DIMENSIONS } from "../../ai/config"; // relative: drizzle-kit runs outside Next
import { id, ingestionStatusEnum, resourceTypeEnum, timestamps } from "./_shared";
import { units } from "./curriculum";
import { users } from "./users";

export const resources = pgTable(
  "resources",
  {
    id: id(),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    /** Object key in the `nodus-uploads` bucket. */
    storageKey: text("storage_key").notNull().unique(),
    fileName: text("file_name").notNull(),
    type: resourceTypeEnum("type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    visibleSections: text("visible_sections").array().notNull(),
    ingestionStatus: ingestionStatusEnum("ingestion_status").notNull().default("processing"),
    pageCount: integer("page_count"),
    ingestionError: text("ingestion_error"),
    ...timestamps,
  },
  (t) => [
    index("resources_unit_idx").on(t.unitId),
    index("resources_unit_status_idx").on(t.unitId, t.ingestionStatus),
  ],
);

export const resourceChunks = pgTable(
  "resource_chunks",
  {
    id: id(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    /** 1-based page (PDF) or slide (PPT). */
    page: integer("page"),
    /** Null until embedded (BE-4.6). */
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("resource_chunks_resource_idx").on(t.resourceId, t.chunkIndex),
    index("resource_chunks_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);
