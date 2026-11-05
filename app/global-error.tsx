"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Last resort when the root layout itself fails. Renders its own document,
// so no globals.css or theme — inline styles that follow the OS scheme.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          colorScheme: "light dark",
          padding: 16,
        }}
      >
        <title>Something went wrong · Candid</title>
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 20 }}>Candid hit an unexpected error</h1>
          <p style={{ opacity: 0.75 }}>We&apos;ve been notified. Try again in a moment.</p>
          <button
            onClick={() => retry()}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid currentColor", background: "none", color: "inherit", cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
