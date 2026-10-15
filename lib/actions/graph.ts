"use server";
// Graph reads triggered from the client (clicking a node). The graph itself loads in the server component. Owner: BE.
import { z } from "zod";
import { Id, Section } from "@/contracts/common";
import { getGateway } from "@/lib/gateway";
import { runAction } from "./result";

const UnitIdInput = z.object({ unitId: Id });
const FacultyUnitInput = z.object({ unitId: Id, section: Section });

export async function getStudentSidePanel(input: { unitId: string }) {
  return runAction(UnitIdInput, input, (data) => getGateway().graph.getStudentSidePanel(data.unitId));
}

export async function getUnitProgress(input: { unitId: string }) {
  return runAction(UnitIdInput, input, (data) => getGateway().graph.getUnitProgress(data.unitId));
}

export async function getFacultySidePanel(input: { unitId: string; section: string }) {
  return runAction(FacultyUnitInput, input, (data) => getGateway().graph.getFacultySidePanel(data));
}
