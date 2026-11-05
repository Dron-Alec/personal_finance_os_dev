"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/format";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { AccountTypeSelect } from "@/components/accounts/account-type-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type PlaidItem = {
  id: string;
  institution_name: string | null;
  status: string;
  last_synced_at: string | null;
  import_from: string;
};
type PlaidAccountOption = {
  plaid_account_id: string;
  name: string;
  mask: string | null;
  suggested_type: string;
  balance: number;
  linked_account_id: number | null;
};
type Choice = { action: "create" | "skip" | "link"; accountId?: number; name: string; type: string };

// ---- Plaid Link (loaded on demand; CSP allows cdn.plaid.com in next.config.ts) ----

type PlaidHandler = { open: () => void; destroy: () => void };
type PlaidSuccessMeta = { institution?: { name?: string } | null };
declare global {
  interface Window {
    Plaid?: {
      create: (config: {
        token: string;
        onSuccess: (publicToken: string, meta: PlaidSuccessMeta) => void;
        onExit: (err: unknown) => void;
      }) => PlaidHandler;
    };
  }
}

function loadPlaidLink(): Promise<NonNullable<Window["Plaid"]>> {
  if (window.Plaid) return Promise.resolve(window.Plaid);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    s.onload = () => (window.Plaid ? resolve(window.Plaid) : reject(new Error("Plaid Link failed to load.")));
    s.onerror = () => reject(new Error("Plaid Link failed to load."));
    document.head.appendChild(s);
  });
}

/** Resolves with Link's public token + metadata, or null if the user closed it. */
async function openLink(token: string): Promise<{ publicToken: string; meta: PlaidSuccessMeta } | null> {
  const Plaid = await loadPlaidLink();
  return new Promise((resolve) => {
    const handler = Plaid.create({
      token,
      onSuccess: (publicToken, meta) => {
        handler.destroy();
        resolve({ publicToken, meta });
      },
      onExit: () => {
        handler.destroy();
        resolve(null);
      },
    });
    handler.open();
  });
}

async function callPlaid<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await createClient().functions.invoke("plaid", { body });
  if (error) {
    let message = "Something went wrong talking to your bank.";
    try {
      message = (await error.context.json()).error ?? message;
    } catch {}
    throw new Error(message);
  }
  return data as T;
}

const STATUS_LABEL: Record<string, string> = {
  active: "Connected",
  login_required: "Needs you to sign in again",
  error: "Connection problem",
};

