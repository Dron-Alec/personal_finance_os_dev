"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/households";

export type InviteResult = { error: string } | { error?: undefined; inviteUrl?: string };

const inviteSchema = z.object({ email: z.string().trim().email("Enter a valid email.") });

export async function inviteToHousehold(_prevState: InviteResult, formData: FormData): Promise<InviteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = inviteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const householdId = await getCurrentHouseholdId(supabase, user.id);
  const token = randomUUID();

  const { error } = await supabase.from("household_invites").insert({
    household_id: householdId,
    invited_email: parsed.data.email,
    invited_by: user.id,
    token,
    // expires_at uses the column default (now() + 7 days)
  });
  if (error) return { error: error.message };

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/invite/${token}`;

  // TODO: no email service is wired up in this app yet (zero email-provider
  // deps in package.json). Wire up an actual send here once one is chosen —
  // until then the invite link is surfaced directly in the UI for the
  // inviter to share manually.
  // await sendInviteEmail(parsed.data.email, inviteUrl);

  revalidatePath("/settings");
  return { inviteUrl };
}

export type AcceptInviteResult = { error: string } | { error?: undefined };

export async function acceptInvite(token: string): Promise<AcceptInviteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Token lookup + validation happens inside the accept_household_invite
  // RPC (SECURITY DEFINER), not a direct .from("household_invites").select()
  // call — the accepting user isn't a member of the inviting household yet,
  // so the "select own household invites" RLS policy would return zero
  // rows for them even though the token is valid.
  const { data, error } = await supabase.rpc("accept_household_invite", { invite_token: token });
  if (error) return { error: error.message };
  if (!data) return { error: "This invite is invalid, expired, or already used." };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return {};
}

export type RevokeLinkResult = { error: string } | { error?: undefined };

export async function revokeLink(linkId: string): Promise<RevokeLinkResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // No explicit household ownership filter — RLS ("select/update own
  // household link") is the sole enforcement, matching removeGoal's
  // established pattern. Either side of the link can revoke unilaterally
  // (no mutual consent) — the update policy already allows either
  // household_a_id or household_b_id member to update this row.
  const { error } = await supabase.from("household_links").update({ status: "revoked" }).eq("id", linkId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return {};
}
