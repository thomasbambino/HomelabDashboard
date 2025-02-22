import { GameServer } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GameServerCardProps {
  server: GameServer;
}

export function GameServerCard({ server }: GameServerCardProps) {
  const { toast } = useToast();
  const connectionString = `${server.host}:${server.port}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(connectionString);
    toast({
      title: "Copied to clipboard",
      description: "Server address has been copied to your clipboard",
    });
  };

  const getServerTypeIcon = () => {
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
    <Card className="backdrop-blur-sm bg-background/95">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {server.name}
          <span className="text-xs text-muted-foreground ml-2">
            {getServerTypeIcon()} {server.type}
          </span>
        </CardTitle>
        <Badge variant={server.status ? "default" : "destructive"}>
          {server.status ? "Online" : "Offline"}
        </Badge>
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
                Version: {server.info.version}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}