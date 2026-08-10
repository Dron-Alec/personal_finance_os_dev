"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type CombinedView = "combined" | "split";

export function ViewToggle({ value, onChange }: { value: CombinedView; onChange: (value: CombinedView) => void }) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as CombinedView)}>
      <TabsList>
        <TabsTrigger value="combined">Combined</TabsTrigger>
        <TabsTrigger value="split">View by person</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
