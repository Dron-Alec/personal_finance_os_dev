// Validated categorical palette — fixed hue order, never cycled. Values are
// CSS custom properties (defined for both light and dark in globals.css, per
// the dataviz skill's references/palette.md) so every chart repaints on
// theme toggle for free, with no JS/context involved: the browser resolves
// var() in SVG fill/stroke attributes same as any other CSS property.
export const CATEGORICAL_PALETTE = [
  "var(--chart-series-1)", // blue
  "var(--chart-series-2)", // orange
  "var(--chart-series-3)", // aqua
  "var(--chart-series-4)", // yellow
  "var(--chart-series-5)", // magenta
  "var(--chart-series-6)", // green
  "var(--chart-series-7)", // violet
  "var(--chart-series-8)", // red
] as const;

// Overflow beyond 8 series folds into this shared muted tone rather than
// cycling the categorical hues (each item stays its own labeled slice/bar —
// only the fill color is shared).
export const OTHER_COLOR = "var(--chart-other)";

export const TARGET_LINE_COLOR = "var(--chart-target)"; // reference line, not a data series
export const DELTA_GOOD_COLOR = "var(--chart-delta-good)";
export const DELTA_BAD_COLOR = "var(--chart-delta-bad)";

// Chart chrome — gridlines, axis ticks/labels, baseline — also theme-aware.
export const GRID_COLOR = "var(--chart-grid)";
export const AXIS_COLOR = "var(--chart-axis)";
export const BASELINE_COLOR = "var(--chart-baseline)";

// Fixed name -> slot assignment for the app's known spending categories, so
// a category's color never changes as filters change which categories are
// present. Categories outside this list (custom user categories, or the
// literal "Other" bucket from categorization) share OTHER_COLOR.
const CATEGORY_COLOR_ORDER = [
  "Groceries",
  "Dining",
  "Transportation",
  "Shopping",
  "Subscriptions",
  "Utilities",
  "Health & Fitness",
  "Rent / Housing",
] as const;

const CATEGORY_COLOR_MAP: Record<string, string> = Object.fromEntries(
  CATEGORY_COLOR_ORDER.map((name, i) => [name, CATEGORICAL_PALETTE[i]]),
);

export function getCategoryColor(category: string): string {
  return CATEGORY_COLOR_MAP[category] ?? OTHER_COLOR;
}

const ACCOUNT_TYPE_COLOR_ORDER = [
  "Checking",
  "Savings",
  "Brokerage / Stocks",
  "401k",
  "Roth IRA",
  "Crypto",
  "Credit Card",
  "Traditional IRA",
] as const;

const ACCOUNT_TYPE_COLOR_MAP: Record<string, string> = Object.fromEntries(
  ACCOUNT_TYPE_COLOR_ORDER.map((name, i) => [name, CATEGORICAL_PALETTE[i]]),
);

export function getAccountTypeColor(type: string): string {
  return ACCOUNT_TYPE_COLOR_MAP[type] ?? OTHER_COLOR;
}

/** Stable per-account color: first 8 accounts (by id, i.e. creation order)
 * get their own hue; the rest share OTHER_COLOR. `sortedIds` must be the
 * full account id list sorted ascending so the mapping is stable across
 * re-renders regardless of iteration order. */
export function getAccountColor(accountId: number, sortedIds: number[]): string {
  const idx = sortedIds.indexOf(accountId);
  return idx >= 0 && idx < CATEGORICAL_PALETTE.length ? CATEGORICAL_PALETTE[idx] : OTHER_COLOR;
}
