import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AcceptInviteButton } from "@/components/invite/accept-invite-button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Reachable both logged-out and logged-in (see INVITE_PATH_PREFIX in
// lib/supabase/proxy.ts). No invite details are previewed here — the
// household_invites row isn't readable by the accepting user before
// acceptance (RLS), so validation happens entirely inside the
// accept_household_invite RPC when the Accept button is used.
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const redirectTarget = `/invite/${token}`;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Household invite</CardTitle>
          <CardDescription>
            You&apos;ve been invited to link households on Candid — a shared, category-level
            view of spending and net worth. Your individual transactions are never shared,
            even once linked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <AcceptInviteButton token={token} />
          ) : (
            <div className="flex flex-col gap-3">
              <Link
                href={`/signup?redirect=${encodeURIComponent(redirectTarget)}`}
                className={buttonVariants({ className: "w-full" })}
              >
                Sign up to accept
              </Link>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href={`/login?redirect=${encodeURIComponent(redirectTarget)}`} className="underline">
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
