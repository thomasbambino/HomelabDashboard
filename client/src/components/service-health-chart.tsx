import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { ServiceHealthHistory } from "@shared/schema";
import { format, subHours, subDays, subMonths } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

interface ServiceHealthChartProps {
  serviceId: number;
  onlineColor: string;
  offlineColor: string;
}

type TimeScale = '1h' | '6h' | '12h' | '24h' | '1w' | '1m';

export function ServiceHealthChart({ serviceId, onlineColor, offlineColor }: ServiceHealthChartProps) {
  const [timeScale, setTimeScale] = useState<TimeScale>('1h');

  // Calculate the start date based on the selected time scale
  const getStartDate = () => {
    const now = new Date();
    switch (timeScale) {
      case '1h': return subHours(now, 1);
      case '6h': return subHours(now, 6);
      case '12h': return subHours(now, 12);
      case '24h': return subHours(now, 24);
      case '1w': return subDays(now, 7);
      case '1m': return subMonths(now, 1);
    }
  };

  const { data: healthHistory } = useQuery<ServiceHealthHistory[]>({
    queryKey: [`/api/services/${serviceId}/health-history`, timeScale],
  });

  if (!healthHistory?.length) {
    return (
      <div className="h-[60px] flex items-center justify-center text-muted-foreground">
        No health history available
      </div>
    );
  }

  // Filter data based on the selected time scale
  const startDate = getStartDate();
  const filteredData = healthHistory.filter(record => 
    new Date(record.timestamp) >= startDate
  );

  const chartData = filteredData.map(record => ({
    timestamp: new Date(record.timestamp),
    status: record.status ? 100 : 0,
  }));

  return (
    <div className="space-y-2">
      <div className="flex justify-end px-2">
        <Select value={timeScale} onValueChange={(value: TimeScale) => setTimeScale(value)}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">1 hour</SelectItem>
            <SelectItem value="6h">6 hours</SelectItem>
            <SelectItem value="12h">12 hours</SelectItem>
            <SelectItem value="24h">24 hours</SelectItem>
            <SelectItem value="1w">1 week</SelectItem>
            <SelectItem value="1m">1 month</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="h-[60px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={0}>
            <XAxis
              dataKey="timestamp"
              tickFormatter={(time) => format(new Date(time), "HH:mm")}
              type="number"
              domain={['auto', 'auto']}
              scale="time"
              hide
            />
            <YAxis hide domain={[0, 100]} />
            <Tooltip
              labelFormatter={(label) => format(new Date(label), "HH:mm:ss")}
              formatter={(value: number) => [value === 100 ? 'Online' : 'Offline', 'Status']}
            />
            <Bar
              dataKey="status"
              fill={onlineColor}
              stackId="status"
              isAnimationActive={false}
              shape={(props) => {
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
    </div>
  );
}