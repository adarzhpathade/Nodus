// Route protection (Next.js 16 "proxy", formerly middleware). Owner: BE.
// Role-based redirects (student vs faculty) are added in BE-3.3.
import { NextResponse, type NextRequest } from "next/server";
import { getAuth, isAuthConfigured, LOGIN_URL } from "@/lib/auth/server";
import { isMocked } from "@/lib/gateway";

export default async function proxy(request: NextRequest) {
  // While auth is mocked (or not configured yet), let FE work on every page without signing in.
  if (isMocked("auth") || !isAuthConfigured()) return NextResponse.next();
  return getAuth().middleware({ loginUrl: LOGIN_URL })(request);
}

// Only protected pages — never match /login, /signup, /api/auth or static assets.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/graph/:path*",
    "/subjects/:path*",
    "/notes/:path*",
    "/assignments/:path*",
    "/tutor/:path*",
    "/practice/:path*",
    "/profile/:path*",
    "/onboarding/:path*",
    "/faculty/:path*",
  ],
};
