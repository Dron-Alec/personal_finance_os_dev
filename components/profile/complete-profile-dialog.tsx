"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { recommendedModules } from "@/lib/learn-modules";
import { saveProfile } from "@/lib/actions/profile";
import { startTour, tourSeenKey } from "@/lib/tour-steps";
import { PriorityPicker } from "@/components/profile/priority-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Shown once, on the first visit after profile_prompted_at is still null.
// Closing it any way (Skip, ✕, Esc) before saving counts as a skip.
export function CompleteProfileDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(true);
  const [saved, setSaved] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(priorities: string[] | null) {
    startTransition(async () => {
      try {
        await saveProfile(priorities);
        if (priorities?.length) setSaved(priorities);
        else close();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  // Refresh only once we're done, so the layout drops this prompt and the
  // first-visit product tour can start (see saveProfile).
  function close() {
    setOpen(false);
    router.refresh();
  }

  // Heading to a guide: don't let the first-visit tour start and pull
  // them back to /data-entry. It's still available from Help.
  function closeToGuide() {
    try {
      window.localStorage.setItem(tourSeenKey(userId), "1");
    } catch {}
    close();
  }

  function onOpenChange(next: boolean) {
    if (next || pending) return;
    if (saved) close();
    else submit(null);
  }

  const modules = saved ? recommendedModules(saved) : [];
  const wantsSpending = saved?.some((p) => p === "track_spending" || p === "budget");

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {!saved ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">Complete your profile</DialogTitle>
              <DialogDescription>
                What do you want help with? Pick as many as you like. We&apos;ll suggest guides that
                fit, and you can change this anytime on the Learn tab.
              </DialogDescription>
            </DialogHeader>
            <PriorityPicker value={picked} onChange={setPicked} />
            <DialogFooter>
              <Button type="button" variant="ghost" disabled={pending} onClick={() => submit(null)}>
                Skip for now
              </Button>
              <Button type="button" disabled={pending || picked.length === 0} onClick={() => submit(picked)}>
                {pending ? "Saving…" : "Continue"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">Recommended for you</DialogTitle>
              <DialogDescription>
                Short guides picked from your answers. They&apos;re all on the Learn tab.
              </DialogDescription>
            </DialogHeader>
            <ul className="flex flex-col gap-2">
              {modules.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/learn#${m.id}`}
                    onClick={closeToGuide}
                    className="block rounded-lg border px-3 py-2.5 hover:bg-muted"
                  >
                    <p className="text-sm font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{m.summary}</p>
                  </Link>
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={close}>
                Done
              </Button>
              {wantsSpending && (
                <Button
                  type="button"
                  onClick={() => {
                    close();
                    startTour("spending");
                  }}
                >
                  Start the spending walkthrough
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
