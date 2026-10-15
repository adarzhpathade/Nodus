// C-03 — Faculty uploads (PDF/PPT) and their ingestion for the AI. Owner: BE (FE reviews).
//
// Upload goes through the route handler `POST /api/upload` (multipart/form-data), not a server action,
// because files can be large. Fields: `file`, `unitId`, `visibleSections` (comma list, e.g. "A,B").
import { z } from "zod";
import { Id, PersonRef, Section, Timestamp } from "./common";

export const ResourceType = z.enum(["pdf", "ppt", "pptx"]);
export type ResourceType = z.infer<typeof ResourceType>;

export const ALLOWED_UPLOAD_MIME_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
} as const satisfies Record<string, ResourceType>;

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

export const IngestionStatus = z.enum(["processing", "ready", "failed"]);
export type IngestionStatus = z.infer<typeof IngestionStatus>;

export const Ingestion = z.object({
  status: IngestionStatus,
  /** Pages (PDF) or slides (PPT) extracted, once known. */
  pageCount: z.number().int().nullable(),
  error: z.string().nullable(),
  updatedAt: Timestamp,
});
export type Ingestion = z.infer<typeof Ingestion>;

export const Resource = z.object({
  id: Id,
  unitId: Id,
  fileName: z.string(),
  type: ResourceType,
  sizeBytes: z.number().int().nonnegative(),
  visibleSections: z.array(Section).min(1),
  uploadedBy: PersonRef,
  uploadedAt: Timestamp,
  ingestion: Ingestion,
});
export type Resource = z.infer<typeof Resource>;

/** Short-lived presigned link for viewing/downloading a private file. */
export const ResourceAccess = z.object({
  url: z.url(),
  expiresAt: Timestamp,
});
export type ResourceAccess = z.infer<typeof ResourceAccess>;

/** Validated form fields of POST /api/upload (the file itself is checked separately). */
export const UploadResourceFields = z.object({
  unitId: Id,
  visibleSections: z.array(Section).min(1),
});
export type UploadResourceFields = z.infer<typeof UploadResourceFields>;

export type UploadResourceInput = UploadResourceFields & { file: File };

export const UpdateVisibilityInput = z.object({
  resourceId: Id,
  visibleSections: z.array(Section).min(1),
});
export type UpdateVisibilityInput = z.infer<typeof UpdateVisibilityInput>;

export const ResourceIdInput = z.object({ resourceId: Id });
export type ResourceIdInput = z.infer<typeof ResourceIdInput>;

export interface ResourcesApi {
  /** Students see only resources visible to their section; faculty see all for their subjects. */
  listUnitResources(unitId: string): Promise<Resource[]>;
  /** Presigned URL (~10 min). Logs `resource_opened` activity for students. */
  getResourceAccess(input: ResourceIdInput): Promise<ResourceAccess>;
  getResource(resourceId: string): Promise<Resource>;

  // Faculty only.
  /** Stores the file, creates the row with ingestion "processing" and starts extraction + embedding. */
  uploadResource(input: UploadResourceInput): Promise<Resource>;
  updateVisibility(input: UpdateVisibilityInput): Promise<Resource>;
  deleteResource(input: ResourceIdInput): Promise<void>;
}
