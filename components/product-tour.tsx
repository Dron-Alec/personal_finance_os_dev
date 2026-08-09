"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { HelpCircleIcon, XIcon } from "lucide-react";
import { TOUR_STEPS } from "@/lib/tour-steps";
import { useHasMounted } from "@/lib/use-has-mounted";
import { Button } from "@/components/ui/button";

const SEEN_KEY = "pfos-tour-seen";

function subscribeNoop() {
  return () => {};
}

// Whether this browser has dismissed the tour before — read straight from
// localStorage via useSyncExternalStore so the client/server first-paint
// values differ safely (server always "seen", so the tour never
// auto-renders during SSR) without an effect+setState pair.
function useHasSeenTour(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => window.localStorage.getItem(SEEN_KEY) === "1",
    () => true,
  );
}

type Rect = { top: number; left: number; width: number; height: number };

// Reactively tracks the bounding box of the element carrying
// data-tour={target}, without effect+setState: subscribe wires up
// observers that fire the store's notify callback, getSnapshot re-measures
// and only returns a new object when the measured box actually changed.
function useTargetRect(target: string | undefined): Rect | null {
  const cache = useRef<{ key: string; rect: Rect | null }>({ key: "", rect: null });

  return useSyncExternalStore(
    (onChange) => {
      if (!target) return () => {};
      const mo = new MutationObserver(onChange);
      mo.observe(document.body, { childList: true, subtree: true, attributes: true });
      window.addEventListener("scroll", onChange, true);
      window.addEventListener("resize", onChange);
      return () => {
        mo.disconnect();
        window.removeEventListener("scroll", onChange, true);
        window.removeEventListener("resize", onChange);
      };
    },
    () => {
      if (!target) return null;
      const el = document.querySelector(`[data-tour="${target}"]`);
      if (!el) {
        if (cache.current.key !== "") cache.current = { key: "", rect: null };
        return cache.current.rect;
      }
      const r = el.getBoundingClientRect();
      const key = `${r.top}|${r.left}|${r.width}|${r.height}`;
      if (key !== cache.current.key) {
        cache.current = { key, rect: { top: r.top, left: r.left, width: r.width, height: r.height } };
      }
      return cache.current.rect;
    },
    () => null,
  );
}

export function ProductTour() {
  const hasSeen = useHasSeenTour();
  const [manuallyActive, setManuallyActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const active = manuallyActive || !hasSeen;

  const pathname = usePathname();
  const router = useRouter();
  const step = active ? TOUR_STEPS[stepIndex] : undefined;

  // Tracks the pathname our own step-navigation last pushed to, set
  // optimistically at push time (below) — so when the real pathname catches
  // up, the watcher effect sees a match and does nothing. If it *doesn't*
  // match what we expected, the user navigated away on their own (e.g.
  // clicked a nav link), and the tour should get out of the way rather than
  // fight them back to the tour's page.
  const trackedPathname = useRef(pathname);

  // Advance navigation: fires only when the step itself changes, not on
  // every pathname change — otherwise this would immediately re-fire once
  // the push below lands and fight any *subsequent* manual navigation.
  useEffect(() => {
    if (!step) return;
    router.push(step.path);
    trackedPathname.current = step.path;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- step.path is what we act on; keying on `step` itself (not stepIndex) would also re-fire on unrelated array identity changes, which TOUR_STEPS never has (module-level constant).
  }, [stepIndex, active]);

  // Manual-navigation watcher: if pathname changes to something other than
  // what our own push (above) set it to, the user navigated away — dismiss
  // instead of yanking them back. Purely imperative (dismiss's setState
  // calls happen in this callback body directly, which is fine — the
  // set-state-in-effect rule targets synchronous calls in the effect body,
  // and this IS the effect body, but the calls are conditional on an
  // external signal changing, which is exactly what the rule allows).
  useEffect(() => {
    if (!step) return;
    if (trackedPathname.current !== pathname) {
      trackedPathname.current = pathname;
      if (pathname !== step.path) dismiss();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only pathname should trigger this comparison; step/dismiss are read, not depended on, to avoid re-running this watcher on step changes (that's the other effect's job).
  }, [pathname]);

  const rect = useTargetRect(step?.target);

  // Bring the target into view for the current step. Keyed on `step`
  // (a stable reference into the TOUR_STEPS array), so this only re-runs
  // when the step actually changes, not on every rect recalculation —
  // otherwise the scroll-triggered rect update would re-trigger the scroll.
  // Purely imperative (no setState), so it's outside set-state-in-effect.
  useEffect(() => {
    if (!step?.target) return;
    const selector = `[data-tour="${step.target}"]`;
    function tryScroll() {
      const el = document.querySelector(selector);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "instant" });
        return true;
      }
      return false;
    }
    if (tryScroll()) return;
    const mo = new MutationObserver(() => {
      if (tryScroll()) mo.disconnect();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [step]);

  function dismiss() {
    window.localStorage.setItem(SEEN_KEY, "1");
    setManuallyActive(false);
    setStepIndex(0);
  }

  function start() {
    setStepIndex(0);
    setManuallyActive(true);
  }

  function next() {
    if (stepIndex + 1 >= TOUR_STEPS.length) {
      dismiss();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  return (
    <>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Guided tour" onClick={start}>
        <HelpCircleIcon className="size-4" />
      </Button>
      {active && step && <TourOverlay step={step} rect={rect} index={stepIndex} onNext={next} onBack={back} onSkip={dismiss} />}
    </>
  );
}

function TourOverlay({
  step,
  rect,
  index,
  onNext,
  onBack,
  onSkip,
}: {
  step: (typeof TOUR_STEPS)[number];
  rect: Rect | null;
  index: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const mounted = useHasMounted();
  if (!mounted) return null;

  const pad = 6;
  const spotlightStyle: React.CSSProperties = rect
    ? {
        position: "fixed",
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        borderRadius: 10,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
        transition: "top 150ms ease, left 150ms ease, width 150ms ease, height 150ms ease",
      }
    : { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)" };

  // Card placement: below the target if there's room, else above; centered
  // on screen entirely when there's nothing to anchor to.
  const cardStyle: React.CSSProperties = rect
    ? (() => {
        const cardHeight = 220;
        const below = rect.top + rect.height + pad + 12;
        const spaceBelow = window.innerHeight - below;
        const top = spaceBelow > cardHeight ? below : Math.max(12, rect.top - pad - 12 - cardHeight);
        const left = Math.min(Math.max(12, rect.left), window.innerWidth - 336);
        return { position: "fixed", top, left, width: 320 };
      })()
    : {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 340,
      };

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Guided tour">
      <div style={spotlightStyle} className="pointer-events-none" />
      <div
        style={cardStyle}
        className="flex flex-col gap-3 rounded-xl bg-popover p-4 text-popover-foreground shadow-lg ring-1 ring-foreground/10"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold">{step.title}</p>
          <Button type="button" variant="ghost" size="icon-xs" aria-label="Skip tour" onClick={onSkip}>
            <XIcon className="size-3.5" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{step.body}</p>
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs text-muted-foreground">
            Step {index + 1} of {TOUR_STEPS.length}
          </span>
          <div className="flex gap-2">
            {index > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={onBack}>
                Back
              </Button>
            )}
            <Button type="button" size="sm" onClick={onNext}>
              {index + 1 >= TOUR_STEPS.length ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
