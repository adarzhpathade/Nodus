// Real implementation of NodusGateway (DB, auth checks, AI). Owner: BE.
import "server-only";
import type { NodusGateway } from "@/contracts/gateway";

export const serverGateway: NodusGateway = {
  auth: {},
  curriculum: {},
  resources: {},
  notes: {},
  graph: {},
  ai: {},
  assignments: {},
  dashboard: {},
  notifications: {},
};
