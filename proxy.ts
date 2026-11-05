import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // monitoring = Sentry tunnel, api/health = uptime check: neither needs a
    // session, and both must not be redirected to /login.
    "/((?!_next/static|_next/image|favicon.ico|monitoring|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
