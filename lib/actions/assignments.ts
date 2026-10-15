"use server";
// Assignments (offline submission — faculty marks status). Owner: BE.
import { z } from "zod";
import {
  AssignmentIdInput,
  BulkMarkInput,
  CreateAssignmentInput,
  MarkStudentInput,
  UpdateAssignmentInput,
} from "@/contracts/assignments";
import { Id, Section } from "@/contracts/common";
import { getGateway } from "@/lib/gateway";
import { runAction } from "./result";

export async function createAssignment(input: CreateAssignmentInput) {
  return runAction(CreateAssignmentInput, input, (data) => getGateway().assignments.createAssignment(data));
}

export async function updateAssignment(input: UpdateAssignmentInput) {
  return runAction(UpdateAssignmentInput, input, (data) => getGateway().assignments.updateAssignment(data));
}

export async function deleteAssignment(input: AssignmentIdInput) {
  return runAction(AssignmentIdInput, input, (data) => getGateway().assignments.deleteAssignment(data));
}

export async function markStudent(input: MarkStudentInput) {
  return runAction(MarkStudentInput, input, (data) => getGateway().assignments.markStudent(data));
}

export async function bulkMark(input: BulkMarkInput) {
  return runAction(BulkMarkInput, input, (data) => getGateway().assignments.bulkMark(data));
}

/** Switch section inside the marking page without a full reload. */
export async function getMarkingSheet(input: { assignmentId: string; section: string }) {
  return runAction(z.object({ assignmentId: Id, section: Section }), input, (data) =>
    getGateway().assignments.getMarkingSheet(data),
  );
}
