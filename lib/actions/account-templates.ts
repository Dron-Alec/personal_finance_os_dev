"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ACCOUNT_TYPES } from "@/lib/constants";

const addSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  type: z.enum(ACCOUNT_TYPES),
  bankFormat: z.string().trim().optional(),
});

export type AddAccountTemplateResult = { error: string } | { error?: undefined };

export async function addAccountTemplate(
  _prevState: AddAccountTemplateResult,
  formData: FormData,
): Promise<AddAccountTemplateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = addSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { name, type, bankFormat } = parsed.data;

  const { count } = await supabase
    .from("account_templates")
    .select("id", { count: "exact", head: true });

  const { error } = await supabase.from("account_templates").insert({
    user_id: user.id,
    name,
    type,
    sort_order: count ?? 0,
    bank_format: bankFormat || null,
  });
  if (error) {
    return {
      error: error.code === "23505" ? "You already have a suggestion with that name." : error.message,
    };
  }

  revalidatePath("/data-entry");
  return {};
}

export async function removeAccountTemplate(templateId: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("account_templates").delete().eq("id", templateId);
  if (error) throw new Error(error.message);

  revalidatePath("/data-entry");
}
