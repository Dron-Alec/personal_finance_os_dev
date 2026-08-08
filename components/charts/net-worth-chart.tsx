"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";

export type NetWorthPoint = {
  date: string; // YYYY-MM-DD
  label: string; // formatted for axis/tooltip
  netWorth: number | null;
  target: number | null;
};

const NET_WORTH_COLOR = "#2a78d6";
const TARGET_COLOR = "#898781";

export function NetWorthChart({ data }: { data: NetWorthPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={380}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
        <XAxis dataKey="label" stroke="#898781" fontSize={12} tickLine={false} />
        <YAxis
          stroke="#898781"
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
          stroke={TARGET_COLOR}
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
