"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { AXIS_COLOR, GRID_COLOR } from "@/lib/chart-colors";
import { Button } from "@/components/ui/button";

export type MonthlySeries = { key: string; name: string; color: string };
export type MonthlyRow = { month: string } & Record<string, number | string>;

/** Monthly totals per series, as stacked bars or one line per series. Click a legend entry to hide it. */
export function MonthlyCategoryChart({
  data,
  series,
}: {
  data: MonthlyRow[];
  series: MonthlySeries[];
}) {
  const [mode, setMode] = useState<"bar" | "line">("bar");
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const Chart = mode === "bar" ? BarChart : LineChart;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end gap-1">
        {(["bar", "line"] as const).map((m) => (
          <Button
            key={m}
            type="button"
            size="sm"
            variant={mode === m ? "secondary" : "ghost"}
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
          >
            {m === "bar" ? "Bars" : "Lines"}
          </Button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <Chart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
          <XAxis dataKey="month" stroke={AXIS_COLOR} fontSize={12} tickLine={false} />
          <YAxis
            stroke={AXIS_COLOR}
            fontSize={12}
            tickLine={false}
            tickFormatter={(v) => formatCurrency(v, 0)}
            width={80}
          />
          <Tooltip formatter={(value) => formatCurrency(Number(value), 2)} />
          <Legend
            onClick={(e) => toggle(String(e.dataKey))}
            wrapperStyle={{ cursor: "pointer" }}
          />
          {series.map((s) =>
            mode === "bar" ? (
              <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color} hide={hidden.has(s.key)} />
            ) : (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                hide={hidden.has(s.key)}
              />
            ),
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
