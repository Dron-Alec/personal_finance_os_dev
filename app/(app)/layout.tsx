import Link from "next/link";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProductTour } from "@/components/product-tour";
import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "@/lib/households";

const NAV_ITEMS = [
  { href: "/data-entry", label: "📋 Data Entry" },
  { href: "/net-worth", label: "📈 Net Worth" },
  { href: "/spending", label: "💸 Spending" },
  { href: "/accounts", label: "🏦 Accounts" },
  { href: "/settings", label: "⚙️ Settings" },
];

const COMBINED_NAV_ITEM = { href: "/combined", label: "🔗 Combined" };

// Re-run on every navigation (no extra caching beyond Next's normal RSC
// behavior) — combined with revalidatePath("/", "layout") in
// acceptInvite/revokeLink, this is what makes the tab appear/disappear
// immediately rather than only on the next full page load.
async function hasActiveHouseholdLink(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const householdId = await getCurrentHouseholdId(supabase, user.id);
  const { count } = await supabase
    .from("household_links")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .or(`household_a_id.eq.${householdId},household_b_id.eq.${householdId}`);
  return (count ?? 0) > 0;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const showCombined = await hasActiveHouseholdLink();
  const navItems = showCombined ? [...NAV_ITEMS, COMBINED_NAV_ITEM] : NAV_ITEMS;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 py-3">
          <div />
          <h1 className="justify-self-center text-xl font-semibold">Candid 💰</h1>
          <div className="flex items-center justify-self-end gap-2">
            <ProductTour />
            <ThemeToggle />
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                Logout
              </Button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl justify-center gap-1 overflow-x-auto px-4 pb-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
