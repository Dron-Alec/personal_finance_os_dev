"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { acceptInvite } from "@/lib/actions/households";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [accepted, setAccepted] = useState(false);

  function onAccept() {
    startTransition(async () => {
      const result = await acceptInvite(token);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setAccepted(true);
      toast.success("Households linked!");
      router.push("/settings");
      router.refresh();
    });
  }

  if (accepted) {
    return <p className="text-sm text-muted-foreground">Linked — redirecting…</p>;
  }

  return (
    <Button onClick={onAccept} disabled={pending} className="w-full">
      {pending ? "Accepting…" : "Accept invite"}
    </Button>
  );
}
