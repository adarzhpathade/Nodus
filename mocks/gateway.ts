// Mock implementation of NodusGateway (FE-1.10). Owner: FE.
// In-memory world built from mocks/fixtures (see mocks/store.ts); mutations persist for the
// dev-server session. Switch user with the `nodus-mock-role` cookie (see mocks/context.ts).
import type { NodusGateway } from "@/contracts/gateway";
import { aiMock } from "./api/ai";
import { assignmentsMock } from "./api/assignments";
import { authMock } from "./api/auth";
import { curriculumMock } from "./api/curriculum";
import { dashboardMock } from "./api/dashboard";
import { graphMock } from "./api/graph";
import { notesMock } from "./api/notes";
import { notificationsMock } from "./api/notifications";
import { resourcesMock } from "./api/resources";

export const mockGateway: NodusGateway = {
  auth: authMock,
  curriculum: curriculumMock,
  resources: resourcesMock,
  notes: notesMock,
  graph: graphMock,
  ai: aiMock,
  assignments: assignmentsMock,
  dashboard: dashboardMock,
  notifications: notificationsMock,
};
