"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";

export type MonthlySeries = { key: string; name: string; color: string };
export type MonthlyRow = { month: string } & Record<string, number | string>;

export function MonthlyStackedBarChart({
  data,
  series,
}: {
  data: MonthlyRow[];
  series: MonthlySeries[];
}) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
        <XAxis dataKey="month" stroke="#898781" fontSize={12} tickLine={false} />
        <YAxis
          stroke="#898781"
          fontSize={12}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v, 0)}
          width={80}
        />
        <Tooltip formatter={(value) => formatCurrency(Number(value), 2)} />
        <Legend />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
