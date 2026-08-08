"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const snapshotSchema = z.object({
  date: z.string().min(1, "Date is required."),
  netWorth: z.coerce.number(),
  note: z.string().trim().optional(),
});

export type SaveSnapshotResult = { error: string } | { error?: undefined };

export async function saveNetWorthSnapshot(
  _prevState: SaveSnapshotResult,
  formData: FormData,
): Promise<SaveSnapshotResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = snapshotSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { error } = await supabase.from("nw_snapshots").insert({
    user_id: user.id,
    date: parsed.data.date,
    net_worth: parsed.data.netWorth,
    note: parsed.data.note || "Manual snapshot",
  });
  if (error) return { error: error.message };

  revalidatePath("/net-worth");
  revalidatePath("/data-entry");
  return {};
}

export async function clearAllSnapshots() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { error } = await supabase.from("nw_snapshots").delete().eq("user_id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/net-worth");
}
