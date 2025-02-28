import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NavIconButton } from "@/components/ui/nav-icon-button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Service, Settings, ServiceStatusLog } from "@shared/schema";
import { format, subHours } from "date-fns";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Activity, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";

interface UptimeLogDialogProps {
  children?: React.ReactNode;
}

export function UptimeLogDialog({ children }: UptimeLogDialogProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [selectedService, setSelectedService] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const end = new Date();
    const start = subHours(end, 24);
    return { from: start, to: end };
  });
  const [open, setOpen] = useState(false);

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: logs = [] } = useQuery<(ServiceStatusLog & { service: Service })[]>({
    queryKey: ["/api/services/status-logs", selectedService, selectedStatus, date?.from?.toISOString(), date?.to?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (selectedService !== "all") {
        params.append("serviceId", selectedService);
      }

      if (selectedStatus !== "all") {
        params.append("status", selectedStatus === "true" ? "true" : "false");
      }

      if (date?.from) params.append("startDate", date.from.toISOString());
      if (date?.to) params.append("endDate", date.to.toISOString());

      const queryString = params.toString();
      const url = `/api/services/status-logs${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch status logs: ${errorText}`);
      }
      return response.json();
    },
    refetchInterval: 30000,
  });

  const showUptimeLog = isAdmin ? settings?.admin_show_uptime_log : settings?.show_uptime_log;

  if (!showUptimeLog) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <NavIconButton>
            <Activity className="h-4 w-4" />
            Uptime Log
          </NavIconButton>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Service Uptime Log</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={String(service.id)}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Online</SelectItem>
                <SelectItem value="false">Offline</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[280px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(date.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              {date && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const end = new Date();
                    const start = subHours(end, 24);
                    setDate({ from: start, to: end });
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="h-[400px] rounded-md border p-4">
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div>
                      <span className="font-medium">{log.service.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {format(new Date(log.timestamp), "PPp")}
                      </span>
                    </div>
                    {log.responseTime && (
                      <div className="text-sm text-muted-foreground">
                        Response time: {log.responseTime}ms
                      </div>
                    )}
                  </div>
                  <Badge
                    variant="default"
                    style={{
                      backgroundColor: log.status ? "#22c55e" : "#ef4444",
                      color: "white"
                    }}
                  >
                    {log.status ? "Online" : "Offline"}
                  </Badge>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  No status changes found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}