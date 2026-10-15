// C-11 — NodusGateway: the single interface both the real backend (lib/server-gateway)
// and the FE mocks (mocks/gateway.ts) implement. Owner: BE (FE reviews).
//
// FE reads through `getGateway()` from "@/lib/gateway" (server components)
// and mutates through server actions in "@/lib/actions/*".
import type { AiApi } from "./ai";
import type { AssignmentsApi } from "./assignments";
import type { AuthApi } from "./auth";
import type { CurriculumApi } from "./curriculum";
import type { DashboardApi } from "./dashboard";
import type { GraphApi } from "./graph";
import type { NotesApi } from "./notes";
import type { NotificationsApi } from "./notifications";
import type { ResourcesApi } from "./resources";

export const FEATURES = [
  "auth",
  "curriculum",
  "resources",
  "notes",
  "graph",
  "ai",
  "assignments",
  "dashboard",
  "notifications",
] as const;

export type Feature = (typeof FEATURES)[number];

export type NodusGateway = {
  auth: AuthApi;
  curriculum: CurriculumApi;
  resources: ResourcesApi;
  notes: NotesApi;
  graph: GraphApi;
  ai: AiApi;
  assignments: AssignmentsApi;
  dashboard: DashboardApi;
  notifications: NotificationsApi;
};

export type {
  AiApi,
  AssignmentsApi,
  AuthApi,
  CurriculumApi,
  DashboardApi,
  GraphApi,
  NotesApi,
  NotificationsApi,
  ResourcesApi,
};
