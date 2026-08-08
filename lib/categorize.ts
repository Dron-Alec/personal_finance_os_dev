import type { CategoryRule } from "@/lib/constants";

/** First keyword substring match wins (case-insensitive); default "Other". */
export function categorizeTransaction(description: string, rules: CategoryRule[]): string {
  const descUpper = description.toUpperCase();
  for (const rule of rules) {
    if (rule.keywords.some((kw) => descUpper.includes(kw.toUpperCase()))) {
      return rule.category;
    }
  }
  return "Other";
}
