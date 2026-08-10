"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ContributionModel, ContributionParams } from "@/lib/goals";

const saveSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  scopeType: z.enum(["net_worth", "account"]),
  accountId: z.coerce.number().optional(),
  targetAmount: z.coerce.number().positive("Target amount must be greater than 0."),
  targetDate: z.string().min(1, "Target date is required."),
  contributionModel: z.enum(["flat", "growing", "lump_flat"]).optional(),
  monthlyAmount: z.coerce.number().optional(),
  annualStepPercent: z.coerce.number().optional(),
  lumpAmount: z.coerce.number().optional(),
  lumpMonth: z.coerce.number().int().optional(),
  growthRateAnnual: z.coerce.number().optional(),
});

export type SaveGoalResult = { error: string } | { error?: undefined };

function buildContributionParams(
  model: ContributionModel | undefined,
  data: z.infer<typeof saveSchema>,
): ContributionParams {
  if (!model) return {};
  const params: ContributionParams = {};
  if (data.growthRateAnnual) params.growthRateAnnual = data.growthRateAnnual;
  if (model === "flat") {
    params.monthlyAmount = data.monthlyAmount ?? 0;
  } else if (model === "growing") {
    params.monthlyAmount = data.monthlyAmount ?? 0;
    params.annualStepPercent = data.annualStepPercent ?? 0;
  } else if (model === "lump_flat") {
    params.monthlyAmount = data.monthlyAmount ?? 0;
    params.lumpAmount = data.lumpAmount ?? 0;
    params.lumpMonth = data.lumpMonth ?? 1;
  }
  return params;
}

export async function saveGoal(_prevState: SaveGoalResult, formData: FormData): Promise<SaveGoalResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = saveSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { name, scopeType, accountId, targetAmount, targetDate, contributionModel } = parsed.data;

  if (scopeType === "account" && !accountId) {
    return { error: "Pick an account for an account-scoped goal." };
  }

  // No starting-balance lookup needed — progress is always computed live
  // from current balances + history (lib/goals.ts), never from a value
  // frozen at creation time. The contribution plan is optional: goals
  // without one just don't get a projected benchmark curve on the charts.
  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    name,
    scope_type: scopeType,
    account_id: scopeType === "account" ? accountId : null,
    target_amount: targetAmount,
    target_date: targetDate,
    contribution_model: contributionModel ?? null,
    contribution_params: buildContributionParams(contributionModel, parsed.data),
  });
  if (error) return { error: error.message };

  revalidatePath("/net-worth");
  revalidatePath("/accounts");
  return {};
}

export async function removeGoal(goalId: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", goalId);
  if (error) throw new Error(error.message);

  revalidatePath("/net-worth");
  revalidatePath("/accounts");
}
