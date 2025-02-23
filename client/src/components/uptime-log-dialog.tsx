import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Service, ServiceStatusLog } from "@shared/schema";
import { format, subHours } from "date-fns";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ScrollText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export function UptimeLogDialog() {
  const [selectedService, setSelectedService] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const end = new Date();
    const start = subHours(end, 24);
    return { from: start, to: end };
  });
  const [open, setOpen] = useState(false);

  // Fetch services for the filter dropdown
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  // Fetch status logs with filters
  const { data: logs = [] } = useQuery<(ServiceStatusLog & { service: Service })[]>({
    queryKey: ["/api/services/status-logs", selectedService, selectedStatus, date?.from?.toISOString(), date?.to?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedService !== "all") params.append("serviceId", selectedService);
      if (selectedStatus !== "all") params.append("status", selectedStatus);
      if (date?.from) params.append("startDate", date.from.toISOString());
      if (date?.to) params.append("endDate", date.to.toISOString());

      const response = await fetch(`/api/services/status-logs?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch status logs");
      return response.json();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ScrollText className="h-4 w-4 mr-2" />
          Uptime Log
        </Button>
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

          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-2 rounded-lg border"
              >
                <div>
                  <span className="font-medium">{log.service.name}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {format(new Date(log.timestamp), "PPp")}
                  </span>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}