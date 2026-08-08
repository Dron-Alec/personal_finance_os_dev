"use client";

import { useMemo, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Generic searchable dropdown over a fixed list of string options. */
export function SearchableSelect({
  value,
  onChange,
  options,
  name,
  id,
  placeholder = "Search…",
  emptyText = "No matching option.",
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  name?: string;
  id?: string;
  placeholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [query, options]);

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
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex max-h-56 flex-col overflow-y-auto">
          {filtered.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyText}</p>
          )}
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => {
                onChange(o);
                setOpen(false);
                setQuery("");
              }}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                o === value && "font-medium",
              )}
            >
              {o}
              {o === value && <CheckIcon className="size-4" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
