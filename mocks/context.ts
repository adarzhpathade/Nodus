// Request context for mock APIs: who is signed in, permission guards, latency, errors.
//
// Pick the mock user with the `nodus-mock-role` cookie:
//   student (default) · faculty · new-student (needs onboarding) · signed-out
// Env knobs: MOCK_LATENCY_MS (extra delay on every call), MOCK_AI_ERROR=RATE_LIMITED|AI_UNAVAILABLE.
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { FacultyProfile, SessionUser, StudentProfile } from "@/contracts/auth";
import { GatewayError, type ErrorCode } from "@/contracts/common";
import { DEMO_FACULTY, DEMO_STUDENT, NEW_STUDENT } from "./fixtures/people";
import { getStore, type MockStore } from "./store";

export const MOCK_ROLE_COOKIE = "nodus-mock-role";
export type MockRole = "student" | "faculty" | "new-student" | "signed-out";

/** Set by scripts that exercise the mocks outside a Next.js request. */
const outsideNext = process.env.NODUS_MOCK_SCRIPT === "1";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Start of every mock method. `connection()` marks the render as request-time (cacheComponents),
 * because mock data depends on the current date and the in-memory session state.
 */
export async function mockRequest(extraLatencyMs = 0): Promise<MockStore> {
  if (!outsideNext) await connection();
  const latency = Number(process.env.MOCK_LATENCY_MS ?? 0) + extraLatencyMs;
  if (latency > 0) await sleep(latency);
  return getStore();
}

export async function mockRole(): Promise<MockRole> {
  const value = outsideNext ? process.env.NODUS_MOCK_ROLE : (await cookies()).get(MOCK_ROLE_COOKIE)?.value;
  return value === "faculty" || value === "new-student" || value === "signed-out" ? value : "student";
}

export const fail = (code: ErrorCode, message: string, extra?: ConstructorParameters<typeof GatewayError>[2]) =>
  new GatewayError(code, message, extra);

export const clone = <T>(value: T): T => structuredClone(value);

export type StudentActor = { role: "student"; user: SessionUser; profile: StudentProfile | null };
export type FacultyActor = { role: "faculty"; user: SessionUser; profile: FacultyProfile };
export type Actor = StudentActor | FacultyActor;

function withName(store: MockStore, user: SessionUser): SessionUser {
  const name = store.names.get(user.id);
  return name ? { ...user, name } : user;
}

export async function currentActor(store: MockStore): Promise<Actor | null> {
  switch (await mockRole()) {
    case "signed-out":
      return null;
    case "faculty":
      return { role: "faculty", user: withName(store, DEMO_FACULTY.user), profile: DEMO_FACULTY.profile };
    case "new-student":
      return { role: "student", user: withName(store, NEW_STUDENT), profile: store.onboarded.get(NEW_STUDENT.id) ?? null };
    default:
      return { role: "student", user: withName(store, DEMO_STUDENT.user), profile: DEMO_STUDENT.profile };
  }
}

export async function requireActor(store: MockStore): Promise<Actor> {
  const actor = await currentActor(store);
  if (!actor) throw fail("UNAUTHENTICATED", "Please sign in.");
  return actor;
}

/** Signed-in, onboarded student. */
export async function requireStudent(store: MockStore): Promise<{ user: SessionUser; profile: StudentProfile }> {
  const actor = await requireActor(store);
  if (actor.role !== "student") throw fail("FORBIDDEN", "Only students can do this.");
  if (!actor.profile) throw fail("FORBIDDEN", "Complete onboarding first.");
  return { user: actor.user, profile: actor.profile };
}

export async function requireFaculty(store: MockStore): Promise<FacultyActor> {
  const actor = await requireActor(store);
  if (actor.role !== "faculty") throw fail("FORBIDDEN", "Only faculty can do this.");
  return actor;
}

/** Faculty must teach the subject (and the section, when given). */
export function assertTeaches(faculty: FacultyActor, subjectId: string, section?: string) {
  const teaching = faculty.profile.teaches.find((t) => t.subjectId === subjectId);
  if (!teaching || (section && !teaching.sections.includes(section))) {
    throw fail("FORBIDDEN", "You don't teach this subject or section.");
  }
  return teaching;
}

/** Optional forced AI failure for building error states (FE-7.9). */
export function maybeFailAi() {
  const forced = process.env.MOCK_AI_ERROR;
  if (forced === "RATE_LIMITED") {
    throw fail("RATE_LIMITED", "The AI is busy right now (free-tier limit). Try again in a minute.", { retryAfterSeconds: 60 });
  }
  if (forced === "AI_UNAVAILABLE") throw fail("AI_UNAVAILABLE", "The AI service is unavailable right now.");
}
