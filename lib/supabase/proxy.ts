import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

const PUBLIC_PATHS = new Set(["/login", "/signup", "/forgot-password"]);
const MFA_ENROLL_PATH = "/mfa/enroll";
const MFA_CHALLENGE_PATH = "/mfa/challenge";
const ONBOARDING_PATH = "/onboarding";
// Unlike PUBLIC_PATHS (exact-match, redirects away once fully
// authenticated), these two must stay reachable both logged-out and
// logged-in: /invite/[token] branches on auth state itself, and
// /reset-password is reached via a Supabase recovery-link session that
// establishes itself client-side (detectSessionInUrl), so the very first
// server request may still see no user. Once authenticated, both still flow
// through the normal MFA/onboarding gates below like any other route —
// /reset-password deliberately does NOT bypass MFA (email-link possession
// alone shouldn't be enough to change a password on an MFA-protected
// account) and reuses the existing redirect-param bounce-and-return.
const INVITE_PATH_PREFIX = "/invite/";
const NO_USER_EXEMPT_PATHS = new Set(["/reset-password"]);
// Static content that should never be gated by auth/MFA/onboarding at all,
// in either direction.
const STATIC_CONTENT_PATHS = new Set(["/privacy", "/terms"]);

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

  const { pathname, search } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.has(pathname);
  const isInvitePath = pathname.startsWith(INVITE_PATH_PREFIX);
  const isStaticContentPath = STATIC_CONTENT_PATHS.has(pathname);

  if (isStaticContentPath) {
    return supabaseResponse;
  }

  if (!user) {
    if (!isPublicPath && !isInvitePath && !NO_USER_EXEMPT_PATHS.has(pathname)) {
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
      url.search = `?redirect=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (!hasCompletedChallenge) {
    if (pathname !== MFA_CHALLENGE_PATH) {
      const url = request.nextUrl.clone();
      url.pathname = MFA_CHALLENGE_PATH;
      url.search = `?redirect=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // MFA satisfied — one-time bank/account setup step before any app data.
  // Skippable (lib/actions/onboarding.ts's skipOnboarding still sets
  // onboarded_at), so this only ever fires once per user.
  const { data: settings } = await supabase
    .from("user_settings")
    .select("onboarded_at")
    .maybeSingle();
  const isOnboarded = !!settings?.onboarded_at;

  if (!isOnboarded) {
    if (pathname !== ONBOARDING_PATH) {
      const url = request.nextUrl.clone();
      url.pathname = ONBOARDING_PATH;
      url.search = `?redirect=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Fully authenticated with MFA + onboarding satisfied — keep them out of
  // auth pages.
  if (
    isPublicPath ||
    pathname === MFA_ENROLL_PATH ||
    pathname === MFA_CHALLENGE_PATH ||
    pathname === ONBOARDING_PATH
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/data-entry";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
