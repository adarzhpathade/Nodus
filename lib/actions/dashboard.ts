"use server";
// Dashboards (student + faculty). Owner: BE.
import { z } from "zod";
import { Id, SemesterNumber } from "@/contracts/common";
import { getGateway } from "@/lib/gateway";
import { runAction } from "./result";

export async function getStudentDashboard(input: { semesterNumber: number }) {
  return runAction(z.object({ semesterNumber: SemesterNumber }), input, (data) =>
    getGateway().dashboard.getStudentDashboard(data.semesterNumber),
  );
}

export async function getFacultyDashboard(input: { subjectId: string }) {
  return runAction(z.object({ subjectId: Id }), input, (data) =>
    getGateway().dashboard.getFacultyDashboard(data),
  );
}
