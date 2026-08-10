"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { AXIS_COLOR, CATEGORICAL_PALETTE, GRID_COLOR, TARGET_LINE_COLOR } from "@/lib/chart-colors";

export type NetWorthPoint = {
  date: string; // YYYY-MM-DD
  label: string; // formatted for axis/tooltip
  netWorth: number | null;
  target: number | null;
};

export type GoalLine = { id: number; name: string; targetAmount: number; color: string };

const NET_WORTH_COLOR = CATEGORICAL_PALETTE[0];

export function NetWorthChart({ data, goalLines = [] }: { data: NetWorthPoint[]; goalLines?: GoalLine[] }) {
  return (
    <ResponsiveContainer width="100%" height={380}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis dataKey="label" stroke={AXIS_COLOR} fontSize={12} tickLine={false} />
        <YAxis
          stroke={AXIS_COLOR}
          fontSize={12}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v, 0)}
          width={80}
        />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value), 2)}
          contentStyle={{ borderRadius: 8, fontSize: 13 }}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="netWorth"
          name="Net Worth"
          stroke={NET_WORTH_COLOR}
          fill={NET_WORTH_COLOR}
          fillOpacity={0.12}
          strokeWidth={2.5}
          dot={{ r: 3 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="target"
          name="Target"
          stroke={TARGET_LINE_COLOR}
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
          connectNulls
        />
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
      </ComposedChart>
    </ResponsiveContainer>
  );
}
