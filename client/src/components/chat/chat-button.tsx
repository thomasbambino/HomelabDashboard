import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { ChatRoom } from "./chat-room";
import { useState } from "react";
import { DiscordButton } from "@/components/discord-button";

export function ChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon">
            <MessageSquare className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[700px] h-[550px]">
          <DialogHeader>
            <DialogTitle>Chat</DialogTitle>
          </DialogHeader>
          <ChatRoom />
        </DialogContent>
      </Dialog>
      <DiscordButton />
    </div>
  );
}