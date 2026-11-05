import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">That page doesn&apos;t exist or has moved.</p>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        Go home
      </Link>
    </main>
  );
}
