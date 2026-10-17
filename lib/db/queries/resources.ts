// Resource queries (faculty uploads, chunks, ingestion, section visibility). Owner: BE.
import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  resourceChunks,
  resources,
  semesters,
  subjects,
  units,
  users,
} from "@/lib/db/schema";
import type { IngestionStatus, ResourceType } from "@/contracts/resources";

export type ResourceRecord = typeof resources.$inferSelect;
export type ResourceChunkRecord = typeof resourceChunks.$inferSelect;

export interface ResourceWithRelations {
  resource: ResourceRecord;
  uploader: {
    id: string;
    name: string;
  };
  unit: {
    id: string;
    title: string;
    subjectId: string;
  };
  subject: {
    id: string;
    code: string;
    name: string;
    semesterNumber: number;
    branchId: string;
  };
}

export async function findResourceWithRelations(
  resourceId: string,
): Promise<ResourceWithRelations | null> {
  const [row] = await getDb()
    .select({
      resource: resources,
      uploader: {
        id: users.id,
        name: users.name,
      },
      unit: {
        id: units.id,
        title: units.title,
        subjectId: units.subjectId,
      },
      subject: {
        id: subjects.id,
        code: subjects.code,
        name: subjects.name,
        semesterNumber: semesters.number,
        branchId: semesters.branchId,
      },
    })
    .from(resources)
    .innerJoin(users, eq(users.id, resources.uploadedBy))
    .innerJoin(units, eq(units.id, resources.unitId))
    .innerJoin(subjects, eq(subjects.id, units.subjectId))
    .innerJoin(semesters, eq(semesters.id, subjects.semesterId))
    .where(eq(resources.id, resourceId))
    .limit(1);

  return row ?? null;
}

export interface UnitResourceItem {
  resource: ResourceRecord;
  uploader: {
    id: string;
    name: string;
  };
}

export async function listResourcesForUnit(
  unitId: string,
  sectionFilter?: string,
): Promise<UnitResourceItem[]> {
  const conditions = [eq(resources.unitId, unitId)];

  if (sectionFilter) {
    conditions.push(sql`${sectionFilter} = ANY(${resources.visibleSections})`);
  }

  const rows = await getDb()
    .select({
      resource: resources,
      uploader: {
        id: users.id,
        name: users.name,
      },
    })
    .from(resources)
    .innerJoin(users, eq(users.id, resources.uploadedBy))
    .where(and(...conditions))
    .orderBy(desc(resources.createdAt));

  return rows;
}

export interface InsertResourceInput {
  unitId: string;
  uploadedBy: string;
  storageKey: string;
  fileName: string;
  type: ResourceType;
  sizeBytes: number;
  visibleSections: string[];
}

export async function insertResource(
  input: InsertResourceInput,
): Promise<ResourceRecord> {
  const [created] = await getDb()
    .insert(resources)
    .values({
      unitId: input.unitId,
      uploadedBy: input.uploadedBy,
      storageKey: input.storageKey,
      fileName: input.fileName,
      type: input.type,
      sizeBytes: input.sizeBytes,
      visibleSections: input.visibleSections,
      ingestionStatus: "processing",
      pageCount: null,
      ingestionError: null,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to insert resource record");
  }

  return created;
}

export async function updateResourceVisibility(
  resourceId: string,
  visibleSections: string[],
): Promise<ResourceRecord | null> {
  const [updated] = await getDb()
    .update(resources)
    .set({
      visibleSections,
      updatedAt: new Date(),
    })
    .where(eq(resources.id, resourceId))
    .returning();

  return updated ?? null;
}

export async function updateResourceIngestion(
  resourceId: string,
  data: {
    status: IngestionStatus;
    pageCount?: number | null;
    error?: string | null;
  },
): Promise<void> {
  await getDb()
    .update(resources)
    .set({
      ingestionStatus: data.status,
      pageCount: data.pageCount !== undefined ? data.pageCount : undefined,
      ingestionError: data.error !== undefined ? data.error : null,
      updatedAt: new Date(),
    })
    .where(eq(resources.id, resourceId));
}

export async function deleteResource(resourceId: string): Promise<void> {
  await getDb().delete(resources).where(eq(resources.id, resourceId));
}

export interface InsertChunkInput {
  resourceId: string;
  chunkIndex: number;
  content: string;
  page: number | null;
  embedding: number[] | null;
}

export async function insertResourceChunks(
  chunks: InsertChunkInput[],
): Promise<void> {
  if (chunks.length === 0) return;

  const db = getDb();
  const BATCH_SIZE = 500;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    await db.insert(resourceChunks).values(
      batch.map((c) => ({
        resourceId: c.resourceId,
        chunkIndex: c.chunkIndex,
        content: c.content,
        page: c.page,
        embedding: c.embedding,
      })),
    );
  }
}
