import { useQuery } from "@tanstack/react-query";
import { GameServer } from "@shared/schema";
import { GameServerCard } from "./game-server-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameServerListProps {
  className?: string;
  isAdmin?: boolean;
}

export function GameServerList({ className, isAdmin = false }: GameServerListProps) {
  const { data: servers, error, isLoading } = useQuery<GameServer[]>({
    queryKey: ["/api/game-servers"],
  });

  if (isLoading) {
    return <div>Loading game servers...</div>;
  }

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
        <GameServerCard key={server.instanceId} server={server} isAdmin={isAdmin} />
      ))}
      {servers?.length === 0 && (
        <div className="col-span-full text-center text-muted-foreground">
          No game servers found
        </div>
      )}
    </div>
  );
}