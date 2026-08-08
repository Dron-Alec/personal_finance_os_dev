"use client";

import { BANK_FORMATS } from "@/lib/constants";
import { SearchableSelect } from "@/components/ui/searchable-select";

const NOT_SET = "Not set yet";

// Optional per-account bank tag. Feeds the CSV Statement Format picker: it
// narrows to "banks you actually have" (distinct accounts.bank_format for
// the signed-in user) once at least one account carries one.
export function AccountBankSelect({
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
    <>
      {name && <input type="hidden" name={name} value={value} />}
      <SearchableSelect
        value={value || NOT_SET}
        onChange={(v) => onChange(v === NOT_SET ? "" : v)}
        options={[NOT_SET, ...BANK_FORMATS]}
        id={id}
        placeholder="Search banks…"
        emptyText="No matching bank."
      />
    </>
  );
}
