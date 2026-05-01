"use client";

import dynamic from "next/dynamic";

const InsightsTrendChartInner = dynamic(
  () => import("./insights-trend-chart-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 w-full rounded-lg bg-muted/30 animate-pulse" />
    ),
  }
);

interface DailyTrendPoint {
  date: string;
  dms: number;
  leads: number;
}

export default function InsightsTrendChart({
  data,
}: {
  data: DailyTrendPoint[];
}) {
  return <InsightsTrendChartInner data={data} />;
}
