import { useQuery } from "@tanstack/react-query";
import { Service, GameServer, Settings } from "@shared/schema";
import { ServiceList } from "@/components/service-list";
import { GameServerList } from "@/components/game-server-list";
import { AddServiceDialog } from "@/components/add-service-dialog";
import { RequestServerDialog } from "@/components/request-server-dialog";
import { SettingsDialog } from "@/components/ui/settings-dialog";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ServerCog, Users, LogOut, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { UptimeLogDialog } from "@/components/uptime-log-dialog";
import { NotificationPreferencesDialog } from "@/components/notification-preferences-dialog";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [isServersExpanded, setIsServersExpanded] = useState(() => {
    const saved = localStorage.getItem('isServersExpanded');
    return saved ? JSON.parse(saved) : false;
  });
  const [isServicesExpanded, setIsServicesExpanded] = useState(() => {
    const saved = localStorage.getItem('isServicesExpanded');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('isServersExpanded', JSON.stringify(isServersExpanded));
  }, [isServersExpanded]);

  useEffect(() => {
    localStorage.setItem('isServicesExpanded', JSON.stringify(isServicesExpanded));
  }, [isServicesExpanded]);

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    refetchInterval: 30000,
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';

  // For admins, only check admin_show_uptime_log
  // For regular users, only check show_uptime_log
  // Make sure to handle each case independently
  const showUptimeLog = (() => {
    if (isAdmin) {
      return Boolean(settings?.admin_show_uptime_log);
    }
    return Boolean(settings?.show_uptime_log);
  })();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt="Site Logo"
                className="h-8 w-8 object-contain"
              />
            ) : (
              <ServerCog className="h-8 w-8 text-primary" />
            )}
            <h1 className="text-3xl font-bold">{settings?.site_title || "Homelab Dashboard"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {(isAdmin || isSuperAdmin) && <SettingsDialog />}
            <NotificationPreferencesDialog />
            {showUptimeLog && <UptimeLogDialog />}
            {(isAdmin || isSuperAdmin) && (
              <Link href="/users">
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Button>
              </Link>
            )}
            <Button variant="outline" onClick={() => logoutMutation.mutate()}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>

        <div className="grid gap-8">
          <section>
            <div 
              className="flex items-center justify-between mb-4 py-2 px-4 rounded-lg hover:bg-accent cursor-pointer transition-colors"
              onClick={() => setIsServersExpanded(!isServersExpanded)}
              role="button"
              aria-expanded={isServersExpanded}
              aria-controls="game-servers-section"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Game Servers</h2>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isServersExpanded ? "transform rotate-180" : ""
                  )}
                />
              </div>
              <div className="flex gap-2">
                <RequestServerDialog />
              </div>
            </div>
            <div
              id="game-servers-section"
              className={cn(
                "transition-all duration-300 ease-in-out",
                isServersExpanded 
                  ? "max-h-[200px] opacity-100" 
                  : "max-h-0 opacity-0 overflow-hidden"
              )}
            >
              <GameServerList />
            </div>
          </section>

          <section>
            <div 
              className="flex items-center justify-between mb-4 py-2 px-4 rounded-lg hover:bg-accent cursor-pointer transition-colors"
              onClick={() => setIsServicesExpanded(!isServicesExpanded)}
              role="button"
              aria-expanded={isServicesExpanded}
              aria-controls="services-section"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Services</h2>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isServicesExpanded ? "transform rotate-180" : ""
                  )}
                />
              </div>
              {(isAdmin || isSuperAdmin) && <AddServiceDialog />}
            </div>
            <div
              id="services-section"
              className={cn(
                "transition-all duration-300 ease-in-out",
                isServicesExpanded 
                  ? "max-h-[2000px] opacity-100" 
                  : "max-h-0 opacity-0 overflow-hidden"
              )}
            >
              {servicesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="h-[120px] bg-card animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <ServiceList services={services} />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}