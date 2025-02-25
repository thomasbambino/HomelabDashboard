import { GameServer } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CustomizeServerDialog } from "./customize-server-dialog";
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
  const { user } = useAuth();
  const [showCustomizeDialog, setShowCustomizeDialog] = useState(false);

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  // Capitalize first letter of game type
  const capitalizeGameType = (type: string) =>
    type
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  // Format memory to GB with 2 decimal places
  const formatMemoryGB = (memoryMB: number = 0) => (memoryMB / 1024).toFixed(2);

  const copyServerAddress = async (port: string) => {
    const serverAddress = `https://game.stylus.services:${port}`;
    await navigator.clipboard.writeText(serverAddress);
    toast({
      title: "Copied!",
      description: "Server address copied to clipboard",
    });
  };

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
            {user?.role === "admin" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowCustomizeDialog(true)}
              >
                <Settings className="h-4 w-4" />
                <span className="sr-only">Customize server appearance</span>
              </Button>
            )}
            {(server.show_status_badge ?? true) && (
              <Badge
                variant="default"
                style={{
                  backgroundColor: server.status
                    ? settings?.onlineColor || "#22c55e"
                    : settings?.offlineColor || "#ef4444",
                  color: "white",
                }}
              >
                {server.status ? "Online" : "Offline"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
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
                <span>
                  {formatMemoryGB(server.memoryUsage)} /
                  {formatMemoryGB(server.maxMemory)} GB
                </span>
              </div>
            </div>

            {/* Server Address */}
            {server.port && (
              <div className="flex justify-end mt-2">
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

      <CustomizeServerDialog
        server={server}
        open={showCustomizeDialog}
        onOpenChange={setShowCustomizeDialog}
      />
    </>
  );
}