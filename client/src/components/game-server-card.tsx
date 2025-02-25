import { GameServer } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, PlayCircle, StopCircle, RefreshCcw, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { EditGameServerDialog } from "./edit-game-server-dialog";
import { useAuth } from "@/hooks/use-auth";

interface Settings {
  onlineColor?: string;
  offlineColor?: string;
}

interface GameServerCardProps {
  server: GameServer;
}

export function GameServerCard({ server }: GameServerCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  // Convert MB to GB with 2 decimal places
  const mbToGb = (mb: number) => (mb / 1024).toFixed(2);

  // Capitalize first letter of game type
  const capitalizeGameType = (type: string) => 
    type.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  const copyServerAddress = async (port: string) => {
    const serverAddress = `https://game.stylus.services:${port}`;
    await navigator.clipboard.writeText(serverAddress);
    toast({
      title: "Copied!",
      description: "Server address copied to clipboard",
    });
  };

  // Server control mutations
  const startMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/game-servers/${server.instanceId}/start`);
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game-servers"] });
      toast({
        title: "Server Starting",
        description: "The game server is starting up",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start server",
        variant: "destructive",
      });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/game-servers/${server.instanceId}/stop`);
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game-servers"] });
      toast({
        title: "Server Stopping",
        description: "The game server is shutting down",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to stop server",
        variant: "destructive",
      });
    },
  });

  const restartMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/game-servers/${server.instanceId}/restart`);
      const data = await response.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game-servers"] });
      toast({
        title: "Server Restarting",
        description: "The game server is restarting",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to restart server",
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Card className={`backdrop-blur-sm bg-background/95 ${server.background ? `bg-[url('${server.background}')] bg-cover` : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            {server.icon ? (
              <img src={server.icon} alt={`${server.name} icon`} className="w-6 h-6 object-contain" />
            ) : (
              <span className="text-xl">🎮</span>
            )}
            <CardTitle className="text-sm font-medium">
              {server.displayName || server.name}
              <span className="text-xs text-muted-foreground ml-2">
                {capitalizeGameType(server.type)}
              </span>
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === 'admin' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowEditDialog(true)}
              >
                <Settings className="h-4 w-4" />
                <span className="sr-only">Edit server settings</span>
              </Button>
            )}
            {(server.show_status_badge ?? true) && (
              <Badge
                variant="default"
                style={{
                  backgroundColor: server.status ?
                    settings?.onlineColor || "#22c55e" :
                    settings?.offlineColor || "#ef4444",
                  color: "white"
                }}
              >
                {server.status ? "Online" : "Offline"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Metrics in a grid layout */}
            <div className="grid grid-cols-3 gap-2 text-sm">
              {(server.show_player_count ?? true) && (
                <div>
                  <span className="text-muted-foreground">Players:</span>
                  <br />
                  <span>{server.playerCount ?? 0}/{server.maxPlayers ?? 0}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">CPU:</span>
                <br />
                <span>{server.cpuUsage ?? 0}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">RAM:</span>
                <br />
                <span>{mbToGb(server.memoryUsage ?? 0)}/{mbToGb(server.maxMemory ?? 0)} GB</span>
              </div>
            </div>

            {/* Server Controls */}
            <div className="flex items-center justify-between gap-2 mt-4 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startMutation.mutate()}
                  disabled={startMutation.isPending || server.status}
                >
                  <PlayCircle className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => stopMutation.mutate()}
                  disabled={stopMutation.isPending || !server.status}
                >
                  <StopCircle className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => restartMutation.mutate()}
                  disabled={restartMutation.isPending || !server.status}
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>

              {/* Server Address */}
              {server.port && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => copyServerAddress(server.port)}
                >
                  <span className="mr-2">game.stylus.services:{server.port}</span>
                  <Copy className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <EditGameServerDialog
        server={server}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
    </>
  );
}