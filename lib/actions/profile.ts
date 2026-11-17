"use server";

import { createClient } from "@/lib/supabase/server";
import { PRIORITY_IDS } from "@/lib/learn-modules";

// Saves "Complete your profile" answers. Passing null skips. Either way the
// prompt is marked as shown, so it never reappears. No revalidatePath here:
// the caller runs router.refresh() when it's ready. Refreshing earlier would
// re-render the layout and start the product tour while the prompt's
// "recommended for you" step is still open.
export async function saveProfile(priorities: string[] | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    profile_prompted_at: new Date().toISOString(),
    ...(priorities && { priorities: PRIORITY_IDS.filter((id) => priorities.includes(id)) }),
  });
  if (error) throw new Error(error.message);
}
