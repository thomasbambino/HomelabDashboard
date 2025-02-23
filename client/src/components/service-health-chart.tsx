import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { ServiceHealthHistory } from "@shared/schema";
import { format, subHours, subDays, subMonths } from "date-fns";
import { useState } from "react";

interface ServiceHealthChartProps {
  serviceId: number;
  onlineColor: string;
  offlineColor: string;
  timeScale: string;
}

export function ServiceHealthChart({ serviceId, onlineColor, offlineColor, timeScale }: ServiceHealthChartProps) {
  const [tooltipTime, setTooltipTime] = useState<string | null>(null);

  const { data: healthHistory } = useQuery<ServiceHealthHistory[]>({
    queryKey: [`/api/services/${serviceId}/health-history`, timeScale],
  });

  if (!healthHistory?.length) {
    return (
      <div className="h-6 flex items-center justify-center text-muted-foreground text-sm">
        No health history available
      </div>
    );
  }

  // Calculate start time based on timeScale
  const now = new Date();
  let startTime = now;
  switch (timeScale) {
    case '1h': startTime = subHours(now, 1); break;
    case '6h': startTime = subHours(now, 6); break;
    case '12h': startTime = subHours(now, 12); break;
    case '24h': startTime = subHours(now, 24); break;
    case '1w': startTime = subDays(now, 7); break;
    case '1m': startTime = subMonths(now, 1); break;
  }

  // Filter health records to the selected time range and format for chart
  const chartData = healthHistory
    .filter(record => new Date(record.timestamp) >= startTime)
    .map(record => ({
      timestamp: new Date(record.timestamp),
      status: record.status
    }));

  return (
    <div className="relative h-6 w-full rounded-md overflow-hidden group">
      {tooltipTime && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md z-10 pointer-events-none transition-opacity">
          {tooltipTime}
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          barGap={0}
          barCategoryGap={0}
          onMouseMove={(e) => {
            if (e.activeTooltipIndex !== undefined && chartData[e.activeTooltipIndex]) {
              setTooltipTime(format(chartData[e.activeTooltipIndex].timestamp, "MMM d, HH:mm:ss"));
            }
          }}
          onMouseLeave={() => setTooltipTime(null)}
        >
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={[startTime.getTime(), now.getTime()]}
            scale="time"
            hide
          />
          <YAxis hide domain={[0, 1]} />
          <Bar
            dataKey="status"
            isAnimationActive={false}
            shape={({ x, y, width, height, value }) => (
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={value ? onlineColor : offlineColor}
                rx={3}
                ry={3}
              />
            )}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}