import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { ServiceHealthHistory } from "@shared/schema";
import { format } from "date-fns";

interface ServiceHealthChartProps {
  serviceId: number;
  onlineColor: string;
  offlineColor: string;
}

export function ServiceHealthChart({ serviceId, onlineColor, offlineColor }: ServiceHealthChartProps) {
  const { data: healthHistory } = useQuery<ServiceHealthHistory[]>({
    queryKey: [`/api/services/${serviceId}/health-history`],
  });

  if (!healthHistory?.length) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
        No health history available
      </div>
    );
  }

  const chartData = healthHistory.map(record => ({
    timestamp: new Date(record.timestamp),
    status: record.status ? 100 : 0,
    responseTime: record.responseTime,
  }));

  return (
    <div className="h-[200px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="status" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={onlineColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={onlineColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis
            dataKey="timestamp"
            tickFormatter={(time) => format(new Date(time), "HH:mm")}
            type="number"
            domain={['auto', 'auto']}
            scale="time"
          />
          <YAxis 
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            labelFormatter={(label) => format(new Date(label), "HH:mm:ss")}
            formatter={(value: number) => [`${value}%`, 'Status']}
          />
          <Area
            type="stepAfter"
            dataKey="status"
            stroke={onlineColor}
            fillOpacity={1}
            fill="url(#status)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
