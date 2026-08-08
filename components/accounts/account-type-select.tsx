"use client";

import { ACCOUNT_TYPES } from "@/lib/constants";
import { SearchableSelect } from "@/components/ui/searchable-select";

// Searchable dropdown over the fixed ACCOUNT_TYPES catalog. "Other" is just
// the existing catch-all type, not freeform text — the DB check constraint
// on accounts.type/account_templates.type stays closed.
export function AccountTypeSelect({
  value,
  onChange,
  name,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
}) {
  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      options={ACCOUNT_TYPES}
      name={name}
      id={id}
      placeholder="Search types…"
      emptyText="No matching type."
    />
  );
}
