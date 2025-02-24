import { useQuery } from "@tanstack/react-query";
import { GameServer } from "@shared/schema";
import { GameServerCard } from "./game-server-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function GameServerList() {
  const [showHidden, setShowHidden] = useState(false);

  const { data: servers, error, isLoading } = useQuery<GameServer[]>({
    queryKey: ["/api/game-servers", { showHidden }],
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
      <div className="flex items-center space-x-2">
        <Switch
          id="show-hidden"
          checked={showHidden}
          onCheckedChange={setShowHidden}
        />
        <Label htmlFor="show-hidden">Show hidden servers</Label>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
