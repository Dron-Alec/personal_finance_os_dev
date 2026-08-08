"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";
import { AXIS_COLOR, GRID_COLOR } from "@/lib/chart-colors";

export type TotalBar = { name: string; value: number; color: string };

export function TotalsBarChart({ data }: { data: TotalBar[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis dataKey="name" stroke={AXIS_COLOR} fontSize={12} tickLine={false} />
        <YAxis
          stroke={AXIS_COLOR}
          fontSize={12}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v, 0)}
          width={80}
        />
        <Tooltip formatter={(value) => formatCurrency(Number(value), 2)} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((bar) => (
            <Cell key={bar.name} fill={bar.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
