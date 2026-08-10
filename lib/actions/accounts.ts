"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ACCOUNT_TYPES } from "@/lib/constants";
import { getCurrentHouseholdId } from "@/lib/households";

const createSchema = z.object({
  mode: z.literal("create"),
  name: z.string().trim().min(1, "Account name is required."),
  type: z.enum(ACCOUNT_TYPES),
  balance: z.coerce.number(),
  asOfDate: z.string().min(1, "Date is required."),
  bankFormat: z.string().trim().optional(),
});

const updateSchema = z.object({
  mode: z.literal("update"),
  accountId: z.coerce.number(),
  balance: z.coerce.number(),
  asOfDate: z.string().min(1, "Date is required."),
  bankFormat: z.string().trim().optional(),
});

export type SaveAccountResult = { error: string } | { error?: undefined };

async function recordNetWorthSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  note: string,
  asOfDate: string,
) {
  const { data: accounts } = await supabase.from("accounts").select("balance");
  const totalNetWorth = (accounts ?? []).reduce((sum, a) => sum + Number(a.balance), 0);
  await supabase.from("nw_snapshots").insert({
    user_id: userId,
    date: asOfDate,
    net_worth: totalNetWorth,
    note,
  });
}

export async function saveAccount(
  _prevState: SaveAccountResult,
  formData: FormData,
): Promise<SaveAccountResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const raw = Object.fromEntries(formData.entries());

  if (raw.mode === "create") {
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const { name, type, balance, asOfDate, bankFormat } = parsed.data;
    const householdId = await getCurrentHouseholdId(supabase, user.id);

    const { data: account, error: insertError } = await supabase
      .from("accounts")
      .insert({
        household_id: householdId,
        name,
        type,
        balance,
        as_of_date: asOfDate,
        bank_format: bankFormat || null,
      })
      .select("id")
      .single();
    if (insertError) return { error: insertError.message };

    await supabase.from("account_balance_history").insert({
      account_id: account.id,
      user_id: user.id,
      balance,
      as_of_date: asOfDate,
    });
    await recordNetWorthSnapshot(supabase, user.id, `Account update: ${name}`, asOfDate);
  } else {
    const parsed = updateSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const { accountId, balance, asOfDate, bankFormat } = parsed.data;

    const { data: account, error: updateError } = await supabase
      .from("accounts")
      .update({
        balance,
        as_of_date: asOfDate,
        bank_format: bankFormat || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId)
      .select("name")
      .single();
    if (updateError) return { error: updateError.message };

    await supabase.from("account_balance_history").insert({
      account_id: accountId,
      user_id: user.id,
      balance,
      as_of_date: asOfDate,
    });
    await recordNetWorthSnapshot(supabase, user.id, `Account update: ${account.name}`, asOfDate);
  }

  revalidatePath("/accounts");
  revalidatePath("/net-worth");
  revalidatePath("/data-entry");
  return {};
}

export async function removeAccount(accountId: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", accountId);
  if (error) throw new Error(error.message);

  revalidatePath("/accounts");
  revalidatePath("/data-entry");
}
