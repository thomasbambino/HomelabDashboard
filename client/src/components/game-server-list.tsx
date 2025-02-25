import { useQuery } from "@tanstack/react-query";
import { GameServer } from "@shared/schema";
import { GameServerCard } from "./game-server-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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
      {servers?.map((server) => (
        <GameServerCard key={server.instanceId} server={server} />
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