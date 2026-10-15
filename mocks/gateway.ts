// Mock implementation of NodusGateway with fixture data. Owner: FE (FE-1.10).
// Placeholder from contract v1 (BE): every method throws NOT_IMPLEMENTED until FE replaces
// each feature with a real mock, e.g. `notes: notesMock` from "./notes".
import { unimplementedApi } from "@/contracts/common";
import type { NodusGateway } from "@/contracts/gateway";

export const mockGateway: NodusGateway = {
  auth: unimplementedApi("auth", "mock"),
  curriculum: unimplementedApi("curriculum", "mock"),
  resources: unimplementedApi("resources", "mock"),
  notes: unimplementedApi("notes", "mock"),
  graph: unimplementedApi("graph", "mock"),
  ai: unimplementedApi("ai", "mock"),
  assignments: unimplementedApi("assignments", "mock"),
  dashboard: unimplementedApi("dashboard", "mock"),
  notifications: unimplementedApi("notifications", "mock"),
};
