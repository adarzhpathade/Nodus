// Real implementation of NodusGateway (DB, auth checks, AI). Owner: BE.
// Features not built yet throw NOT_IMPLEMENTED; each is replaced by a real module as BE-3 … BE-9 land.
import "server-only";
import { unimplementedApi } from "@/contracts/common";
import type { NodusGateway } from "@/contracts/gateway";
import { authApi } from "./auth";
import { curriculumApi } from "./curriculum";
import { resourcesApi } from "./resources";

export const serverGateway: NodusGateway = {
  auth: authApi, // BE-3.4 / 3.5
  curriculum: curriculumApi, // reads BE-3.6 · faculty edits BE-4.1/4.2
  resources: resourcesApi, // BE-4.3 … 4.8
  notes: unimplementedApi("notes", "real"),
  graph: unimplementedApi("graph", "real"),
  ai: unimplementedApi("ai", "real"),
  assignments: unimplementedApi("assignments", "real"),
  dashboard: unimplementedApi("dashboard", "real"),
  notifications: unimplementedApi("notifications", "real"),
};
