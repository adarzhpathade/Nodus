// Real implementation of NodusGateway (DB, auth checks, AI). Owner: BE.
// Each feature starts as NOT_IMPLEMENTED and is replaced by a real module as BE-3 … BE-9 land,
// e.g. `notes: notesApi` from "./notes".
import "server-only";
import { unimplementedApi } from "@/contracts/common";
import type { NodusGateway } from "@/contracts/gateway";

export const serverGateway: NodusGateway = {
  auth: unimplementedApi("auth", "real"),
  curriculum: unimplementedApi("curriculum", "real"),
  resources: unimplementedApi("resources", "real"),
  notes: unimplementedApi("notes", "real"),
  graph: unimplementedApi("graph", "real"),
  ai: unimplementedApi("ai", "real"),
  assignments: unimplementedApi("assignments", "real"),
  dashboard: unimplementedApi("dashboard", "real"),
  notifications: unimplementedApi("notifications", "real"),
};
