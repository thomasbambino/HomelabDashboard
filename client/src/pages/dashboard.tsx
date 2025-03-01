import { useQuery } from "@tanstack/react-query";
import { Service, GameServer, Settings } from "@shared/schema";
import { ServiceList } from "@/components/service-list";
import { GameServerList } from "@/components/game-server-list";
import { AddServiceDialog } from "@/components/add-service-dialog";
import { RequestServerDialog } from "@/components/request-server-dialog";
import { useAuth } from "@/hooks/use-auth";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavigationBar } from "@/components/navigation-bar";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const { user } = useAuth();
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

  const { data: settings, isLoading: settingsLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    refetchInterval: 30000,
  });

  const isAdmin = user?.role === 'admin';
  const isSuperAdmin = user?.role === 'superadmin';

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <main className="max-w-[1400px] mx-auto px-8 mt-24 pb-6">
          <div className="animate-pulse space-y-8">
            <div className="h-8 w-48 bg-primary/20 rounded" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <NavigationBar settings={settings} />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-8 pt-36 pb-6 space-y-8">
        <section className="relative">
          <div
            className="flex items-center justify-between mb-4 cursor-pointer"
            onClick={() => setIsServersExpanded(!isServersExpanded)}
            role="button"
            aria-expanded={isServersExpanded}
            aria-controls="game-servers-section"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">Game Servers</h2>
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
              "transition-[max-height] duration-300 ease-in-out overflow-hidden",
              isServersExpanded ? "max-h-[2000px]" : "max-h-0"
            )}
          >
            <GameServerList />
          </div>
        </section>

        <section className="relative">
          <div
            className="flex items-center justify-between mb-4 cursor-pointer"
            onClick={() => setIsServicesExpanded(!isServicesExpanded)}
            role="button"
            aria-expanded={isServicesExpanded}
            aria-controls="services-section"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">Services</h2>
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
              "transition-[max-height] duration-300 ease-in-out overflow-hidden",
              isServicesExpanded ? "max-h-[2000px]" : "max-h-0"
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
      </main>
    </div>
  );
}