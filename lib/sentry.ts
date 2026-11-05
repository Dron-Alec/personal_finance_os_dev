// Shared by instrumentation.ts (server/edge) and instrumentation-client.ts.
// Errors only: no tracing, no session replay — Candid's pages are full of
// balances and transactions, and none of it should leave the app.

type Scrubbable = { request?: { data?: unknown; cookies?: unknown; query_string?: unknown; headers?: unknown } };

// Request bodies carry CSV contents and form values; cookies carry the
// Supabase session. Drop them all before anything is sent.
function scrub<E extends Scrubbable>(event: E): E {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.query_string;
    delete event.request.headers;
  }
  return event;
}

export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, // unset (local dev, CI) = Sentry is off
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend: scrub,
};
