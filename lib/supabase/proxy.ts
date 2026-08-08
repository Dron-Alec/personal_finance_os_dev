import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

const PUBLIC_PATHS = new Set(["/login", "/signup"]);
const MFA_ENROLL_PATH = "/mfa/enroll";
const MFA_CHALLENGE_PATH = "/mfa/challenge";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: do not run any logic between createServerClient and
  // getUser() — it refreshes the session token and must run on every
  // request for auth to work reliably. Use getUser() (not getSession())
  // because it revalidates the JWT against the Auth server instead of
  // trusting a cookie-decoded, potentially-stale value.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.has(pathname);

  if (!user) {
    if (!isPublicPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Logged in. Determine MFA state — enrollment is mandatory before any
  // app data is reachable.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const hasEnrolledFactor = aal?.nextLevel === "aal2";
  const hasCompletedChallenge = aal?.currentLevel === "aal2";

  if (!hasEnrolledFactor) {
    if (pathname !== MFA_ENROLL_PATH) {
      const url = request.nextUrl.clone();
      url.pathname = MFA_ENROLL_PATH;
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (!hasCompletedChallenge) {
    if (pathname !== MFA_CHALLENGE_PATH) {
      const url = request.nextUrl.clone();
      url.pathname = MFA_CHALLENGE_PATH;
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Fully authenticated with MFA satisfied — keep them out of auth pages.
  if (isPublicPath || pathname === MFA_ENROLL_PATH || pathname === MFA_CHALLENGE_PATH) {
    const url = request.nextUrl.clone();
    url.pathname = "/data-entry";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
