"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScoreTrendPoint } from "@/types/analytics";

/**
 * Score-over-time line chart. The **only** module that imports Recharts, and a
 * client island (`"use client"`) so Recharts never reaches a Server Component or
 * the shared server bundle. Receives already-computed points as props — no data
 * fetching or business logic here.
 */
export function ScoreTrendChart({ data }: { data: ScoreTrendPoint[] }) {
  const points = data.map((p, i) => ({ ...p, index: i + 1 }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" vertical={false} />
          <XAxis
            dataKey="index"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(15,23,42,0.12)" }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#6b7280", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            cursor={{ stroke: "rgba(99,102,241,0.4)" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.6)",
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(8px)",
              fontSize: 13,
            }}
            labelFormatter={(value) => `Interview ${value}`}
            formatter={(value) => [value as number, "Score"]}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#6366f1" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
