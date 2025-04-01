import { useQuery } from "@tanstack/react-query";
import { GameServer } from "@shared/schema";
import { GameServerCard } from "./game-server-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useEffect, useState, useMemo } from "react";

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

  // Sort servers: Online first, grouped by type, then offline
  const sortedServers = useMemo(() => {
    if (!servers) return [];
    
    // Group servers by type
    const serversByType = servers.reduce((groups, server) => {
      const type = server.type || 'unknown';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(server);
      return groups;
    }, {} as Record<string, GameServer[]>);
    
    // First, collect online servers grouped by type
    const result: GameServer[] = [];
    
    // Add online servers first, grouped by type
    Object.keys(serversByType).sort().forEach(type => {
      // Get all online servers of this type
      const onlineServersOfType = serversByType[type].filter(server => server.status);
      
      // Sort online servers of this type by name
      onlineServersOfType.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      // Add them to result
      result.push(...onlineServersOfType);
    });
    
    // Then add offline servers, also grouped by type
    Object.keys(serversByType).sort().forEach(type => {
      // Get all offline servers of this type
      const offlineServersOfType = serversByType[type].filter(server => !server.status);
      
      // Sort offline servers of this type by name
      offlineServersOfType.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      // Add them to result
      result.push(...offlineServersOfType);
    });
    
    return result;
  }, [servers]);

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
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {sortedServers.map((server) => (
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
      {sortedServers.length === 0 && (
        <div className="col-span-full text-center text-muted-foreground">
          No game servers found
        </div>
      )}
    </div>
  );
}