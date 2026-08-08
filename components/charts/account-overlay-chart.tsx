"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";
import { AXIS_COLOR, GRID_COLOR, getAccountColor } from "@/lib/chart-colors";
import type { OverlayRow } from "@/lib/build-account-overlay-data";

export type OverlayAccount = { id: number; name: string };

export function AccountOverlayChart({ data, accounts }: { data: OverlayRow[]; accounts: OverlayAccount[] }) {
  const sortedIds = [...accounts].map((a) => a.id).sort((a, b) => a - b);

  return (
    <ResponsiveContainer width="100%" height={360}>
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
        <Legend />
        {accounts.map((a) => (
          <Line
            key={a.id}
            type="monotone"
            dataKey={String(a.id)}
            name={a.name}
            stroke={getAccountColor(a.id, sortedIds)}
            strokeWidth={2}
            dot={{ r: 2 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
