import {
  getCombinedAvailableMonths,
  getCombinedAvailableCategories,
  getCombinedCashFlow,
  getCombinedSpendingSummary,
  getCombinedNetWorth,
} from "@/lib/actions/household-summaries";
import { CombinedFilters } from "@/components/combined/combined-filters";
import { CombinedCashFlowSection } from "@/components/combined/combined-cashflow-section";
import { CombinedSpendingSection } from "@/components/combined/combined-spending-section";
import { CombinedNetWorthSection } from "@/components/combined/combined-net-worth-section";

export default async function CombinedPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; category?: string }>;
}) {
  const { month, category } = await searchParams;

  const [months, categories, cashFlow, spending, netWorth] = await Promise.all([
    getCombinedAvailableMonths(),
    getCombinedAvailableCategories(),
    getCombinedCashFlow(month, category),
    getCombinedSpendingSummary(month, category),
    getCombinedNetWorth(),
  ]);

  return (
    <div className="flex flex-col gap-6" data-tour="combined-page">
      <CombinedFilters months={months} categories={categories} />
      <CombinedNetWorthSection data={netWorth} />
      <CombinedCashFlowSection data={cashFlow} />
      <CombinedSpendingSection data={spending} />
    </div>
  );
}
