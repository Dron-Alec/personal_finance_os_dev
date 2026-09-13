import {
  getCombinedAvailableMonths,
  getCombinedCashFlow,
  getCombinedSpendingSummary,
  getCombinedNetWorth,
} from "@/lib/actions/household-summaries";
import { CombinedMonthFilter } from "@/components/combined/combined-month-filter";
import { CombinedCashFlowSection } from "@/components/combined/combined-cashflow-section";
import { CombinedSpendingSection } from "@/components/combined/combined-spending-section";
import { CombinedNetWorthSection } from "@/components/combined/combined-net-worth-section";

export default async function CombinedPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;

  const [months, cashFlow, spending, netWorth] = await Promise.all([
    getCombinedAvailableMonths(),
    getCombinedCashFlow(month),
    getCombinedSpendingSummary(month),
    getCombinedNetWorth(),
  ]);

  return (
    <div className="flex flex-col gap-6" data-tour="combined-page">
      <CombinedMonthFilter months={months} />
      <CombinedNetWorthSection data={netWorth} />
      <CombinedCashFlowSection data={cashFlow} />
      <CombinedSpendingSection data={spending} />
    </div>
  );
}
