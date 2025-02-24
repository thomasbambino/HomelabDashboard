import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChatPanel } from "./ChatPanel";
import { useState } from "react";
import { DiscordButton } from "@/components/discord-button";
import { useLocation } from "wouter";

export function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  // Don't render on the auth page
  if (location === "/auth") {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Open chat"
          >
            <MessageSquare className="h-5 w-5" />
            {/* Add notification dot when there are unread messages */}
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0">
          <ChatPanel onClose={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>
      <DiscordButton />
    </div>
  );
}