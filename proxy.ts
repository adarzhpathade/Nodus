// Route protection + role-based redirects (Next.js 16 "proxy", formerly middleware). Owner: BE.
//  - Signed out on a protected page      → /login
//  - Student without a profile           → /onboarding
//  - Student on /faculty/* or onboarded on /onboarding → /dashboard
//  - Faculty on a student page           → /faculty/dashboard
//  - Signed in on /login or /signup      → their home
// Pages still re-check on the server (guards); this only routes people to the right place.
import { NextResponse, type NextRequest } from "next/server";
import { getAuth, isAuthConfigured, LOGIN_URL } from "@/lib/auth/server";
import { getViewerContext, type ViewerContext } from "@/lib/auth/viewer";
import { isMocked } from "@/lib/gateway";

const AUTH_PAGES = new Set(["/login", "/signup"]);

function homeOf(viewer: ViewerContext): string {
  if (viewer.role === "faculty") return "/faculty/dashboard";
  return viewer.profile ? "/dashboard" : "/onboarding";
}

/** Where this viewer should go instead of `path`, or null if they may stay. */
function roleRedirect(viewer: ViewerContext, path: string): string | null {
  const onFaculty = path === "/faculty" || path.startsWith("/faculty/");
  const onOnboarding = path === "/onboarding" || path.startsWith("/onboarding/");
  if (viewer.role === "faculty") return onFaculty ? null : "/faculty/dashboard";
  if (!viewer.profile) return onOnboarding ? null : "/onboarding";
  return onFaculty || onOnboarding ? "/dashboard" : null;
}

function redirectTo(request: NextRequest, path: string, carry?: NextResponse): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url));
  carry?.cookies.getAll().forEach((cookie) => response.cookies.set(cookie)); // keep refreshed session cookies
  return response;
}

export default async function proxy(request: NextRequest) {
  // While auth is mocked (or not configured), FE can open every page without signing in.
  if (isMocked("auth") || !isAuthConfigured()) return NextResponse.next();

  const path = request.nextUrl.pathname;

  if (AUTH_PAGES.has(path)) {
    const viewer = await getViewerContext().catch(() => null);
    return viewer ? redirectTo(request, homeOf(viewer)) : NextResponse.next();
  }

  const authResponse = await getAuth().middleware({ loginUrl: LOGIN_URL })(request);
  if (authResponse.status >= 300 && authResponse.status < 400) return authResponse; // signed out → login

  const viewer = await getViewerContext().catch(() => null);
  const destination = viewer ? roleRedirect(viewer, path) : null;
  return destination ? redirectTo(request, destination, authResponse) : authResponse;
}

// Only app pages — never /api, static assets or the landing page.
export const config = {
  matcher: [
    "/login",
    "/signup",
    "/onboarding/:path*",
    "/dashboard/:path*",
    "/graph/:path*",
    "/subjects/:path*",
    "/notes/:path*",
    "/assignments/:path*",
    "/tutor/:path*",
    "/practice/:path*",
    "/profile/:path*",
    "/faculty/:path*",
  ],
};
