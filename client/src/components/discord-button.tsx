import { Button } from "@/components/ui/button";
import { SiDiscord } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";
import { Settings } from "@shared/schema";

export function DiscordButton() {
  const { data: settings } = useQuery<Settings>({ 
    queryKey: ["/api/settings"]
  });

  const handleDiscordClick = () => {
    if (settings?.discord_url) {
      window.open(settings.discord_url, '_blank');
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDiscordClick}
      aria-label="Join Discord"
    >
      <SiDiscord className="h-5 w-5" />
    </Button>
  );
}
