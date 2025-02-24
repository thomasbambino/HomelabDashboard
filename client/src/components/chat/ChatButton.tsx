import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ChatPanel } from "./ChatPanel";
import { useState } from "react";

export function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
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
  );
}
