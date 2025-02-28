import { useQuery } from "@tanstack/react-query";
import { Service, Settings } from "@shared/schema";
import { ServiceList } from "@/components/service-list";
import { GameServerList } from "@/components/game-server-list";
import { AddServiceDialog } from "@/components/add-service-dialog";
import { RequestServerDialog } from "@/components/request-server-dialog";
import { useAuth } from "@/hooks/use-auth";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavigationBar } from "@/components/navigation-bar";
import { PageTransition } from "@/components/page-transition";
import { useState, useEffect } from "react";
import { LayoutDebugger } from "@/components/layout-debugger";

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

  // Layout debug state
  const [horizontalPadding, setHorizontalPadding] = useState(32); // 32px = 8rem
  const [maxWidth, setMaxWidth] = useState(1400);

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
        <main style={{ maxWidth: maxWidth, padding: `0 ${horizontalPadding}px` }} className="mx-auto mt-24 pb-6">
          <div className="animate-pulse space-y-8">
            <div className="h-8 w-48 bg-primary/20 rounded" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <NavigationBar settings={settings} />

        <main 
          style={{ 
            maxWidth: `${maxWidth}px`,
            paddingLeft: `${horizontalPadding}px`,
            paddingRight: `${horizontalPadding}px`
          }} 
          className="mx-auto mt-24 pb-6 space-y-8"
        >
          <section className="relative">
            <div
              className="flex items-center justify-between mb-4"
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
                "transition-all duration-300 ease-in-out overflow-hidden",
                isServersExpanded ? "opacity-100 h-auto" : "opacity-0 h-0"
              )}
            >
              <GameServerList />
            </div>
          </section>

          <section className="relative">
            <div
              className="flex items-center justify-between mb-4"
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
                "transition-all duration-300 ease-in-out overflow-hidden",
                isServicesExpanded ? "opacity-100 h-auto" : "opacity-0 h-0"
              )}
            >
              {servicesLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <LayoutDebugger
          onPaddingChange={setHorizontalPadding}
          onWidthChange={setMaxWidth}
        />
      </div>
    </PageTransition>
  );
}