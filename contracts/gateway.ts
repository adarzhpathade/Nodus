// NodusGateway — the single interface both the real backend and the FE mocks implement.
// Owner: BE (FE reviews). Each feature API is filled in during the contract sprint (BE-1.x).

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

// Placeholder APIs — replaced by real method signatures in BE-1.2 … BE-1.9.
export type AuthApi = Record<string, never>;
export type CurriculumApi = Record<string, never>;
export type ResourcesApi = Record<string, never>;
export type NotesApi = Record<string, never>;
export type GraphApi = Record<string, never>;
export type AiApi = Record<string, never>;
export type AssignmentsApi = Record<string, never>;
export type DashboardApi = Record<string, never>;
export type NotificationsApi = Record<string, never>;

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
