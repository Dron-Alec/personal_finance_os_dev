"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Catches render/data errors in any signed-in page; the header and nav
// (app/(app)/layout.tsx) stay up so the user can move on.
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Something went wrong</CardTitle>
        <CardDescription>
          This page hit an unexpected error and we&apos;ve been notified. Try again, or head back
          to Data Entry.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Button onClick={() => retry()}>Try again</Button>
          <Link href="/data-entry" className={buttonVariants({ variant: "outline" })}>
            Go to Data Entry
          </Link>
        </div>
        {digest && <p className="text-xs text-muted-foreground">Error reference: {digest}</p>}
      </CardContent>
    </Card>
  );
}
