import { GameServer } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Settings {
  onlineColor?: string;
  offlineColor?: string;
}

interface GameServerCardProps {
  server: GameServer;
}

export function GameServerCard({ server }: GameServerCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
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

  const copyServerAddress = async (port: string) => {
    const serverAddress = `https://game.stylus.services:${port}`;
    await navigator.clipboard.writeText(serverAddress);
    toast({
      title: "Copied!",
      description: "Server address copied to clipboard",
    });
  };

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
          {isAdmin && (
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
              <span>{server.memoryUsage ?? 0}/{server.maxMemory ?? 0} MB</span>
            </div>
          </div>

          {/* Server Address */}
          {server.port && (
            <div className="flex items-center justify-between mt-4 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Server Address:</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => copyServerAddress(server.port)}
              >
                <span className="mr-2">game.stylus.services:{server.port}</span>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}