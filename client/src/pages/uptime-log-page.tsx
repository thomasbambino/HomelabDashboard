import { format, subHours } from "date-fns";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { Service, Settings, ServiceStatusLog } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, CalendarIcon, Activity, X } from "lucide-react";
import { NavigationBar } from "@/components/navigation-bar";
import { PageTransition } from "@/components/page-transition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

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
    <PageTransition>
      <div className="min-h-screen bg-background">
        <NavigationBar settings={settings} pageTitle="Uptime Log" />

        <main className="max-w-[1400px] mx-auto px-8 pt-20 pb-6 space-y-4">
          <Card className="border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
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
                    <PopoverContent className="w-auto p-0">
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

          <Separator className="mx-auto w-full max-w-[calc(100%-2rem)] bg-border/60" />

          <Card className="border-0 shadow-none">
            <CardContent className="pt-6">
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-2">
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
            </CardContent>
          </Card>
        </main>
      </div>
    </PageTransition>
  );
}
