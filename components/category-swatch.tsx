import { getCategoryColor } from "@/lib/chart-colors";

// A colored dot + the category name — text stays in the muted-foreground
// ink (per the dataviz skill: text wears text tokens, never the series
// color), the dot alone carries the category's identity/color.
export function CategorySwatch({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: getCategoryColor(category) }}
        aria-hidden
      />
      {category}
    </span>
  );
}
