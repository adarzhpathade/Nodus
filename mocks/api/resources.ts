import { ALLOWED_UPLOAD_MIME_TYPES, type Resource, type ResourcesApi } from "@/contracts/resources";
import { assertTeaches, clone, fail, mockRequest, requireActor, requireFaculty } from "../context";
import { DEMO_STUDENT } from "../fixtures/people";
import { mockId } from "../fixtures/ids";
import { logActivity, type MockStore } from "../store";
import { assertSemesterOpen, findUnit, nowIso, subjectOfUnit } from "./shared";

/** Mock ingestion: a fresh upload is "processing" for a few seconds, then "ready". */
const INGESTION_MS = 6_000;
const SAMPLE_FILE_PATH = "/mock/sample-resource.pdf";

function refreshIngestion(resource: Resource) {
  if (resource.ingestion.status !== "processing") return;
  if (Date.now() - new Date(resource.uploadedAt).getTime() < INGESTION_MS) return;
  resource.ingestion = { status: "ready", pageCount: 12, error: null, updatedAt: nowIso() };
}

function findResource(store: MockStore, resourceId: string) {
  const resource = store.resources.find((r) => r.id === resourceId);
  if (!resource) throw fail("NOT_FOUND", "File not found.");
  refreshIngestion(resource);
  return resource;
}

/** Students: own section + open semester. Faculty: own subjects. */
async function assertCanView(store: MockStore, resource: Resource) {
  const actor = await requireActor(store);
  const subject = subjectOfUnit(store, resource.unitId);
  if (actor.role === "faculty") {
    assertTeaches(actor, subject.id);
    return actor;
  }
  if (!actor.profile) throw fail("FORBIDDEN", "Complete onboarding first.");
  assertSemesterOpen(actor.profile, subject.semesterNumber);
  // Not visible to this section → behave as if it doesn't exist.
  if (!resource.visibleSections.includes(actor.profile.section)) throw fail("NOT_FOUND", "File not found.");
  return actor;
}

async function facultyResource(store: MockStore, resourceId: string) {
  const faculty = await requireFaculty(store);
  const resource = findResource(store, resourceId);
  assertTeaches(faculty, subjectOfUnit(store, resource.unitId).id);
  return resource;
}

export const resourcesMock: ResourcesApi = {
  async listUnitResources(unitId) {
    const store = await mockRequest();
    const actor = await requireActor(store);
    const subject = subjectOfUnit(store, unitId);
    if (actor.role === "faculty") assertTeaches(actor, subject.id);
    else if (actor.profile) assertSemesterOpen(actor.profile, subject.semesterNumber);
    else throw fail("FORBIDDEN", "Complete onboarding first.");

    const section = actor.role === "student" ? actor.profile?.section : null;
    const list = store.resources.filter((r) => r.unitId === unitId && (!section || r.visibleSections.includes(section)));
    list.forEach(refreshIngestion);
    return clone(list.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)));
  },

  async getResourceAccess(input) {
    const store = await mockRequest(120);
    const resource = findResource(store, input.resourceId);
    const actor = await assertCanView(store, resource);
    if (actor.role === "student") logActivity(store, actor.user.id, "resource_opened");
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return {
      url: `${origin}${SAMPLE_FILE_PATH}?file=${encodeURIComponent(resource.fileName)}`,
      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    };
  },

  async getResource(resourceId) {
    const store = await mockRequest();
    const resource = findResource(store, resourceId);
    await assertCanView(store, resource);
    return clone(resource);
  },

  async uploadResource(input) {
    const store = await mockRequest(800);
    const faculty = await requireFaculty(store);
    const unit = findUnit(store, input.unitId);
    const teaching = assertTeaches(faculty, unit.subjectId);
    const outside = input.visibleSections.filter((s) => !teaching.sections.includes(s));
    if (outside.length) throw fail("FORBIDDEN", `You don't teach section ${outside.join(", ")}.`);

    const type = ALLOWED_UPLOAD_MIME_TYPES[input.file.type as keyof typeof ALLOWED_UPLOAD_MIME_TYPES];
    if (!type) throw fail("VALIDATION", "Only PDF, PPT and PPTX files are allowed.");

    const uploadedAt = nowIso();
    const resource: Resource = {
      id: mockId(`resource:upload:${input.file.name}:${uploadedAt}`),
      unitId: unit.id,
      fileName: input.file.name,
      type,
      sizeBytes: input.file.size,
      visibleSections: input.visibleSections,
      uploadedBy: { id: faculty.user.id, name: faculty.user.name },
      uploadedAt,
      ingestion: { status: "processing", pageCount: null, error: null, updatedAt: uploadedAt },
    };
    store.resources.push(resource);

    if (input.visibleSections.includes(DEMO_STUDENT.profile.section)) {
      store.notifications.unshift({
        id: mockId(`notification:upload:${resource.id}`),
        userId: DEMO_STUDENT.user.id,
        type: "resource_uploaded",
        title: `New material in ${unit.title}`,
        body: `${faculty.user.name} uploaded ${resource.fileName}`,
        target: { kind: "resource", resourceId: resource.id, unitId: unit.id },
        read: false,
        createdAt: uploadedAt,
      });
    }
    return clone(resource);
  },

  async updateVisibility(input) {
    const store = await mockRequest(150);
    const resource = await facultyResource(store, input.resourceId);
    resource.visibleSections = input.visibleSections;
    return clone(resource);
  },

  async deleteResource(input) {
    const store = await mockRequest(150);
    const resource = await facultyResource(store, input.resourceId);
    store.resources = store.resources.filter((r) => r.id !== resource.id);
    store.passages.delete(resource.id);
  },
};
