// Real ResourcesApi (C-03). Implements BE-4.3 … BE-4.8. Owner: BE.
import "server-only";
import { randomUUID } from "node:crypto";
import { waitUntil } from "@vercel/functions";
import { GatewayError } from "@/contracts/common";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  type Resource,
  type ResourceAccess,
  type ResourceIdInput,
  type ResourcesApi,
  type ResourceType,
  type UpdateVisibilityInput,
  type UploadResourceInput,
} from "@/contracts/resources";
import {
  assertSemesterOpen,
  requireFaculty,
  requireFacultyTeaches,
  requireStudent,
  requireViewer,
} from "@/lib/auth/guards";
import { findUnitWithSubject } from "@/lib/db/queries/curriculum";
import {
  deleteResource as deleteResourceRecord,
  findResourceWithRelations,
  insertResource,
  listResourcesForUnit,
  updateResourceVisibility as updateResourceVisibilityRecord,
  type ResourceRecord,
} from "@/lib/db/queries/resources";
import { logActivity } from "@/lib/db/queries/activity";
import { notifyNewResource } from "@/lib/db/queries/notifications";
import { getStorage } from "@/lib/storage";
import { ingestResource } from "@/lib/ai/rag/ingest";

function toResource(
  record: ResourceRecord,
  uploader: { id: string; name: string },
): Resource {
  return {
    id: record.id,
    unitId: record.unitId,
    fileName: record.fileName,
    type: record.type as ResourceType,
    sizeBytes: record.sizeBytes,
    visibleSections: record.visibleSections,
    uploadedBy: {
      id: uploader.id,
      name: uploader.name,
    },
    uploadedAt: record.createdAt.toISOString(),
    ingestion: {
      status: record.ingestionStatus,
      pageCount: record.pageCount ?? null,
      error: record.ingestionError ?? null,
      updatedAt: record.updatedAt.toISOString(),
    },
  };
}

function resolveResourceType(file: File): ResourceType | undefined {
  if (file.type in ALLOWED_UPLOAD_MIME_TYPES) {
    return ALLOWED_UPLOAD_MIME_TYPES[file.type as keyof typeof ALLOWED_UPLOAD_MIME_TYPES];
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "ppt") return "ppt";
  if (ext === "pptx") return "pptx";
  return undefined;
}

