import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("account_templates")
    .select("id, name, type, bank_format")
    .order("sort_order");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Set up your accounts</CardTitle>
          <CardDescription>
            Tell us what you have — it pre-fills the Month-End Balances checklist and narrows
            the Statement Format list when you upload CSVs later. You can always change this
            afterward.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm templates={templates ?? []} redirectTo={redirect} />
        </CardContent>
      </Card>
    </div>
  );
}
