import { GameServer } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Copy, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EditGameServerDialog } from "./edit-game-server-dialog";
import { useState } from "react";

interface GameServerCardProps {
  server: GameServer;
}

export function GameServerCard({ server }: GameServerCardProps) {
  const { toast } = useToast();
  const [showEdit, setShowEdit] = useState(false);
  const connectionString = `${server.host}:${server.port}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(connectionString);
    toast({
      title: "Copied to clipboard",
      description: "Server address has been copied to your clipboard",
    });
  };

  const getServerTypeIcon = () => {
    if (server.icon) return server.icon;
    switch (server.type.toLowerCase()) {
      case 'satisfactory':
        return '🏭';
      case 'minecraft':
        return '⛏️';
      default:
        return '🎮';
    }
  };

  return (
    <Card className={`backdrop-blur-sm bg-background/95 ${server.background ? `bg-[url('${server.background}')] bg-cover` : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getServerTypeIcon()}</span>
          <CardTitle className="text-sm font-medium">
            {server.name}
            <span className="text-xs text-muted-foreground ml-2">
              {server.type}
            </span>
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={server.status ? "default" : "destructive"}>
            {server.status ? "Online" : "Offline"}
          </Badge>
          <Button variant="ghost" size="icon" onClick={() => setShowEdit(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
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

          <div className="grid gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={copyToClipboard}
            >
              <Copy className="h-4 w-4 mr-2" />
              {connectionString}
            </Button>

            {server.info && typeof server.info === 'object' && 'version' in server.info && (
              <p className="text-xs text-muted-foreground">
                Version: {(server.info as { version: string }).version}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Refresh interval: {server.refreshInterval}s
            </p>
          </div>
        </div>
      </CardContent>
      <EditGameServerDialog
        server={server}
        open={showEdit}
        onOpenChange={setShowEdit}
      />
    </Card>
  );
}