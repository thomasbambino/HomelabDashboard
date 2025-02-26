import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { ChatPanel } from "./ChatPanel";
import { useState } from "react";
import { useLocation } from "wouter";
import { ChatProvider } from "./ChatProvider";

export function ChatButton() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  // Don't render on the auth page
  if (location === "/auth") {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <MessageSquare className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] h-[550px] p-0">
        <DialogHeader className="px-6 py-2">
          <DialogTitle>Chat</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <ChatProvider>
            <ChatPanel onClose={() => setOpen(false)} />
          </ChatProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}