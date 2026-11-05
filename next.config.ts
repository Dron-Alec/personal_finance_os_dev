import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const isDev = process.env.NODE_ENV === "development";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// No-nonce CSP per node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md.
// connect-src adds Supabase: the browser client talks to it directly for auth/MFA.
// Sentry needs no entry: events go through the same-origin /monitoring tunnel.
// Plaid Link: its script and iframe come from cdn.plaid.com (Plaid's documented CSP).
const csp = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://cdn.plaid.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  connect-src 'self' ${supabaseUrl} ${supabaseUrl.replace(/^http/, "ws")} https://production.plaid.com https://sandbox.plaid.com;
  frame-src https://cdn.plaid.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  ${isDev ? "" : "upgrade-insecure-requests;"}
`.replace(/\s{2,}/g, " ").trim();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

// Source maps upload only when SENTRY_AUTH_TOKEN (+ SENTRY_ORG,
// SENTRY_PROJECT) are set in Vercel; without them the build just skips it.
export default withSentryConfig(nextConfig, {
  tunnelRoute: "/monitoring", // keep in sync with the proxy.ts matcher exclusion
  silent: !process.env.CI,
  telemetry: false,
});
