import { parseLocalDate, toDateInputValue } from "@/lib/date-utils";

export type Goal = {
  id: number;
  name: string;
  scope_type: "net_worth" | "account";
  account_id: number | null;
  starting_amount: number;
  target_amount: number;
  target_date: string; // YYYY-MM-DD
  created_at: string;
};

export type GoalProgress = {
  currentValue: number;
  percent: number; // 0+ (uncapped — caller decides whether to clamp for display)
  reached: boolean;
  expectedPace: number; // where the straight-line baseline says you should be today
  variance: number; // currentValue - expectedPace; positive = ahead
  projectedDate: string | null; // null = not on track / just created / already reached
  daysRemaining: number;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_DAY;
}

export function computeGoalProgress(goal: Goal, currentValue: number, today: Date = new Date()): GoalProgress {
  const startDate = new Date(goal.created_at);
  const targetDate = parseLocalDate(goal.target_date);

  const totalDays = daysBetween(startDate, targetDate);
  const elapsedDays = daysBetween(startDate, today);
  const daysRemaining = Math.max(0, Math.round(daysBetween(today, targetDate)));

  const reached = currentValue >= goal.target_amount;
  const percent = goal.target_amount > 0 ? (currentValue / goal.target_amount) * 100 : 0;

  const paceFraction = totalDays > 0 ? Math.min(1, Math.max(0, elapsedDays / totalDays)) : 1;
  const expectedPace = goal.starting_amount + (goal.target_amount - goal.starting_amount) * paceFraction;
  const variance = currentValue - expectedPace;

  let projectedDate: string | null = null;
  if (!reached && elapsedDays > 0) {
    const rate = (currentValue - goal.starting_amount) / elapsedDays; // $/day
    if (rate > 0) {
      const remaining = goal.target_amount - currentValue;
      const daysNeeded = remaining / rate;
      const projected = new Date(today.getTime() + daysNeeded * MS_PER_DAY);
      projectedDate = toDateInputValue(projected);
    }
  }

  return { currentValue, percent, reached, expectedPace, variance, projectedDate, daysRemaining };
}
