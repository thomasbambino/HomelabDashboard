import { format, subHours } from "date-fns";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { Service, Settings, ServiceStatusLog } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, CalendarIcon, X } from "lucide-react";
import { NavigationBar } from "@/components/navigation-bar";
import { PageTransition } from "@/components/page-transition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

export default function UptimeLogPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [selectedService, setSelectedService] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>(() => {
    const end = new Date();
    const start = subHours(end, 24);
    return { from: start, to: end };
  });

  const { data: settings, isLoading: isLoadingSettings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: services = [], isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: logs = [], isLoading: isLoadingLogs } = useQuery<(ServiceStatusLog & { service: Service })[]>({
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
    <PageTransition>
      <div className="min-h-screen bg-background">
        <NavigationBar settings={settings} pageTitle="Uptime Log" />

        <main className="container mx-auto px-4 pt-24 pb-6 space-y-6">
          <Card className="border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Filters</CardTitle>
              <Link href="/">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {isLoadingServices ? (
                  <Skeleton className="h-10 w-[180px]" />
                ) : (
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
                )}

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
                        variant="outline"
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
            </CardContent>
          </Card>

          <Card className="border-0 shadow-none">
            <CardHeader>
              <CardTitle>Log Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-420px)] rounded-md border">
                {isLoadingLogs ? (
                  <div className="space-y-2 p-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
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
                          className={cn(
                            "px-2 py-1",
                            log.status ? "bg-green-500" : "bg-red-500",
                            "text-white"
                          )}
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
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </main>
      </div>
    </PageTransition>
  );
}