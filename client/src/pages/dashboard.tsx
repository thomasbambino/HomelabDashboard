import { useQuery } from "@tanstack/react-query";
import { Service, GameServer } from "@shared/schema";
import { ServiceCard } from "@/components/service-card";
import { GameServerCard } from "@/components/game-server-card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function Dashboard() {
  const { logoutMutation } = useAuth();

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    refetchInterval: 30000, // 30 seconds
  });

  const { data: gameServers = [], isLoading: serversLoading } = useQuery<GameServer[]>({
    queryKey: ["/api/game-servers"],
    refetchInterval: 30000,
  });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">HomeLab Monitor</h1>
          <Button variant="outline" onClick={() => logoutMutation.mutate()}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid gap-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servicesLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-[120px] bg-card animate-pulse rounded-lg" />
                ))
              ) : (
                services.map((service) => (
                  <ServiceCard key={service.id} service={service} />
                ))
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Game Servers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {serversLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-[160px] bg-card animate-pulse rounded-lg" />
                ))
              ) : (
                gameServers.map((server) => (
                  <GameServerCard key={server.id} server={server} />
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
