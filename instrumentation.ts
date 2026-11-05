import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry";

export function register() {
  // Same options for the Node.js and Edge runtimes.
  Sentry.init(sentryOptions);
}

// Server Component, route handler, and server action errors.
export const onRequestError = Sentry.captureRequestError;
