import { GameServer } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Bug, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [showDebug, setShowDebug] = useState(false);

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const { data: debugInfo, isLoading: debugLoading, error: debugError } = useQuery({
    queryKey: [`/api/game-servers/${server.instanceId}/debug`],
    enabled: showDebug,
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
                  onClick={() => setShowDebug(true)}
                >
                  <Bug className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(server.show_player_count ?? true) && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Players</span>
                  <span>{server.playerCount ?? 0}/{server.maxPlayers ?? 0}</span>
                </div>
                <Progress
                  value={((server.playerCount ?? 0) / (server.maxPlayers ?? 1)) * 100}
                  className="h-2"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDebug} onOpenChange={setShowDebug}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Debug Info: {server.name}</DialogTitle>
          </DialogHeader>
          {debugLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading debug information...</span>
            </div>
          ) : debugError ? (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to load debug information: {debugError instanceof Error ? debugError.message : 'Unknown error'}
              </AlertDescription>
            </Alert>
          ) : debugInfo ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Instance Info:</h3>
                <pre className="bg-muted p-2 rounded-md text-xs overflow-auto">
                  {JSON.stringify(debugInfo.instanceInfo, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold">Metrics Data:</h3>
                <pre className="bg-muted p-2 rounded-md text-xs overflow-auto">
                  {JSON.stringify(debugInfo.metrics, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold">User List Data:</h3>
                <pre className="bg-muted p-2 rounded-md text-xs overflow-auto">
                  {JSON.stringify(debugInfo.userList, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold">Active Users:</h3>
                <div className="bg-muted p-2 rounded-md text-sm">
                  Current: {debugInfo.activeUsers || 0}
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Server State:</h3>
                <div className="bg-muted p-2 rounded-md text-sm">
                  {debugInfo.state || 'Unknown'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              No debug information available
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}