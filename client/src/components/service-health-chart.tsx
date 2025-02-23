import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { ServiceHealthHistory } from "@shared/schema";
import { format, subHours, subDays, subMonths, addSeconds, isBefore } from "date-fns";
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

  // Sort history by timestamp and filter to selected time range
  const sortedHistory = [...healthHistory]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .filter(record => new Date(record.timestamp) >= startTime);

  // Create continuous data with gaps filled
  const chartData = [];
  let currentTime = startTime;

  while (isBefore(currentTime, now)) {
    // Find records in this time slot
    const recordsInSlot = sortedHistory.filter(record => {
      const recordTime = new Date(record.timestamp);
      return recordTime >= currentTime && recordTime < addSeconds(currentTime, 5);
    });

    // Add data point for this time slot
    if (recordsInSlot.length > 0) {
      // If we have data, use the most recent status in this slot
      const mostRecent = recordsInSlot[recordsInSlot.length - 1];
      chartData.push({
        timestamp: currentTime,
        status: mostRecent.status ? 100 : 0, // 100 for online, 0 for offline
      });
    } else {
      // No data for this slot
      chartData.push({
        timestamp: currentTime,
        status: -1, // -1 indicates no data
      });
    }

    currentTime = addSeconds(currentTime, 5);
  }

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
          <YAxis hide domain={[-1, 100]} />
          <Bar
            dataKey="status"
            fill={onlineColor}
            isAnimationActive={false}
            shape={(props) => {
              const { x, y, width, height, value } = props;
              let color;
              if (value === -1) {
                color = '#94a3b8'; // gray for no data
              } else if (value === 0) {
                color = offlineColor; // red for offline
              } else {
                color = onlineColor; // green for online
              }

              return (
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={color}
                  rx={3}
                  ry={3}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}