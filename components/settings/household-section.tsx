"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CopyIcon } from "lucide-react";
import { format } from "date-fns";
import { inviteToHousehold, revokeLink } from "@/lib/actions/households";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/confirm-action-button";

type PendingInvite = { id: string; invitedEmail: string; expiresAt: string };
type ActiveLink = { id: string; createdAt: string };

export function HouseholdSection({
  pendingInvites,
  activeLinks,
}: {
  pendingInvites: PendingInvite[];
  activeLinks: ActiveLink[];
}) {
  const [state, formAction, pending] = useActionState(inviteToHousehold, {});
  const prevPending = useRef(pending);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (prevPending.current && !pending) {
      if (state.error) toast.error(state.error);
    }
    prevPending.current = pending;
  }, [pending, state]);

  async function copyInviteUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inviteUrl = "inviteUrl" in state ? state.inviteUrl : undefined;

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="household-invite-email">Invite by email</Label>
          <div className="flex gap-2">
            <Input id="household-invite-email" name="email" type="email" placeholder="partner@example.com" required />
            <Button type="submit" disabled={pending} className="shrink-0">
              {pending ? "Sending…" : "Send invite"}
            </Button>
          </div>
        </div>
      </form>

      {inviteUrl && (
        <div className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3">
          <p className="text-sm text-muted-foreground">
            No email is wired up yet — copy this link and send it yourself. It expires in 7 days.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={inviteUrl} className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={() => copyInviteUrl(inviteUrl)}>
              <CopyIcon className="size-4" />
            </Button>
          </div>
          {copied && <p className="text-xs text-muted-foreground">Copied!</p>}
        </div>
      )}

      {pendingInvites.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Pending invites</p>
          <ul className="flex flex-col gap-1.5">
            {pendingInvites.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{invite.invitedEmail}</span>
                <span>expires {format(new Date(invite.expiresAt), "MMM d, yyyy")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeLinks.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Linked households</p>
          <ul className="flex flex-col gap-2">
            {activeLinks.map((link) => (
              <li key={link.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  Linked household — connected {format(new Date(link.createdAt), "MMM d, yyyy")}
                </span>
                <ConfirmActionButton
                  label="Revoke"
                  title="Revoke this household link?"
                  description="This immediately removes the Combined tab for both households and blocks further shared-summary access. It doesn't affect either household's own data."
                  confirmLabel="Revoke link"
                  size="sm"
                  onConfirm={async () => {
                    const result = await revokeLink(link.id);
                    if (result.error) throw new Error(result.error);
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
