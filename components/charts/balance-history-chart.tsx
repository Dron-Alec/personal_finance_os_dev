"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";
import { AXIS_COLOR, CATEGORICAL_PALETTE, GRID_COLOR } from "@/lib/chart-colors";

export type BalancePoint = { date: string; label: string; balance: number };
export type GoalLine = { id: number; name: string; targetAmount: number; color: string };

export function BalanceHistoryChart({
  data,
  color = CATEGORICAL_PALETTE[0],
  goalLines = [],
}: {
  data: BalancePoint[];
  color?: string;
  goalLines?: GoalLine[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis dataKey="label" stroke={AXIS_COLOR} fontSize={12} tickLine={false} />
        <YAxis
          stroke={AXIS_COLOR}
          fontSize={12}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v, 0)}
          width={80}
        />
        <Tooltip formatter={(value) => formatCurrency(Number(value), 2)} />
        <Line type="monotone" dataKey="balance" stroke={color} strokeWidth={2.5} dot={{ r: 3 }} />
        {goalLines.map((g) => (
          <ReferenceLine
            key={g.id}
            y={g.targetAmount}
            stroke={g.color}
            strokeDasharray="3 3"
            strokeWidth={1.5}
            label={{ value: g.name, position: "insideTopRight", fontSize: 11, fill: g.color }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
