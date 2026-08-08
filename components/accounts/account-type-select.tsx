"use client";

import { useMemo, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { ACCOUNT_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ACCOUNT_TYPES;
    return ACCOUNT_TYPES.filter((t) => t.toLowerCase().includes(q));
  }, [query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      {name && <input type="hidden" name={name} value={value} />}
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            id={id}
            className="w-full justify-between font-normal"
          >
            <span>{value}</span>
            <ChevronDownIcon className="size-4 text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-64 p-1.5">
        <Input
          autoFocus
          placeholder="Search types…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex max-h-56 flex-col overflow-y-auto">
          {filtered.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">No matching type.</p>
          )}
          {filtered.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                onChange(t);
                setOpen(false);
                setQuery("");
              }}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                t === value && "font-medium",
              )}
            >
              {t}
              {t === value && <CheckIcon className="size-4" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
