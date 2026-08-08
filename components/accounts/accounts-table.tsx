"use client";

import { removeAccount } from "@/lib/actions/accounts";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";

export type AccountRow = {
  id: number;
  name: string;
  type: string;
  balance: number;
  as_of_date: string;
};

export function AccountsTable({ accounts }: { accounts: AccountRow[] }) {
  return (
    <div className="overflow-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead>As of</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell className="text-muted-foreground">{a.type}</TableCell>
              <TableCell className="text-right">{formatCurrency(a.balance, 2)}</TableCell>
              <TableCell className="text-muted-foreground">{a.as_of_date}</TableCell>
              <TableCell className="text-right">
                <ConfirmActionButton
                  label="Remove"
                  title={`Remove ${a.name}?`}
                  description="This permanently deletes the account and its balance history. This doesn't undo past net worth snapshots."
                  confirmLabel="Remove"
                  onConfirm={() => removeAccount(a.id)}
                  size="sm"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
