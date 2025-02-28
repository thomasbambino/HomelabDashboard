import { useQuery } from "@tanstack/react-query";
import { GameServer } from "@shared/schema";
import { GameServerCard } from "./game-server-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useEffect, useState } from "react";

interface GameServerListProps {
  className?: string;
}

export function GameServerList({ className }: GameServerListProps) {
  const { data: servers, error, isLoading } = useQuery<GameServer[]>({
    queryKey: ["/api/game-servers"],
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000, // Consider data fresh for 5 seconds
    retry: 3, // Retry failed requests up to 3 times
  });

  // Track which servers are visible
  const [visibleServers, setVisibleServers] = useState<Set<string>>(new Set());
  const observerMap = useRef(new Map<string, IntersectionObserver>());

  useEffect(() => {
    // Cleanup observers when component unmounts
    return () => {
      observerMap.current.forEach(observer => observer.disconnect());
      observerMap.current.clear();
    };
  }, []);

  // Create observer for a server card
  const observeServer = (instanceId: string, element: HTMLElement) => {
    if (observerMap.current.has(instanceId)) {
      observerMap.current.get(instanceId)?.disconnect();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleServers(prev => new Set(prev).add(instanceId));
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    observerMap.current.set(instanceId, observer);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load game servers</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn("grid gap-8 md:grid-cols-2 lg:grid-cols-3", className)}>
      {servers?.map((server) => (
        <div
          key={server.instanceId}
          ref={el => el && observeServer(server.instanceId, el)}
          className="min-h-[200px]"
        >
          {visibleServers.has(server.instanceId) && (
            <GameServerCard server={server} />
          )}
          {!visibleServers.has(server.instanceId) && (
            <div className="h-full w-full rounded-lg border bg-card animate-pulse" />
          )}
        </div>
      ))}
      {!servers && isLoading && (
        <div className="col-span-full flex items-center justify-center text-muted-foreground">
          <div className="animate-pulse">Loading game servers...</div>
        </div>
      )}
      {servers?.length === 0 && (
        <div className="col-span-full text-center text-muted-foreground">
          No game servers found
        </div>
      )}
    </div>
  );
}