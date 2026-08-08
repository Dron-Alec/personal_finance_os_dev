"use client";

import { useState } from "react";
import { BANK_FORMATS } from "@/lib/constants";
import { SearchableSelect } from "@/components/ui/searchable-select";

export const OTHER_FORMAT = "Other (add a new format)";
const SHOW_ALL_FORMATS = "Show all formats…";

// Searchable dropdown over the fixed BANK_FORMATS catalog plus shared
// custom formats other users have confirmed — every built-in entry has
// independently sourced/tested header data (see
// lib/__tests__/csv-header-matcher.test.ts).
//
// Narrowed to `bankShortlist` (the accounts you've actually tagged with a
// bank) by default; "Show all formats…" swaps to the full catalog for this
// session so nothing is ever permanently hidden.
export function StatementFormatSelect({
  value,
  onChange,
  name,
  id,
  bankShortlist = [],
  customFormats = [],
}: {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
  bankShortlist?: string[];
  customFormats?: string[];
}) {
  const [showAll, setShowAll] = useState(bankShortlist.length === 0);

  const fullList = Array.from(new Set([...BANK_FORMATS, ...customFormats])).sort();
  const narrowed = bankShortlist.filter((b) => fullList.includes(b));

  const options = showAll ? [...fullList, OTHER_FORMAT] : [...narrowed, SHOW_ALL_FORMATS, OTHER_FORMAT];

  return (
    <SearchableSelect
      value={value}
      onChange={(v) => {
        if (v === SHOW_ALL_FORMATS) {
          setShowAll(true);
          return;
        }
        onChange(v);
      }}
      options={options}
      name={name}
      id={id}
      placeholder="Search statement formats…"
      emptyText="No matching format."
    />
  );
}
