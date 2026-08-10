import type { createClient } from "@/lib/supabase/server";

// household_id lookups recur across several actions now that accounts/
// transactions are household-scoped (unlike auth.uid(), there's no
// column-default equivalent for "the current user's household" — every
// insert site has to look it up explicitly).
export async function getCurrentHouseholdId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .single();
  if (error || !data) throw new Error("No household found for user.");
  return data.household_id;
}
