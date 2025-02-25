import { useQuery } from "@tanstack/react-query";
import { GameServer } from "@shared/schema";
import { GameServerCard } from "./game-server-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GameServerList() {
  const [isExpanded, setIsExpanded] = useState(false);
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
    <div className="space-y-4">
      <Button
        variant="ghost"
        className="w-full flex justify-between items-center py-2 px-4 hover:bg-accent"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls="game-servers-grid"
      >
        <span className="text-lg font-semibold">
          Game Servers ({servers?.length || 0})
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isExpanded ? "transform rotate-180" : ""
          )}
        />
      </Button>
      <div
        id="game-servers-grid"
        className={cn(
          "grid gap-4 md:grid-cols-2 lg:grid-cols-3 transition-all duration-200",
          isExpanded ? "opacity-100" : "h-0 opacity-0 overflow-hidden"
        )}
      >
        {servers?.map((server) => (
          <GameServerCard key={server.instanceId} server={server} />
        ))}
        {servers?.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground">
            No game servers found
          </div>
        )}
      </div>
    </div>
  );
}