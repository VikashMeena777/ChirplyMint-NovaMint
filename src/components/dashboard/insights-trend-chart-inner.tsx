"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DailyTrendPoint {
  date: string;
  dms: number;
  leads: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          className="text-sm font-semibold flex items-center gap-2"
          style={{ color: entry.color }}
        >
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: entry.color }}
          />
          {entry.dataKey === "dms" ? "DMs" : "Leads"}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export default function InsightsTrendChartInner({
  data,
}: {
  data: DailyTrendPoint[];
}) {
  // Show only every Nth label to avoid overcrowding on 30 days
  const labelInterval = data.length > 14 ? 4 : data.length > 7 ? 2 : 0;

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="trendDmGrad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="oklch(0.52 0.19 162)"
                stopOpacity={0.35}
              />
              <stop
                offset="95%"
                stopColor="oklch(0.52 0.19 162)"
                stopOpacity={0.02}
              />
            </linearGradient>
            <linearGradient id="trendLeadGrad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="oklch(0.65 0.15 250)"
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor="oklch(0.65 0.15 250)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            strokeOpacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            interval={labelInterval}
            dy={6}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="dms"
            stroke="oklch(0.52 0.19 162)"
            strokeWidth={2}
            fill="url(#trendDmGrad)"
            dot={false}
            activeDot={{
              r: 5,
              fill: "oklch(0.52 0.19 162)",
              strokeWidth: 2,
              stroke: "var(--card)",
            }}
            animationDuration={1200}
          />
          <Area
            type="monotone"
            dataKey="leads"
            stroke="oklch(0.65 0.15 250)"
            strokeWidth={2}
            fill="url(#trendLeadGrad)"
            dot={false}
            activeDot={{
              r: 5,
              fill: "oklch(0.65 0.15 250)",
              strokeWidth: 2,
              stroke: "var(--card)",
            }}
            animationDuration={1400}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
