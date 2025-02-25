import { GameServer } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Play, PowerOff, RefreshCw, Activity, Cpu, HardDrive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Settings {
  onlineColor?: string;
  offlineColor?: string;
  beta_features?: boolean;
}

interface GameServerCardProps {
  server: GameServer;
}

interface MetricsData {
  TPS: string;
  Users: [string, string];
  CPU: string;
  Memory: [string, string];
  Uptime: string;
}

export function GameServerCard({ server }: GameServerCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  // Query for real-time metrics
  const { data: metrics } = useQuery<MetricsData>({
    queryKey: ["/api/game-servers", server.instanceId, "metrics"],
    enabled: !!server.instanceId && server.status && settings?.beta_features,
    refetchInterval: server.refreshInterval || 30000,
  });

  // Mutations for server control
  const startServerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/game-servers/${server.instanceId}/start`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game-servers"] });
      toast({
        title: "Server starting",
        description: "The game server is starting up",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start server",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stopServerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/game-servers/${server.instanceId}/stop`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game-servers"] });
      toast({
        title: "Server stopping",
        description: "The game server is shutting down",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to stop server",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/game-servers/${server.instanceId}/hide`, {
        hidden: !server.hidden,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game-servers"] });
      toast({
        title: server.hidden ? "Server visible" : "Server hidden",
        description: `The game server is now ${server.hidden ? "visible" : "hidden"} from the dashboard`,
      });
    },
  });

  // Safe access to metrics with defaults
  const playerCount = metrics?.Users?.[0] ? Number(metrics.Users[0]) : 0;
  const maxPlayers = metrics?.Users?.[1] ? Number(metrics.Users[1]) : (server.maxPlayers || 0);
  const tps = metrics?.TPS ? Number(metrics.TPS).toFixed(1) : '0.0';
  const cpu = metrics?.CPU ? Number(metrics.CPU).toFixed(1) : '0.0';
  const memoryGB = metrics?.Memory?.[0] ? (Number(metrics.Memory[0]) / 1024).toFixed(1) : '0.0';

  return (
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
              {server.type}
            </span>
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
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
          {isAdmin && settings?.beta_features && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleVisibilityMutation.mutate()}
                disabled={toggleVisibilityMutation.isPending}
              >
                {server.hidden ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => server.status ? stopServerMutation.mutate() : startServerMutation.mutate()}
                disabled={startServerMutation.isPending || stopServerMutation.isPending}
              >
                {server.status ? (
                  <PowerOff className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {settings?.beta_features && (server.show_player_count ?? true) && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Players</span>
                <span>{playerCount}/{maxPlayers}</span>
              </div>
              <Progress
                value={(playerCount / (maxPlayers || 1)) * 100}
                className="h-2"
              />
            </div>
          )}

          {settings?.beta_features && server.status && metrics && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4" />
                <span>TPS: {tps}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Cpu className="h-4 w-4" />
                <span>CPU: {cpu}%</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <HardDrive className="h-4 w-4" />
                <span>RAM: {memoryGB}GB</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}