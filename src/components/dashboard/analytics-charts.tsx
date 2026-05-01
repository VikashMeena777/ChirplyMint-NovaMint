"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartDataPoint {
  label: string;
  count: number;
}

interface AnalyticsAreaChartProps {
  data: ChartDataPoint[];
  color: string;
  gradientId: string;
  emptyMessage?: string;
}

// Custom tooltip component
function CustomTooltip({
  active,
  payload,
  label,
  color,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  color: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-bold" style={{ color }}>
        {payload[0].value}
      </p>
    </div>
  );
}

export function AnalyticsAreaChart({
  data,
  color,
  gradientId,
}: AnalyticsAreaChartProps) {
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            strokeOpacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            allowDecimals={false}
          />
          <Tooltip
            content={<CustomTooltip color={color} />}
            cursor={{
              stroke: color,
              strokeOpacity: 0.2,
              strokeDasharray: "4 4",
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={{ r: 4, fill: color, strokeWidth: 2, stroke: "var(--card)" }}
            activeDot={{
              r: 6,
              fill: color,
              strokeWidth: 2,
              stroke: "var(--card)",
            }}
            animationDuration={1200}
            animationEasing="ease-in-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AnalyticsBarChart({
  data,
  color,
  gradientId,
}: AnalyticsAreaChartProps) {
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.9} />
              <stop offset="100%" stopColor={color} stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            strokeOpacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            allowDecimals={false}
          />
          <Tooltip
            content={<CustomTooltip color={color} />}
            cursor={{ fill: color, fillOpacity: 0.06 }}
          />
          <Bar
            dataKey="count"
            fill={`url(#${gradientId})`}
            radius={[6, 6, 0, 0]}
            animationDuration={1000}
            animationEasing="ease-in-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
