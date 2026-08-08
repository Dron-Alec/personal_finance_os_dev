// Validated categorical palette (light mode) — fixed hue order, never cycled.
// See the dataviz skill's references/palette.md for the CVD-safety rationale
// behind this exact order.
export const CATEGORICAL_PALETTE = [
  "#2a78d6", // 1 blue
  "#eb6834", // 2 orange
  "#1baf7a", // 3 aqua
  "#eda100", // 4 yellow
  "#e87ba4", // 5 magenta
  "#008300", // 6 green
  "#4a3aa7", // 7 violet
  "#e34948", // 8 red
] as const;

// Overflow beyond 8 series folds into this shared muted tone rather than
// cycling the categorical hues (each item stays its own labeled slice/bar —
// only the fill color is shared).
export const OTHER_COLOR = "#898781";

export const TARGET_LINE_COLOR = "#898781"; // reference line, not a data series
export const DELTA_GOOD_COLOR = "#006300";
export const DELTA_BAD_COLOR = "#d03b3b";

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
