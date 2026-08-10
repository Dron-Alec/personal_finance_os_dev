import { getCombinedSpendingSummary, getCombinedNetWorth } from "@/lib/actions/household-summaries";
import { CombinedSpendingSection } from "@/components/combined/combined-spending-section";
import { CombinedNetWorthSection } from "@/components/combined/combined-net-worth-section";

export default async function CombinedPage() {
  const [spending, netWorth] = await Promise.all([getCombinedSpendingSummary(), getCombinedNetWorth()]);

  return (
    <div className="flex flex-col gap-6" data-tour="combined-page">
      <CombinedNetWorthSection data={netWorth} />
      <CombinedSpendingSection data={spending} />
    </div>
  );
}
