import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { ChatPanel } from "./ChatPanel";
import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ChatProvider } from "./ChatProvider";

export function ChatButton() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();

  // Don't render on the auth page or if user is not authenticated
  if (location === "/auth" || !user) {
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
        <ChatProvider>
          <div className="flex-1 overflow-hidden">
            <ChatPanel onClose={() => setOpen(false)} />
          </div>
        </ChatProvider>
      </DialogContent>
    </Dialog>
  );
}