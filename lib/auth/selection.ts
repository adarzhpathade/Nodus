// Top-bar selections stored in cookies: the student's semester, the faculty's subject + section. Owner: BE.
// Reading works anywhere on the server; writing only inside server actions / route handlers.
import "server-only";
import { cookies } from "next/headers";

const STUDENT_SEMESTER = "nodus_semester";
const FACULTY_SELECTION = "nodus_faculty";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 365,
};

export async function readStudentSemester(): Promise<number | null> {
  const value = Number((await cookies()).get(STUDENT_SEMESTER)?.value);
  return Number.isInteger(value) && value >= 1 && value <= 8 ? value : null;
}

export async function writeStudentSemester(semesterNumber: number): Promise<void> {
  (await cookies()).set(STUDENT_SEMESTER, String(semesterNumber), cookieOptions);
}

export async function readFacultySelection(): Promise<{ subjectId: string; section: string } | null> {
  const [subjectId, section] = ((await cookies()).get(FACULTY_SELECTION)?.value ?? "").split(":");
  return subjectId && section ? { subjectId, section } : null;
}

export async function writeFacultySelection(selection: { subjectId: string; section: string }): Promise<void> {
  (await cookies()).set(FACULTY_SELECTION, `${selection.subjectId}:${selection.section}`, cookieOptions);
}
