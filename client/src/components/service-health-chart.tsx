import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { ServiceHealthHistory } from "@shared/schema";
import { format } from "date-fns";

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

  const chartData = healthHistory.map(record => ({
    timestamp: new Date(record.timestamp),
    status: record.status ? 100 : 0,
  }));

  return (
    <div className="h-6 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barGap={0}>
          <XAxis
            dataKey="timestamp"
            type="number"
            domain={['auto', 'auto']}
            scale="time"
            hide
          />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            labelFormatter={(label) => format(new Date(label), "MMM d, HH:mm:ss")}
            formatter={(value: number) => [value === 100 ? 'Online' : 'Offline', 'Status']}
          />
          <Bar
            dataKey="status"
            fill={onlineColor}
            stackId="status"
            isAnimationActive={false}
            shape={(props: any) => {
              const { x, y, width, height, value } = props;
              return (
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={value === 100 ? onlineColor : offlineColor}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}