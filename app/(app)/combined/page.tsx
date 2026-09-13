import { getCombinedCashFlow, getCombinedSpendingSummary, getCombinedNetWorth } from "@/lib/actions/household-summaries";
import { CombinedCashFlowSection } from "@/components/combined/combined-cashflow-section";
import { CombinedSpendingSection } from "@/components/combined/combined-spending-section";
import { CombinedNetWorthSection } from "@/components/combined/combined-net-worth-section";

export default async function CombinedPage() {
  const [cashFlow, spending, netWorth] = await Promise.all([
    getCombinedCashFlow(),
    getCombinedSpendingSummary(),
    getCombinedNetWorth(),
  ]);

  return (
    <div className="flex flex-col gap-6" data-tour="combined-page">
      <CombinedNetWorthSection data={netWorth} />
      <CombinedCashFlowSection data={cashFlow} />
      <CombinedSpendingSection data={spending} />
    </div>
  );
}