export const resourcesApi: ResourcesApi = {
  async listUnitResources(unitId: string): Promise<Resource[]> {
    const viewer = await requireViewer();
    const unitInfo = await findUnitWithSubject(unitId);
    if (!unitInfo) throw new GatewayError("NOT_FOUND", "Unit not found.");

    if (viewer.role === "student") {
      const student = await requireStudent();
      if (student.profile.branch.id !== unitInfo.subject.branchId) {
        throw new GatewayError("NOT_FOUND", "Unit not found.");
      }
      assertSemesterOpen(student, unitInfo.subject.semesterNumber);

      const rows = await listResourcesForUnit(unitId, student.profile.section);
      return rows.map((r) => toResource(r.resource, r.uploader));
    }

    await requireFacultyTeaches(unitInfo.subject.id);
    const rows = await listResourcesForUnit(unitId);
    return rows.map((r) => toResource(r.resource, r.uploader));
  },

  async getResource(resourceId: string): Promise<Resource> {
    const viewer = await requireViewer();
    const found = await findResourceWithRelations(resourceId);
    if (!found) throw new GatewayError("NOT_FOUND", "Resource not found.");

    if (viewer.role === "student") {
      const student = await requireStudent();
      if (student.profile.branch.id !== found.subject.branchId) {
        throw new GatewayError("NOT_FOUND", "Resource not found.");
      }
      assertSemesterOpen(student, found.subject.semesterNumber);

      if (!found.resource.visibleSections.includes(student.profile.section)) {
        throw new GatewayError("FORBIDDEN", "This resource is not visible to your section.");
      }
      return toResource(found.resource, found.uploader);
    }

    await requireFacultyTeaches(found.subject.id);
    return toResource(found.resource, found.uploader);
  },

  async getResourceAccess(input: ResourceIdInput): Promise<ResourceAccess> {
    const viewer = await requireViewer();
    const found = await findResourceWithRelations(input.resourceId);
    if (!found) throw new GatewayError("NOT_FOUND", "Resource not found.");

    if (viewer.role === "student") {
      const student = await requireStudent();
      if (student.profile.branch.id !== found.subject.branchId) {
        throw new GatewayError("NOT_FOUND", "Resource not found.");
      }
      assertSemesterOpen(student, found.subject.semesterNumber);

      if (!found.resource.visibleSections.includes(student.profile.section)) {
        throw new GatewayError("FORBIDDEN", "This resource is not visible to your section.");
      }

      // Log study activity for students (BE-4.8)
      await logActivity({
        studentId: student.user.id,
        type: "resource_opened",
        refId: found.resource.id,
      });
    } else {
      await requireFacultyTeaches(found.subject.id);
    }

    const files = getStorage();
    const expiresIn = 600; // ~10 minutes
    try {
      const url = await files.url(found.resource.storageKey, {
        expiresIn,
        responseContentDisposition: `inline; filename="${encodeURIComponent(found.resource.fileName)}"`,
      });

      return {
        url,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      };
    } catch (err) {
      console.error("[nodus] presigned url generation failed:", err);
      throw new GatewayError("INTERNAL", "Could not generate file access link. Please try again.");
    }
  },

  async uploadResource(input: UploadResourceInput): Promise<Resource> {
    const faculty = await requireFaculty();
    const unitInfo = await findUnitWithSubject(input.unitId);
    if (!unitInfo) throw new GatewayError("NOT_FOUND", "Unit not found.");
    await requireFacultyTeaches(unitInfo.subject.id);

    if (!input.file || input.file.size === 0) {
      throw new GatewayError("VALIDATION", "Choose a file to upload.", {
        fieldErrors: { file: ["Required"] },
      });
    }
    if (input.file.size > MAX_UPLOAD_BYTES) {
      throw new GatewayError("VALIDATION", `Files must be ${MAX_UPLOAD_BYTES / 1024 / 1024} MB or smaller.`, {
        fieldErrors: { file: ["File too large"] },
      });
    }

    const resourceType = resolveResourceType(input.file);
    if (!resourceType) {
      throw new GatewayError("VALIDATION", "Only PDF, PPT and PPTX files are allowed.", {
        fieldErrors: { file: ["Unsupported file type"] },
      });
    }

    const files = getStorage();
    const buffer = Buffer.from(await input.file.arrayBuffer());
    const cleanFileName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `resources/${input.unitId}/${randomUUID()}-${cleanFileName}`;
    const contentType = input.file.type || (resourceType === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.presentationml.presentation");

    try {
      await files.upload(storageKey, buffer, { contentType });
    } catch (err) {
      console.error("[nodus] storage upload failed:", err);
      throw new GatewayError("INTERNAL", "Failed to upload file to storage. Please try again.");
    }

    const record = await insertResource({
      unitId: input.unitId,
      uploadedBy: faculty.user.id,
      storageKey,
      fileName: input.file.name,
      type: resourceType,
      sizeBytes: input.file.size,
      visibleSections: input.visibleSections,
    });

    const ingestionPromise = ingestResource({
      resourceId: record.id,
      storageKey,
      fileBytes: buffer,
      fileType: resourceType,
    }).catch((err) => {
      console.error(`[nodus] background ingestion error for resource ${record.id}:`, err);
    });

    try {
      waitUntil(ingestionPromise);
    } catch {
      // Outside Vercel runtime
    }

    const notificationPromise = notifyNewResource(
      input.unitId,
      input.visibleSections,
      input.file.name,
    ).catch((err) => {
      console.error(`[nodus] background notification error for resource ${record.id}:`, err);
    });

    try {
      waitUntil(notificationPromise);
    } catch {
      // Outside Vercel runtime
    }

    return toResource(record, { id: faculty.user.id, name: faculty.user.name });
  },

  async updateVisibility(input: UpdateVisibilityInput): Promise<Resource> {
    await requireFaculty();
    const found = await findResourceWithRelations(input.resourceId);
    if (!found) throw new GatewayError("NOT_FOUND", "Resource not found.");
    await requireFacultyTeaches(found.subject.id);

    const updated = await updateResourceVisibilityRecord(input.resourceId, input.visibleSections);
    if (!updated) throw new GatewayError("NOT_FOUND", "Resource not found.");

    return toResource(updated, found.uploader);
  },

  async deleteResource(input: ResourceIdInput): Promise<void> {
    await requireFaculty();
    const found = await findResourceWithRelations(input.resourceId);
    if (!found) throw new GatewayError("NOT_FOUND", "Resource not found.");
    await requireFacultyTeaches(found.subject.id);

    try {
      const files = getStorage();
      await files.delete(found.resource.storageKey);
    } catch (err) {
      console.warn(`[nodus] failed to delete storage key ${found.resource.storageKey}:`, err);
    }

    await deleteResourceRecord(input.resourceId);
  },
};
