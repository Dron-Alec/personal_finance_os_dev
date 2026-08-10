"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { AXIS_COLOR, CATEGORICAL_PALETTE, GRID_COLOR } from "@/lib/chart-colors";

export type BalancePoint = { date: string; label: string; balance: number | null } & Record<
  string,
  string | number | null
>;
/** A goal with no contribution plan — rendered as a flat horizontal line at
 * the target amount, spanning the whole chart. */
export type GoalLine = { id: number; name: string; targetAmount: number; color: string };
/** A goal with a contribution plan — rendered as its own projected
 * trajectory series, reading a `goal_${id}` column already merged into `data`. */
export type GoalSeries = { id: number; name: string; color: string };

export function BalanceHistoryChart({
  data,
  color = CATEGORICAL_PALETTE[0],
  goalLines = [],
  goalSeries = [],
}: {
  data: BalancePoint[];
  color?: string;
  goalLines?: GoalLine[];
  goalSeries?: GoalSeries[];
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
          tickFormatter={(v) => formatCurrency(Number(v), 0)}
          width={80}
        />
        <Tooltip formatter={(value) => formatCurrency(Number(value), 2)} />
        {(goalSeries.length > 0 || goalLines.length > 0) && <Legend />}
        <Line
          type="monotone"
          dataKey="balance"
          name="Balance"
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 3 }}
          connectNulls
        />
        {goalSeries.map((g) => (
          <Line
            key={g.id}
            type="monotone"
            dataKey={`goal_${g.id}`}
            name={g.name}
            stroke={g.color}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            connectNulls
          />
        ))}
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
