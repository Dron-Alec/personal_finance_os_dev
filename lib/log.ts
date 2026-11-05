import * as Sentry from "@sentry/nextjs";

type Level = "info" | "warn" | "error";
type Fields = Record<string, string | number | boolean | null>;

/**
 * One JSON line per event on stdout — Vercel's runtime logs keep it
 * searchable by `event`. warn/error also go to Sentry with `fields` as tags,
 * so you can alert on them (e.g. `parse.no_rows` grouped by `format`).
 *
 * Server-side only. Fields must never carry user data: no descriptions,
 * amounts, emails, file contents — ids, counts, and format names only.
 */
export function log(level: Level, event: string, fields: Fields = {}) {
  const line = JSON.stringify({ level, event, ...fields });
  if (level === "info") console.log(line);
  else if (level === "warn") console.warn(line);
  else console.error(line);

  if (level !== "info") {
    Sentry.captureMessage(event, { level: level === "warn" ? "warning" : "error", tags: fields });
  }
}
