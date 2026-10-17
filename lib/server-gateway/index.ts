// Real implementation of NodusGateway (DB, auth checks, AI). Owner: BE.
// Features not built yet throw NOT_IMPLEMENTED; each is replaced by a real module as BE-3 … BE-9 land.
import "server-only";
import { unimplementedApi } from "@/contracts/common";
import type { NodusGateway } from "@/contracts/gateway";
import { authApi } from "./auth";
import { curriculumApi } from "./curriculum";
import { graphApi } from "./graph";
import { notesApi } from "./notes";
import { resourcesApi } from "./resources";
import { aiApi } from "./ai";

export const serverGateway: NodusGateway = {
  auth: authApi, // BE-3.4 / 3.5
  curriculum: curriculumApi, // reads BE-3.6 · faculty edits BE-4.1/4.2
  resources: resourcesApi, // BE-4.3 … 4.8
  notes: notesApi, // BE-5.1 … 5.5, BE-5.7
  graph: graphApi, // BE-6.1 … 6.5, BE-6.7
  ai: aiApi, // BE-7.1 … BE-7.10
  assignments: unimplementedApi("assignments", "real"),
  dashboard: unimplementedApi("dashboard", "real"),
  notifications: unimplementedApi("notifications", "real"),
};
