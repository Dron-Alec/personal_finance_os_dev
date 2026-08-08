"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/format";

export type BreakdownSlice = { name: string; value: number; color: string };

export function BreakdownPieChart({ data }: { data: BreakdownSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((slice) => (
            <Cell key={slice.name} fill={slice.color} stroke="var(--background)" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatCurrency(Number(value), 2)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
