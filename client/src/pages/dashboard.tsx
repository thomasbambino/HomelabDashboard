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
import { PageTransition } from "@/components/page-transition";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { LoginAttemptsDialog } from "@/components/login-attempts-dialog";
import { Shield, KeyRound, Trash2, Save, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";


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

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/settings"],
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/services"],
    refetchInterval: 30000,
  });

  const isAdmin = user?.role === 'admin';
  const isSuperAdmin = user?.role === 'superadmin';

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="grid grid-cols-[0.5fr_minmax(auto,900px)_1.5fr] px-8">
          <div className="col-start-2 mt-24 pb-6">
            <div className="animate-pulse space-y-8">
              <div className="h-8 w-48 bg-primary/20 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <NavigationBar settings={settings} />

        {/* Main grid container with asymmetric columns */}
        <div className="grid grid-cols-[0.5fr_minmax(auto,900px)_1.5fr] px-8">
          {/* Content area in the middle column */}
          <main className="col-start-2 mt-24 pb-6 space-y-8">
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
        </div>
      </div>
    </PageTransition>
  );
}