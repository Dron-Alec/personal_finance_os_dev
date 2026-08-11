"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACCOUNT_TYPES } from "@/lib/constants";

function target(formData: FormData): string {
  const redirectTo = formData.get("redirectTo");
  return typeof redirectTo === "string" && redirectTo ? redirectTo : "/data-entry";
}

async function markOnboarded(userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, onboarded_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export type CompleteOnboardingResult = { error: string } | { error?: undefined };

// One pass over the checklist submitted from the onboarding form: remove
// unchecked starter suggestions, tag kept ones with a bank/card, insert any
// newly-added rows, then mark onboarding complete. Mirrors the field-naming
// convention balance-entry-form.tsx uses for its own dynamic checklist
// (`template_${id}`, `new_*_${i}`).
export async function completeOnboarding(
  _prevState: CompleteOnboardingResult,
  formData: FormData,
): Promise<CompleteOnboardingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const keptIds = new Set(
    formData
      .getAll("keep")
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n)),
  );

  const { data: templates } = await supabase
    .from("account_templates")
    .select("id, bank_format")
    .eq("user_id", user.id);

  for (const t of templates ?? []) {
    if (!keptIds.has(t.id)) {
      const { error } = await supabase.from("account_templates").delete().eq("id", t.id);
      if (error) return { error: error.message };
      continue;
    }
    const bankFormat = formData.get(`bank_${t.id}`);
    const nextBank = typeof bankFormat === "string" && bankFormat ? bankFormat : null;
    if (nextBank !== t.bank_format) {
      const { error } = await supabase
        .from("account_templates")
        .update({ bank_format: nextBank })
        .eq("id", t.id);
      if (error) return { error: error.message };
    }
  }

  const { count } = await supabase
    .from("account_templates")
    .select("id", { count: "exact", head: true });
  let nextSortOrder = count ?? 0;

  for (let i = 0; formData.has(`new_name_${i}`); i++) {
    const name = String(formData.get(`new_name_${i}`) ?? "").trim();
    if (!name) continue;
    const type = String(formData.get(`new_type_${i}`) ?? ACCOUNT_TYPES[0]);
    const bankFormat = formData.get(`new_bank_${i}`);
    const { error } = await supabase.from("account_templates").insert({
      user_id: user.id,
      name,
      type,
      sort_order: nextSortOrder++,
      bank_format: typeof bankFormat === "string" && bankFormat ? bankFormat : null,
    });
    if (error && error.code !== "23505") return { error: error.message };
  }

  await markOnboarded(user.id, supabase);
  revalidatePath("/data-entry");
  redirect(target(formData));
}

export async function skipOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await markOnboarded(user.id, supabase);
  redirect(target(formData));
}
