import { parseLocalDate, toDateInputValue } from "@/lib/date-utils";

export type ContributionModel = "flat" | "growing" | "lump_flat";

/** Only the fields relevant to `contribution_model` are ever read; the rest
 * sit unused. `growthRateAnnual` applies under every model — it's an
 * assumed investment return, orthogonal to the contribution schedule. */
export type ContributionParams = {
  monthlyAmount?: number;
  annualStepPercent?: number;
  lumpAmount?: number;
  lumpMonth?: number;
  growthRateAnnual?: number;
};

export type Goal = {
  id: number;
  name: string;
  scope_type: "net_worth" | "account";
  account_id: number | null;
  target_amount: number;
  target_date: string; // YYYY-MM-DD
  contribution_model: ContributionModel | null;
  contribution_params: ContributionParams;
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
// (reverseSolveFlat) and to project each goal's benchmark curve on the
// charts (projectGoalCurve, below).
//
// `annualGrowthRate` (a %, e.g. 7 for 7%/yr) is optional on every helper —
// it compounds monthly on the balance *before* that month's contribution is
// added, same convention throughout so curves stay comparable.
// ---------------------------------------------------------------------------

function monthlyRateFromAnnual(annualGrowthRate: number): number {
  return Math.pow(1 + annualGrowthRate / 100, 1 / 12) - 1;
}

/** Solves the flat monthly contribution needed to go from `current` to
 * `target` over `monthsRemaining` months, optionally assuming the balance
 * also compounds at `annualGrowthRate`%/yr. Null once there's no time left. */
export function reverseSolveFlat(
  current: number,
  target: number,
  monthsRemaining: number,
  annualGrowthRate = 0,
): number | null {
  if (monthsRemaining <= 0) return null;
  if (annualGrowthRate === 0) return (target - current) / monthsRemaining;
  const r = monthlyRateFromAnnual(annualGrowthRate);
  const growth = Math.pow(1 + r, monthsRemaining);
  const annuityFactor = (growth - 1) / r;
  if (annuityFactor === 0) return (target - current) / monthsRemaining;
  return (target - current * growth) / annuityFactor;
}

/** Balance trajectory under a flat monthly contribution. */
export function flat(startBalance: number, monthlyAmount: number, months: number, annualGrowthRate = 0): number[] {
  const out: number[] = [];
  const r = monthlyRateFromAnnual(annualGrowthRate);
  let bal = startBalance;
  for (let i = 0; i < months; i++) {
    bal = bal * (1 + r) + monthlyAmount;
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
  annualGrowthRate = 0,
): number[] {
  const out: number[] = [];
  const r = monthlyRateFromAnnual(annualGrowthRate);
  let bal = startBalance;
  let monthly = monthlyBase;
  for (let i = 0; i < months; i++) {
    if (i > 0 && i % 12 === 0) monthly *= 1 + annualStepPercent / 100;
    bal = bal * (1 + r) + monthly;
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
  annualGrowthRate = 0,
): number[] {
  const out: number[] = [];
  const r = monthlyRateFromAnnual(annualGrowthRate);
  let bal = startBalance;
  for (let i = 1; i <= months; i++) {
    bal = bal * (1 + r) + monthlyAmount;
    if (i === lumpMonth) bal += lumpAmount;
    out.push(bal);
  }
  return out;
}

/** Projects a goal's benchmark trajectory from today's balance to its
 * target date using its stored contribution model + params. Returns [] for
 * goals with no contribution plan (they fall back to a flat target line —
 * see GoalLine) or with nothing left to project. */
export function projectGoalCurve(
  goal: Pick<Goal, "target_date" | "contribution_model" | "contribution_params">,
  currentBalance: number,
  today: Date = new Date(),
): BalancePoint[] {
  if (!goal.contribution_model) return [];
  const months = Math.ceil(monthsBetween(today, parseLocalDate(goal.target_date)));
  if (months <= 0) return [];

  const p = goal.contribution_params ?? {};
  const growthRate = p.growthRateAnnual ?? 0;
  let series: number[];
  switch (goal.contribution_model) {
    case "flat":
      series = flat(currentBalance, p.monthlyAmount ?? 0, months, growthRate);
      break;
    case "growing":
      series = steppedPercent(currentBalance, p.monthlyAmount ?? 0, p.annualStepPercent ?? 0, months, growthRate);
      break;
    case "lump_flat":
      series = lumpPlusFlat(currentBalance, p.monthlyAmount ?? 0, p.lumpAmount ?? 0, p.lumpMonth ?? 1, months, growthRate);
      break;
    default:
      return [];
  }

  return series.map((balance, i) => ({ date: toDateInputValue(addMonths(today, i + 1)), balance }));
}

// ---------------------------------------------------------------------------
// Goal progress
// ---------------------------------------------------------------------------

export function computeGoalProgress(
  goal: Pick<Goal, "target_amount" | "target_date"> & Partial<Pick<Goal, "contribution_params">>,
  currentValue: number,
  balanceHistory: BalancePoint[],
  options: { trailingWindowMonths?: number; today?: Date } = {},
): GoalProgress {
  const today = options.today ?? new Date();
  const requestedWindow = options.trailingWindowMonths ?? 3;
  const targetDate = parseLocalDate(goal.target_date);
  const assumedGrowthRate = goal.contribution_params?.growthRateAnnual ?? 0;

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

  const requiredPaceMonthly = reverseSolveFlat(
    currentValue,
    goal.target_amount,
    rawMonthsRemaining,
    assumedGrowthRate,
  );

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
