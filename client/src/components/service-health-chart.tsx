import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { ServiceHealthHistory } from "@shared/schema";
import { format, subHours, subDays, subMonths, addSeconds, isBefore } from "date-fns";

interface ServiceHealthChartProps {
  serviceId: number;
  onlineColor: string;
  offlineColor: string;
  timeScale: string;
}

export function ServiceHealthChart({ serviceId, onlineColor, offlineColor, timeScale }: ServiceHealthChartProps) {
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
  let lastStatus = false;
  let hasDataForPeriod = false;

  while (isBefore(currentTime, now)) {
    // Find records in this time slot
    const recordsInSlot = sortedHistory.filter(record => {
      const recordTime = new Date(record.timestamp);
      return recordTime >= currentTime && recordTime < addSeconds(currentTime, 30);
    });

    if (recordsInSlot.length > 0) {
      // If we have data, use the most recent status in this slot
      const mostRecent = recordsInSlot[recordsInSlot.length - 1];
      lastStatus = mostRecent.status;
      hasDataForPeriod = true;
    }

    chartData.push({
      timestamp: currentTime,
      status: hasDataForPeriod ? (lastStatus ? 100 : 0) : -1, // -1 indicates no data
    });

    currentTime = addSeconds(currentTime, 30);
  }

  return (
    <div className="h-6 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barGap={0} barCategoryGap={0}>
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={[startTime.getTime(), now.getTime()]}
            scale="time"
            hide
          />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            labelFormatter={(label) => format(new Date(label), "MMM d, HH:mm:ss")}
            formatter={(value: number) => {
              if (value === -1) return ['No data', 'Status'];
              return [value === 100 ? 'Online' : 'Offline', 'Status'];
            }}
          />
          <Bar
            dataKey="status"
            fill={onlineColor}
            isAnimationActive={false}
            shape={(props: any) => {
              const { x, y, width, height, value } = props;
              return (
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={value === -1 ? '#94a3b8' : (value === 100 ? onlineColor : offlineColor)}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}