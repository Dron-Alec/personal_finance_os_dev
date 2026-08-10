import { parseLocalDate, toDateInputValue } from "@/lib/date-utils";

export type Goal = {
  id: number;
  name: string;
  scope_type: "net_worth" | "account";
  account_id: number | null;
  target_amount: number;
  target_date: string; // YYYY-MM-DD
  created_at: string;
};

export type BalancePoint = { date: string; balance: number };

export type GoalStatus = "met" | "on_track" | "off_track" | "overdue" | "no_data";

/**
 * Nothing here is ever persisted — every field is recomputed from
 * `currentValue` and `balanceHistory` on each call, so a new CSV import or
 * manual balance edit updates progress with zero extra steps and there's
 * never a stale cached value to invalidate.
 */
export type GoalProgress = {
  status: GoalStatus;
  currentValue: number;
  percent: number; // 0+, uncapped — caller decides whether to clamp for display
  monthsRemaining: number; // clamped to 0 when overdue
  /** $/month needed starting *today* to hit the target by the target date. Null once overdue. */
  requiredPaceMonthly: number | null;
  /** Trailing-window average $/month contribution, from real balance history. Null with no usable history. */
  actualPaceMonthly: number | null;
  /** The window actually used — may be less than requested if history doesn't reach back that far. */
  actualPaceWindowMonths: number;
  /** actualPace - requiredPace; positive = contributing faster than needed. */
  variance: number | null;
  /** A projected date is never shown without the pace it assumes. */
  projected: { date: string; assumedPaceMonthly: number } | null;
};

const AVG_DAYS_PER_MONTH = 30.4375;
const MS_PER_MONTH = AVG_DAYS_PER_MONTH * 24 * 60 * 60 * 1000;

export function monthsBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_MONTH;
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getTime() + months * MS_PER_MONTH);
}

// ---------------------------------------------------------------------------
// Deterministic contribution-model helpers — pure functions, no persistence,
// no AI. Used for the live "~$X/mo needed" hint during goal creation
// (reverseSolveFlat) and available for future what-if projections.
// ---------------------------------------------------------------------------

/** Solves the flat monthly contribution needed to go from `current` to
 * `target` over `monthsRemaining` months. Null once there's no time left. */
export function reverseSolveFlat(current: number, target: number, monthsRemaining: number): number | null {
  if (monthsRemaining <= 0) return null;
  return (target - current) / monthsRemaining;
}

/** Balance trajectory under a flat monthly contribution. */
export function flat(startBalance: number, monthlyAmount: number, months: number): number[] {
  const out: number[] = [];
  let bal = startBalance;
  for (let i = 0; i < months; i++) {
    bal += monthlyAmount;
    out.push(bal);
  }
  return out;
}

/** Balance trajectory where the monthly contribution steps up by
 * `annualStepPercent`% every 12 months. */
export function steppedPercent(
  startBalance: number,
  monthlyBase: number,
  annualStepPercent: number,
  months: number,
): number[] {
  const out: number[] = [];
  let bal = startBalance;
  let monthly = monthlyBase;
  for (let i = 0; i < months; i++) {
    if (i > 0 && i % 12 === 0) monthly *= 1 + annualStepPercent / 100;
    bal += monthly;
    out.push(bal);
  }
  return out;
}

/** Balance trajectory for a flat monthly contribution plus a one-time lump
 * sum landing in a specific 1-indexed month. */
export function lumpPlusFlat(
  startBalance: number,
  monthlyAmount: number,
  lumpAmount: number,
  lumpMonth: number,
  months: number,
): number[] {
  const out: number[] = [];
  let bal = startBalance;
  for (let i = 1; i <= months; i++) {
    bal += monthlyAmount;
    if (i === lumpMonth) bal += lumpAmount;
    out.push(bal);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Goal progress
// ---------------------------------------------------------------------------

export function computeGoalProgress(
  goal: Pick<Goal, "target_amount" | "target_date">,
  currentValue: number,
  balanceHistory: BalancePoint[],
  options: { trailingWindowMonths?: number; today?: Date } = {},
): GoalProgress {
  const today = options.today ?? new Date();
  const requestedWindow = options.trailingWindowMonths ?? 3;
  const targetDate = parseLocalDate(goal.target_date);

  const percent = goal.target_amount > 0 ? (currentValue / goal.target_amount) * 100 : 0;
  const rawMonthsRemaining = monthsBetween(today, targetDate);
  const monthsRemaining = Math.max(0, rawMonthsRemaining);

  if (currentValue >= goal.target_amount) {
    return {
      status: "met",
      currentValue,
      percent,
      monthsRemaining,
      requiredPaceMonthly: null,
      actualPaceMonthly: null,
      actualPaceWindowMonths: 0,
      variance: null,
      projected: null,
    };
  }

  const requiredPaceMonthly = reverseSolveFlat(currentValue, goal.target_amount, rawMonthsRemaining);

  // Trailing-window actual pace from real balance history: walk back to the
  // latest point at or before (today - window); if history doesn't reach
  // back that far, fall back to the oldest point available and use
  // whatever span that actually spans instead of failing outright.
  const sorted = [...balanceHistory].sort((a, b) => (a.date < b.date ? -1 : 1));
  let actualPaceMonthly: number | null = null;
  let actualPaceWindowMonths = 0;
  if (sorted.length > 0) {
    const windowStart = addMonths(today, -requestedWindow);
    let referenceIndex = -1;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (parseLocalDate(sorted[i].date) <= windowStart) {
        referenceIndex = i;
        break;
      }
    }
    const reference = sorted[referenceIndex >= 0 ? referenceIndex : 0];
    const usedWindow = monthsBetween(parseLocalDate(reference.date), today);
    if (usedWindow > 0.1) {
      actualPaceMonthly = (currentValue - reference.balance) / usedWindow;
      actualPaceWindowMonths = usedWindow;
    }
  }

  const variance =
    actualPaceMonthly !== null && requiredPaceMonthly !== null ? actualPaceMonthly - requiredPaceMonthly : null;

  let projected: GoalProgress["projected"] = null;
  if (actualPaceMonthly !== null && actualPaceMonthly > 0) {
    const monthsNeeded = (goal.target_amount - currentValue) / actualPaceMonthly;
    projected = {
      date: toDateInputValue(addMonths(today, monthsNeeded)),
      assumedPaceMonthly: actualPaceMonthly,
    };
  }

  let status: GoalStatus;
  if (rawMonthsRemaining <= 0) status = "overdue";
  else if (actualPaceMonthly === null) status = "no_data";
  else if (variance !== null && variance >= 0) status = "on_track";
  else status = "off_track";

  return {
    status,
    currentValue,
    percent,
    monthsRemaining,
    requiredPaceMonthly,
    actualPaceMonthly,
    actualPaceWindowMonths,
    variance,
    projected,
  };
}
