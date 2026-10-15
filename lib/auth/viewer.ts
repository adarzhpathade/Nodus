// Resolves the signed-in user once per request: Neon Auth session → app user → role-specific profile. Owner: BE.
import "server-only";
import { cache } from "react";
import { getAuth } from "@/lib/auth/server";
import { ensureUser, findUserWithProfile, listTeaching, type UserRow } from "@/lib/db/queries/users";

type BranchRow = { id: string; code: string; name: string; sections: string[] };
type TeachingRow = Awaited<ReturnType<typeof listTeaching>>[number];

export type StudentContext = {
  role: "student";
  user: UserRow;
  /** Null until onboarding is complete. */
  profile: { branch: BranchRow; currentSemester: number; section: string } | null;
};

export type FacultyContext = {
  role: "faculty";
  user: UserRow;
  teaching: TeachingRow[];
  /** Branch of the subjects they teach (null if not assigned yet). */
  branch: BranchRow | null;
};

export type ViewerContext = StudentContext | FacultyContext;

/** Null when signed out. Creates the app user (as a student) on first sign-in. */
export const getViewerContext = cache(async (): Promise<ViewerContext | null> => {
  const { data } = await getAuth().getSession();
  const sessionUser = data?.user;
  if (!sessionUser) return null;

  let found = await findUserWithProfile(sessionUser.id);
  if (!found) {
    await ensureUser({
      id: sessionUser.id,
      email: sessionUser.email,
      name: sessionUser.name,
      image: sessionUser.image ?? null,
    });
    found = await findUserWithProfile(sessionUser.id);
  }
  if (!found) return null;

  if (found.user.role === "faculty") {
    const teaching = await listTeaching(found.user.id);
    return { role: "faculty", user: found.user, teaching, branch: teaching[0]?.branch ?? null };
  }

  return {
    role: "student",
    user: found.user,
    profile:
      found.profile && found.branch
        ? { branch: found.branch, currentSemester: found.profile.currentSemester, section: found.profile.section }
        : null,
  };
});