export function PlaidConnections({
  items,
  accounts,
  defaultImportFrom,
}: {
  items: PlaidItem[];
  accounts: { id: number; name: string; plaid_account_id: string | null }[];
  defaultImportFrom: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [consentOpen, setConsentOpen] = useState(false);
  const [importFrom, setImportFrom] = useState(defaultImportFrom);
  const [mapping, setMapping] = useState<{ itemId: string; institution: string; options: PlaidAccountOption[] } | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});

  const unlinkedAccounts = accounts.filter((a) => !a.plaid_account_id);

  function run(task: () => Promise<void>) {
    startTransition(async () => {
      try {
        await task();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function startMapping(itemId: string, institution: string, options: PlaidAccountOption[]) {
    setChoices(
      Object.fromEntries(
        options.map((o) => [
          o.plaid_account_id,
          {
            action: o.linked_account_id ? "skip" : "create",
            name: `${institution} ${o.name}${o.mask ? ` ••${o.mask}` : ""}`.trim(),
            type: o.suggested_type,
          },
        ]),
      ),
    );
    setMapping({ itemId, institution, options });
  }

  function connect() {
    setConsentOpen(false);
    run(async () => {
      const { link_token } = await callPlaid<{ link_token: string }>({ action: "link_token" });
      const result = await openLink(link_token);
      if (!result) return;
      const institution = result.meta.institution?.name ?? "Bank";
      const res = await callPlaid<{ item_id: string; accounts: PlaidAccountOption[] }>({
        action: "exchange",
        public_token: result.publicToken,
        institution_name: institution,
        import_from: importFrom,
      });
      router.refresh();
      startMapping(res.item_id, institution, res.accounts);
    });
  }

  function saveMapping() {
    if (!mapping) return;
    const accountsPayload = mapping.options
      .filter((o) => !o.linked_account_id)
      .map((o) => {
        const c = choices[o.plaid_account_id];
        if (c.action === "link") return { plaid_account_id: o.plaid_account_id, action: "link", account_id: c.accountId };
        if (c.action === "create") return { plaid_account_id: o.plaid_account_id, action: "create", name: c.name, type: c.type };
        return { plaid_account_id: o.plaid_account_id, action: "skip" };
      });
    run(async () => {
      const r = await callPlaid<{ added: number }>({ action: "map_accounts", item_id: mapping.itemId, accounts: accountsPayload });
      setMapping(null);
      toast.success(`Imported ${r.added} transaction${r.added === 1 ? "" : "s"}.`);
      router.refresh();
    });
  }

  function chooseAccounts(item: PlaidItem) {
    run(async () => {
      const res = await callPlaid<{ item_id: string; accounts: PlaidAccountOption[] }>({ action: "accounts", item_id: item.id });
      startMapping(res.item_id, item.institution_name ?? "Bank", res.accounts);
    });
  }

  function sync(item: PlaidItem) {
    run(async () => {
      const r = await callPlaid<{ added: number }>({ action: "sync", item_id: item.id });
      toast.success(`Synced — ${r.added} new transaction${r.added === 1 ? "" : "s"}.`);
      router.refresh();
    });
  }

  function reconnect(item: PlaidItem) {
    run(async () => {
      const { link_token } = await callPlaid<{ link_token: string }>({ action: "link_token", item_id: item.id });
      const result = await openLink(link_token);
      if (!result) return;
      await callPlaid({ action: "reconnected", item_id: item.id });
      toast.success("Reconnected.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 && (
        <ul className="flex flex-col divide-y rounded-lg border">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="flex flex-col">
                <span className="font-medium">{item.institution_name ?? "Bank"}</span>
                <span className={item.status === "active" ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>
                  {STATUS_LABEL[item.status] ?? item.status}
                  {item.last_synced_at && ` · last synced ${new Date(item.last_synced_at).toLocaleString()}`}
                  {` · from ${item.import_from}`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.status === "active" ? (
                  <>
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => sync(item)}>
                      Sync now
                    </Button>
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => chooseAccounts(item)}>
                      Choose accounts
                    </Button>
                  </>
                ) : (
                  <Button size="sm" disabled={pending} onClick={() => reconnect(item)}>
                    Reconnect
                  </Button>
                )}
                <ConfirmActionButton
                  label="Disconnect"
                  size="sm"
                  title={`Disconnect ${item.institution_name ?? "this bank"}?`}
                  description="Candid stops syncing and deletes its access to this bank. Accounts and transactions already imported stay."
                  confirmLabel="Disconnect"
                  onConfirm={async () => {
                    await callPlaid({ action: "disconnect", item_id: item.id });
                    router.refresh();
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <Button onClick={() => setConsentOpen(true)} disabled={pending}>
          Connect a bank
        </Button>
      </div>

      {/* Consent: what's pulled, where it's stored, how to stop. */}
      <Dialog open={consentOpen} onOpenChange={setConsentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect a bank with Plaid</DialogTitle>
            <DialogDescription>
              Candid uses Plaid to read your accounts. You sign in to your bank inside Plaid&apos;s window —
              Candid never sees your bank password.
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              <strong>What&apos;s pulled:</strong> account names, balances, and transactions (date, merchant,
              amount, category). Read-only — Candid can&apos;t move money.
            </li>
            <li>
              <strong>How it&apos;s stored:</strong> transactions sit with your other Candid data, private to your
              household. The access key Plaid gives us is encrypted in Supabase Vault and never reaches your
              browser.
            </li>
            <li>
              <strong>Stopping:</strong> Disconnect any time here. That deletes Candid&apos;s access at Plaid and
              ours; what was already imported stays unless you delete it. Deleting your Candid account
              disconnects everything.
            </li>
          </ul>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plaid-import-from">Import transactions from</Label>
            <Input id="plaid-import-from" type="date" value={importFrom} onChange={(e) => setImportFrom(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Defaults to the day after your newest transaction, so history you already imported from CSV
              isn&apos;t counted twice.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConsentOpen(false)}>
              Cancel
            </Button>
            <Button onClick={connect} disabled={!importFrom}>
              I agree — continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Map each Plaid account onto a Candid account. */}
      <Dialog open={!!mapping} onOpenChange={(open) => !open && setMapping(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose accounts from {mapping?.institution}</DialogTitle>
            <DialogDescription>
              Link each one to an account you already track, add it as a new account, or leave it out.
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
            {mapping?.options.map((o) => {
              const c = choices[o.plaid_account_id];
              if (!c) return null;
              const set = (patch: Partial<Choice>) => setChoices((prev) => ({ ...prev, [o.plaid_account_id]: { ...c, ...patch } }));
              const value = c.action === "link" ? String(c.accountId) : c.action;
              return (
                <div key={o.plaid_account_id} className="flex flex-col gap-2 rounded-lg border p-3">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="font-medium">
                      {o.name}
                      {o.mask && ` ••${o.mask}`}
                    </span>
                    <span className="text-muted-foreground">{formatCurrency(o.balance)}</span>
                  </div>
                  {o.linked_account_id ? (
                    <p className="text-xs text-muted-foreground">
                      Already linked to {accounts.find((a) => a.id === o.linked_account_id)?.name ?? "an account"}.
                    </p>
                  ) : (
                    <>
                      <Select
                        value={value}
                        onValueChange={(v) =>
                          v === "create" || v === "skip" ? set({ action: v }) : set({ action: "link", accountId: Number(v) })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="create">Add as a new account</SelectItem>
                          {unlinkedAccounts.map((a) => (
                            <SelectItem key={a.id} value={String(a.id)}>
                              Link to {a.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="skip">Don&apos;t track</SelectItem>
                        </SelectContent>
                      </Select>
                      {c.action === "create" && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input aria-label="New account name" value={c.name} onChange={(e) => set({ name: e.target.value })} />
                          <AccountTypeSelect value={c.type} onChange={(type) => set({ type })} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMapping(null)}>
              Later
            </Button>
            <Button onClick={saveMapping} disabled={pending}>
              Save and import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
