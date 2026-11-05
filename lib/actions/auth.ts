"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { log } from "@/lib/log";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Revokes every refresh token for this user (all devices), not just this cookie.
export async function signOutEverywhere() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.auth.signOut({ scope: "global" });
  log("info", "auth.signout_everywhere", { user_id: user?.id ?? null });
  redirect("/login");
}
