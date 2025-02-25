import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { ServiceStatusLog } from "@shared/schema";
import { format, subHours, subDays, subMonths, addSeconds, isBefore } from "date-fns";
import { useState, useEffect, useRef } from "react";

interface ServiceHealthChartProps {
  serviceId: number;
  onlineColor: string;
  offlineColor: string;
  timeScale: string;
}

interface ChartDataPoint {
  timestamp: Date;
  status: number;
}

export function ServiceHealthChart({ serviceId, onlineColor, offlineColor, timeScale }: ServiceHealthChartProps) {
  const [tooltipTime, setTooltipTime] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Only fetch data when component is visible
  const { data: healthHistory } = useQuery<ServiceStatusLog[]>({
    queryKey: [`/api/services/${serviceId}/health-history`, timeScale],
    enabled: isVisible, // Only fetch when visible
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Intersection Observer for visibility detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  if (!healthHistory?.length) {
    return (
      <div ref={containerRef} className="h-6 flex items-center justify-center text-muted-foreground text-sm">
        No health history available
      </div>
    );
  }

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

  // Optimize data aggregation based on time scale
  const aggregationSeconds = timeScale === '1m' ? 300 : // 5 minutes for month view
                           timeScale === '1w' ? 120 : // 2 minutes for week view
                           timeScale === '24h' ? 60 : // 1 minute for day view
                           5; // 5 seconds for shorter periods

  const sortedHistory = [...healthHistory]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .filter(record => new Date(record.timestamp) >= startTime);

  const chartData: ChartDataPoint[] = [];
  let currentTime = startTime;
  let lastStatus = false;
  let hasDataForPeriod = false;

  while (isBefore(currentTime, now)) {
    const recordsInSlot = sortedHistory.filter(record => {
      const recordTime = new Date(record.timestamp);
      return recordTime >= currentTime && recordTime < addSeconds(currentTime, aggregationSeconds);
    });

    if (recordsInSlot.length > 0) {
      const mostRecent = recordsInSlot[recordsInSlot.length - 1];
      lastStatus = mostRecent.status;
      hasDataForPeriod = true;
    }

    chartData.push({
      timestamp: currentTime,
      status: hasDataForPeriod ? (lastStatus ? 100 : 0) : -1,
    });

    currentTime = addSeconds(currentTime, aggregationSeconds);
  }

  return (
    <div ref={containerRef} className="relative h-6 w-full rounded-md overflow-hidden group">
      {tooltipTime && (
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md z-10 pointer-events-none transition-opacity"
        >
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
          <YAxis hide domain={[0, 100]} />
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