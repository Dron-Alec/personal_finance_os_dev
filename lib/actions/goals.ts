"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const saveSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  scopeType: z.enum(["net_worth", "account"]),
  accountId: z.coerce.number().optional(),
  targetAmount: z.coerce.number().positive("Target amount must be greater than 0."),
  targetDate: z.string().min(1, "Target date is required."),
});

export type SaveGoalResult = { error: string } | { error?: undefined };

export async function saveGoal(_prevState: SaveGoalResult, formData: FormData): Promise<SaveGoalResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = saveSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const { name, scopeType, accountId, targetAmount, targetDate } = parsed.data;

  if (scopeType === "account" && !accountId) {
    return { error: "Pick an account for an account-scoped goal." };
  }

  // No starting-balance lookup needed — progress is always computed live
  // from current balances + history (lib/goals.ts), never from a value
  // frozen at creation time.
  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    name,
    scope_type: scopeType,
    account_id: scopeType === "account" ? accountId : null,
    target_amount: targetAmount,
    target_date: targetDate,
  });
  if (error) return { error: error.message };

  revalidatePath("/net-worth");
  return {};
}

export async function removeGoal(goalId: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("goals").delete().eq("id", goalId);
  if (error) throw new Error(error.message);

  revalidatePath("/net-worth");
}
